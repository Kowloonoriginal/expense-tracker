# Архітектура

Цей документ описує **як** влаштований код: межі модулів, потік запиту,
причини ключових рішень. Для переліку ендпоінтів — [api.md](api.md), для схеми
БД — [database-schema.md](database-schema.md), для інструкцій із запуску —
[developer-guide.md](developer-guide.md).

## Загальна картина

Monorepo на npm workspaces, три пакети:

```
apps/frontend   Next.js 16 (App Router), Feature-Sliced Design, порт 3000
apps/backend    Nest.js 11, CQRS, Prisma 6, порт 3001
packages/shared @repo/shared — спільні TS-типи й DTO, без збірки
```

**Потік запиту:**

```
Browser
  │  fetch (apps/frontend/src/shared/api/client.ts)
  ▼
Next.js frontend (:3000)
  │  REST, Authorization: Bearer <JWT>
  ▼
Nest.js Controller (:3001)
  │  DTO-валідація (ValidationPipe)
  ▼
CommandBus / QueryBus (@nestjs/cqrs)
  │
  ▼
Handler (одна команда/запит — один клас)
  │
  ▼
Repository (єдине місце, що знає Prisma API для своєї моделі)
  │
  ▼
PrismaService → PostgreSQL
```

Контролер ніколи не містить бізнес-логіки — лише валідація вхідних даних,
диспатч команди/запиту на шину і повернення того, що шина віддала.

## Backend: CQRS між модулями

Кожен Nest-модуль (`auth`, `users`, `categories`, `transactions`,
`notifications`, `security`, `prisma`, `config`, `common`) — ізольована
одиниця. **Модулі не імпортують сервіси, репозиторії чи хендлери одне
одного.** Публічна поверхня модуля — лише його тека `contracts/`: класи
команд, запитів, подій і read-моделі. Усе інше (репозиторії, хендлери,
мапери) — приватне.

Щоб дістатись до чужого модуля, диспатчиться команда або запит на шину:

```ts
// auth реалізує реєстрацію, викликаючи users — лише через контракти,
// ніколи напряму через UsersModule
const user = await this.commandBus.execute<CreateUserCommand, UserReadModel>(
  new CreateUserCommand(email, name, password),
);
```

`CqrsModule.forRoot()` зареєстрований глобально в `AppModule`, тож
`CommandBus`/`QueryBus`/`EventBus` інжектуються будь-де без локального
імпорту.

**Правило поділу:** команди мутують і ніколи не використовуються для читання;
запити читають і ніколи не мутують.

**Крос-модульні реакції** йдуть через `EventBus`, не через прямий виклик.
Приклад: `UsersModule` публікує `UserRegisteredEvent` після створення
користувача; `NotificationsModule` підписаний на нього через
`@EventsHandler(UserRegisteredEvent)` і навіть не знає про існування
`UsersModule` як залежності. Наступні підписники (дефолтні категорії,
привітальний email) додаються поруч, не змінюючи `UsersModule`.

**Команди із секретами** визначають `toJSON()`, що редагує чутливі поля —
CQRS logging interceptor серіалізує весь об'єкт команди в лог, тож пароль
у відкритому вигляді туди потрапити не повинен.

### Приклад модуля: `transactions`

```
transactions/
├── transactions.controller.ts   # HTTP-шар, лише диспатч на шину
├── transactions.repository.ts   # єдине місце з Prisma-запитами до Transaction
├── transaction.mapper.ts        # Prisma-модель → TransactionReadModel
├── transactions.module.ts       # реєстрація провайдерів, нічого не exports
├── dto/                          # class-validator DTO вхідних запитів
├── handlers/                     # по одному класу на команду/запит
└── contracts/                    # ПУБЛІЧНА поверхня модуля
    ├── commands/
    ├── queries/
    └── models/                   # read-моделі, що йдуть на фронтенд
```

`transactions.module.ts` нічого не `exports` — інші модулі не можуть
інжектувати `TransactionsRepository` напряму, лише виконати команду/запит
з `transactions/contracts`.

## Ownership: зовнішній ключ не доводить власність

Найважливіший наскрізний патерн бекенду. Наявність `categoryId` у транзакції
доводить лише те, що категорія _існує_ — не те, що вона належить
користувачеві, який робить запит. Кожен хендлер, що приймає id від клієнта
(транзакції, категорії), спершу перевіряє власність через запит на шину:

