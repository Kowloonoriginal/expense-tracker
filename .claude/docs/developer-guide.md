# Гайд для розробника

Практичні інструкції для щоденної роботи в репозиторії: запуск, тестування,
типові пастки, куди дивитись при налагодженні. Для архітектурних рішень —
[architecture.md](architecture.md), для ендпоінтів — [api.md](api.md), для
схеми БД — [database-schema.md](database-schema.md).

## Перший запуск

```bash
git clone https://github.com/Kowloonoriginal/expense-tracker.git
cd expense-tracker
npm install

cp .env.example .env
# відкрити .env і замінити JWT_SECRET:
openssl rand -base64 48

docker compose up -d
npm run prisma:generate --workspace=apps/backend
npm run prisma:migrate --workspace=apps/backend

npm run dev:backend     # термінал 1 — http://localhost:3001
npm run dev:frontend    # термінал 2 — http://localhost:3000
```

Деталі змінних середовища й вимог — у кореневому
[`README.md`](../../README.md).

**Застосунок відмовиться стартувати**, якщо `JWT_SECRET`:

- відсутній;
- коротший за 32 символи;
- дорівнює одному з відомих плейсхолдерів (`your-secret-key-change-in-production`,
  `change-me`, `secret` тощо) — навмисна перевірка проти буквального
  `cp .env.example .env` без редагування значення, `apps/backend/src/config/validate-env.ts`.

Помилка виведеться одразу при старті, з підказкою `openssl rand -base64 48`.

## Щоденні команди

```bash
# Розробка
npm run dev:frontend                        # Next.js, :3000, hot reload
npm run dev:backend                         # Nest.js --watch, :3001

# Збірка (перевірка, що все компілюється перед PR)
npm run build

# Лінтинг і форматування
npm run lint                                # ESLint по всіх воркспейсах
npm run format                              # Prettier — записати
npm run format:check                        # Prettier — лише перевірити

# Тести
npm run test:e2e --workspace=apps/backend   # 46 e2e-тестів, потребують Docker Postgres

# База даних
npm run prisma:studio --workspace=apps/backend    # GUI на localhost:5555
npm run prisma:migrate --workspace=apps/backend   # нова міграція + застосування

# Перевірка, що таблиця ендпоінтів у apps/backend/CLAUDE.md не застаріла
npm run check:endpoint-docs --workspace=apps/backend
```

## Інтерактивна документація API

`npm run dev:backend`, потім відкрити
**`http://localhost:3001/api/docs`** (Swagger UI). Кнопка **Authorize**
приймає `accessToken` з `POST /auth/login` — після авторизації всі захищені
ендпоінти можна викликати прямо з браузера з прикладами тіла запиту.

## Тестування

E2E-сюїта (`apps/backend/test/*.e2e-spec.ts`) працює на **окремій** БД
`expense_tracker_test`, конфіг — `apps/backend/test/.env.test`
(уже в репозиторії, комітиться навмисно — це тестовий, не прод-секрет).
`global-setup.ts` створює цю БД і накатує міграції автоматично при першому
запуску тестів — жодних ручних кроків не потрібно, окрім `docker compose up
-d`.

```bash
npm run test:e2e --workspace=apps/backend
```

Тести звертаються до застосунку через HTTP (`supertest`), не через
внутрішні виклики хендлерів напряму — це перевіряє реальний контракт,
а не деталі реалізації. Хешування паролів у тестах підмінене швидким фейком
замість bcrypt (через DI-токен `PASSWORD_HASHER`), щоб сюїта не платила
ціну 10 salt rounds на кожен тестовий реєстраційний запит.

**Пишучи новий ендпоінт**, додайте e2e-специфікацію, що покриває:
happy path, `401` без токена, `404` на чужий/неіснуючий ресурс.

## Типові пастки

### Порядок маршрутів у контролері

Nest.js реєструє маршрути в порядку оголошення методів, а Express матчить
перший, що підходить. `GET /transactions/summary` **мусить** бути
оголошений вище `GET /transactions/:id` у
`transactions.controller.ts` — інакше `:id` поглине літерал `summary`
і ендпоінт зверне на `404`. Той самий принцип застосовується до будь-якого
майбутнього маршруту з конкретним сегментом поруч із параметризованим.

### `@Throttle()` замінює, не додає

Декоратор `@Throttle({ default: {...} })` на маршруті **перекриває** названий
throttler `default`, а не додає до нього другий ліміт. Якщо додаєте власний
`@Throttle()` на новий маршрут і хочете зберегти й базовий 100/хв ліміт —
явно вкажіть обидва throttler'и в об'єкті, або переконайтесь, що маршрут не
виключений з `auth-ip`/`default` там, де це небажано. Дивіться коментар у
`apps/backend/src/app.module.ts` для повного пояснення на прикладі
`/auth/login`.

### Ownership — завжди через шину, не через прямий Prisma-запит