```ts
// CreateTransactionHandler, перед створенням запису
const category = await this.queryBus.execute<
  GetCategoryByIdQuery,
  CategoryReadModel | null
>(new GetCategoryByIdQuery(command.categoryId, command.userId));

if (!category) {
  throw new NotFoundException('Category not found');
}
```

`GetCategoryByIdQuery` бере `userId` як частину запиту — категорія іншого
користувача просто не знайдеться, а не поверне помилку доступу. Це навмисно
(див. нижче) — і водночас це `NotFoundException`, а не `ForbiddenException`,
щоб не підтверджувати сам факт існування чужого запису.

Той самий патерн повторюється на рівні репозиторію: `findByIdForUser(id,
userId)` завжди фільтрує обидва поля в одному WHERE, а не спершу шукає за
`id` і потім звіряє `userId` в коді — так неможливо випадково забути
перевірку.

## Відсутність оракулів (no new oracles)

Відповідь сервера ніколи не повинна дозволяти відрізнити «запис не існує»
від «запис існує, але належить іншому користувачеві» чи «пароль невірний»
від «такого email нема»:

- `GET /transactions/:id` для чужої транзакції й для неіснуючого id —
  однаковий `404 Transaction not found`.
- `POST /auth/login` з неправильним паролем і з незареєстрованим email —
  однаковий `401 Invalid email or password`, плюс випадкова затримка
  50–150 мс (`jitter()`), щоб різниця в часі виконання bcrypt-перевірки
  (~80 мс) проти миттєвого "немає такого email" не давала статистичного
  сигналу за багато спроб. Сам jitter не прибирає сигнал повністю —
  його прибирає ліміт 5 спроб/хв, який не дає зібрати достатньо семплів
  для усереднення.

## Автентифікація і авторизація

**JWT через Passport.js.** `JwtAuthGuard` зареєстрований як глобальний
`APP_GUARD` в `AuthModule` — **кожен** маршрут вимагає валідний токен, якщо
явно не позначений `@Public()`. Це "secure by default": новий контролер
захищений в момент додавання, а не в момент, коли хтось згадає додати guard.

```
Authorization: Bearer <access-token>
```

`JwtStrategy.validate()` виконується після перевірки підпису й терміну дії
токена і **перечитує користувача з БД** через `GetUserByIdQuery` на кожен
запит — токен видаленого чи зміненого акаунта миттєво втрачає доступ, без
чекання на його природний exp.

`@CurrentUser()` — параметр-декоратор, що дістає користувача, якого
`JwtStrategy` поклав у `request.user`:

```ts
create(@CurrentUser('id') userId: string, @Body() dto: CreateTransactionDto)
```

**Хешування паролів** заховане за DI-токеном `PASSWORD_HASHER`
(`security/password-hasher.ts`) — жоден інший модуль не імпортує `bcrypt`
напряму. `BcryptPasswordHasher` — єдина реалізація в проді (10 salt rounds);
e2e-тести підміняють токен швидким фейком, щоб не платити ціну bcrypt на
кожен тестовий прогін.

## Rate limiting

Два іменовані throttler'и в `ThrottlerModule.forRoot()`:

| Ім'я      | Ліміт                       | Застосування                             |
| --------- | --------------------------- | ---------------------------------------- |
| `default` | 100 запитів/хв              | базовий, на кожен маршрут                |
| `auth-ip` | 20 запитів/хв, блок на 5 хв | лише на `/auth/register` і `/auth/login` |

Важлива деталь Nest.js: **`@Throttle()` на маршруті ЗАМІНЮЄ названий
throttler, а не додає до нього.** `/auth/login` додатково декорований
`@Throttle({ default: { ttl: 60_000, limit: 5, getTracker: loginTracker } })`
— цей `getTracker` рахує спроби за ключем `IP:email`, а не лише за IP.
Якщо покластись тільки на цей лімітер, один IP, що перебирає паролі для
багатьох email, ніколи не впреться в жодну стелю — кожна спроба потрапляє
у свій власний (IP, email)-кошик. Тому `auth-ip` існує окремо — це резервна
стеля лише за IP, яку route-рівневий `@Throttle` не може випадково
скасувати, бо декоратор перекриває лише throttler'и, які сам називає.