Якщо хендлер приймає id ресурсу з чужого модуля (наприклад, транзакція
приймає `categoryId`) — власність перевіряється запитом на шину
(`GetCategoryByIdQuery(id, userId)`), не прямим Prisma-запитом до чужої
таблиці. Порушення цього правила — одночасно і архітектурна помилка (пряме
звернення в обхід `contracts/`), і потенційна діра безпеки. Детальніше —
[architecture.md § Ownership](architecture.md#ownership-зовнішній-ключ-не-доводить-власність).

### `whitelist: true` мовчки відкидає поля

Глобальний `ValidationPipe({ whitelist: true, transform: true })` видаляє
з тіла запиту будь-яке поле, не задекороване в DTO класі — без помилки,
просто мовчки. Додаючи нове поле до ендпоінта: спершу онови DTO
(`class-validator` декоратори), інакше поле ніколи не дійде до хендлера,
і дебажити доведеться довго.

### Гроші — завжди `Prisma.Decimal`/`number` на межі, ніколи `Float` у розрахунках

`Transaction.amount` — `Decimal(12,2)` у БД. Усередині бекенду (сумування,
різниця доходів/витрат) рахунок завжди йде в `Prisma.Decimal`
(`transaction.mapper.ts`: `toAmount()`, `toBalance()`) — конвертація в
`number` відбувається лише на самому виході з модуля, у read-моделі, що йде
клієнту. Якщо пишете нову агрегацію — не діставайте `.toNumber()` раніше,
ніж потрібно.

### Секрети в командах CQRS

Якщо додаєте нову команду, що несе пароль, токен чи інший секрет —
визначте `toJSON()`, що його редагує. Логувальний interceptor CQRS
серіалізує весь об'єкт команди в лог за замовчуванням.

## Структура нового модуля (backend)

Копіюйте форму `transactions/` чи `categories/`:

```
my-module/
├── my-module.controller.ts
├── my-module.repository.ts   # єдине місце з Prisma-запитами
├── my-module.mapper.ts        # Prisma-модель → read-модель
├── my-module.module.ts        # НІЧОГО не exports — доступ лише через contracts/
├── dto/                        # class-validator DTO для запитів
├── handlers/                   # по одному класу на CommandHandler/QueryHandler
└── contracts/                  # публічна поверхня
    ├── commands/
    ├── queries/
    └── models/
```

1. Спершу опишіть DTO в `packages/shared/src/index.ts` — і бекенд, і
   фронтенд імпортують з нього.
2. Локальний backend DTO-клас (`class-validator`) `implements` цей
   спільний інтерфейс — компілятор гарантує, що форми не розійдуться.
3. Хендлер ніколи не імпортує репозиторій чи сервіс іншого модуля напряму —
   лише `queryBus.execute()`/`commandBus.execute()` з класами із
   `contracts/` цільового модуля.

## Структура нового слайсу (frontend, FSD)

```bash
npm run lint --workspace=apps/frontend
```

Слайс живе на одному з шарів `entities`/`features`/`widgets` і віддає
**лише** `index.ts`-барель. Перед створенням нового слайсу для дрібної дії
(напр. "logout") — перевірте, чи справді там є логіка понад один виклик:
`CLAUDE.md` явно проти нового `features/logout` заради одного
`endSession()`, коли це просто метод у `entities/session`.

Серверні дані — завжди через TanStack Query
(`entities/<x>/api/<x>-queries.ts`), ніколи через `useEffect` + `fetch`.
Новий запит отримує стабільний, параметризований ключ кешу
(`shared/api/query-client.ts` документує чому), а мутація явно
інвалідує всі ключі, які могла зробити застарілими — не лише "свій" список.

## Дебаг

| Проблема                                                 | Куди дивитись                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Застосунок не стартує з помилкою про `JWT_SECRET`        | `apps/backend/src/config/validate-env.ts` — повідомлення каже, що саме не так                                                                                                                                                                                                                                                     |
| `401` там, де очікували успіх                            | перевірте заголовок `Authorization: Bearer <token>`; токен протермінований чи посилається на видаленого користувача (`JwtStrategy` перечитує БД щоразу)                                                                                                                                                                           |
| `404` на власний ресурс                                  | перевірте, що `userId` у токені відповідає власнику ресурсу — те саме повідомлення для "не існує" і "чужий" є навмисним, диви `architecture.md`                                                                                                                                                                                   |
| `429` під час локальної розробки                         | ви або близько до ліміту `/auth/login` (5/хв на IP+email), або відкрили багато вкладок, що активно рефетчать `/auth/me` — `auth-ip` не діє на нього завдяки `@SkipThrottle`                                                                                                                                                       |
| Транзакція показує неправильну суму                      | переконайтесь, що розрахунок ідe в `Prisma.Decimal`, а не у `Float`/`number` до самого кінця                                                                                                                                                                                                                                      |
| Категорія не видаляється, `409`                          | на неї досі посилаються транзакції — `onDelete: Restrict`, навмисно; спершу перепризначте/видаліть транзакції                                                                                                                                                                                                                     |
| Новий ендпоінт не з'являється в Swagger                  | DTO-клас потребує `@ApiProperty()`/`@ApiPropertyOptional()` (CLI-плагін `@nestjs/swagger`, увімкнений в `nest-cli.json`, виводить частину автоматично, але enum/format/example варто вказати явно); read-модель — сирий `@repo/shared`-інтерфейс без метаданих, тож для відповіді потрібен клас-двійник у `dto/*-response.dto.ts` |
| CI падає на "API endpoint table matches the controllers" | ви змінили маршрут контролера, але не таблицю в `apps/backend/CLAUDE.md` (або навпаки) — `npm run check:endpoint-docs --workspace=apps/backend` локально покаже точну розбіжність                                                                                                                                                 |

## Перед відкриттям PR

1. `npm run build` — обидва застосунки компілюються
2. `npm run lint` — без помилок
3. `npm run format:check` — форматування узгоджене
4. `npm run test:e2e --workspace=apps/backend` — 46/46 (якщо торкались бекенду)
5. Якщо змінили контролер — `npm run check:endpoint-docs --workspace=apps/backend`
6. Прочитайте `git diff main...HEAD --stat`, напишіть опис PR за структурою
   з [`docs/GIT_WORKFLOW.md`](../../docs/GIT_WORKFLOW.md)

Повні правила гілок/комітів/PR — [`docs/GIT_WORKFLOW.md`](../../docs/GIT_WORKFLOW.md).
Чекліст код-рев'ю — [`REVIEW.md`](../../REVIEW.md) у корені репозиторію.