`auth-ip` застосовується до **кожного** маршруту за замовчуванням
(зареєстрований на рівні `AppModule`, не по контролеру), тож усі інші
контролери (`TransactionsController`, `CategoriesController`,
`AppController`) явно виходять з нього декоратором
`@SkipThrottle({ 'auth-ip': true })` — інакше звичайна авторизована робота
(пагінація, `/auth/me` при кожному відкритті сторінки) ділила б той самий
бюджет, призначений для password spraying, і впиралась би в ліміт під час
нормального використання.

## Обробка помилок Prisma

`PrismaClientExceptionFilter` (`APP_FILTER`) — мережа безпеки для помилок
Prisma, що вирвались з хендлера необробленими:

| Код Prisma | HTTP          | Коли                                                                                   |
| ---------- | ------------- | -------------------------------------------------------------------------------------- |
| `P2002`    | 409 Conflict  | унікальне обмеження (напр. дублікат email при гонці двох одночасних реєстрацій)        |
| `P2025`    | 404 Not Found | запис зник між перевіркою власності й дією (TOCTOU)                                    |
| `P2003`    | 409 Conflict  | foreign-key порушення — категорія з транзакціями не видаляється (`onDelete: Restrict`) |
| інше       | 500           | логується, деталі Prisma в тіло відповіді не потрапляють                               |

Це не основний спосіб обробки помилок для жодного модуля — `CreateUserHandler`,
наприклад, ловить `P2002` сам, щоб дати повідомлення, узгоджене з
некритичним шляхом (коли `findByEmail` вже знайшов дублікат до створення).
Фільтр — резервний варіант для рідших/непередбачених випадків.

## Frontend: Feature-Sliced Design

`apps/frontend/src` організовано шарами. Шар може імпортувати із себе чи
будь-якого шару строго нижче — ніколи вбік чи вгору:

```
app        Next.js App Router — роутинг, layout, провайдери.
             ↓
widgets    Самодостатній блок сторінки, що компонує entities й features:
           widgets/header, widgets/transactions-panel.
             ↓
features   Користувацька дія: features/login, features/create-transaction.
           UI + локальна логіка форми (react-hook-form + zod).
             ↓
entities   Бізнес-сутність: її дані, стан, API-запити.
           entities/session, entities/transaction, entities/category.
             ↓
shared     Generic, business-agnostic: shared/api (fetch-клієнт),
           shared/ui (shadcn/ui кіт), shared/lib.
```

Кожен слайс віддає лише `index.ts`-барель — інші шари імпортують з нього,
ніколи не заходячи напряму у внутрішні `ui/`/`model/`/`api/` файли слайсу
(дзеркалить `contracts/`-правило бекенду). FSD-шар `pages` пропущено — його
роль виконує Next.js `app/`-роутинг.

### API-клієнт і сесія

`shared/api/client.ts` — єдина точка мережевого доступу до бекенду.
Dependency inversion для авторизації: `shared` не може імпортувати
`entities`, тож він оголошує "порт" (`setAuthTokenProvider`,
`setUnauthorizedHandler`), а `entities/session` при монтуванні інжектує
"адаптер" — де саме лежить токен і що робити при 401.

**Правило 401:** 401 з токеном означає, що токен застарів — виконується
sign-out. 401 без токена — це просто невдалий логін, і не повинен нічого
чистити чи редіректити (інакше помилка при вводі пароля відкидала б зі
сторінки логіну саму себе). Присутність токена — єдиний дискримінатор,
без per-path allowlist.

**TanStack Query** — увесь серверний стан читається через `useQuery`/
`useMutation`, ніколи через `useEffect` + `fetch`. Ключ кешу
(`transactionKeys.list(query)`, `transactionKeys.summary(month, year)`)
параметризований фільтрами, тож різні сторінки/фільтри не колізять.
Мутація (`useCreateTransaction`) інвалідує `all`, а не лише `list` — нова
транзакція міняє і список, і місячну статистику.

**Очистка кешу при зміні сесії.** Ключі кешу не містять `userId` — без
явної очистки вихід і вхід іншим користувачем в тій самій вкладці показав
би категорії й транзакції попереднього акаунта прямо з кешу, без жодного
рефетчу, поки записи ще в межах `staleTime`. `SessionProvider` викликає
`queryClient.clear()` на: старті нової сесії (`startSession`), явному
виході (`endSession`) і глобальному 401-обробнику.
