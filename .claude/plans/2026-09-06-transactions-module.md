# План: модуль транзакцій (CQRS)

Створено: 2026-09-06
Статус: виконано 2026-09-06

---

## Контекст

`TransactionsModule` — центральний модуль додатку для обліку доходів і витрат.
Структурний взірець — `apps/backend/src/categories`; DTO на class-validator;
нових залежностей не додаємо.

Ухвалено з користувачем до планування:

- **`GET /transactions/summary` віддає підсумки _і_ розбивку по категоріях**
  (income, expense, balance + рядок на кожну пару категорія×тип).
- **Модель `Expense` лишається недоторканою.** `Transaction` додається поруч;
  вони тепер концептуально перетинаються (варта `///`-нотатки на `Expense`, без
  зміни коду).

Перевірено в кодовій базі:

- `class-transformer@0.5.1` уже пряма залежність — `@Type()` доступний без
  установки (жоден файл його ще не імпортує).
- `main.ts`: `ValidationPipe({ whitelist: true, transform: true })` **без**
  `enableImplicitConversion` → query-параметри приходять рядками й потребують
  явного `@Type`.
- **Усі 11 імпортів бекенду з `@repo/shared` — `import type`**, `tsconfig` має
  `include: ["src"]` без `rootDir`, а `dist/` плаский (`dist/main.js`).
  Value-імпорт із shared затягнув би файл поза `apps/backend` у програму, зсунув
  корінь і згенерував `dist/apps/backend/src/main.js` — зламавши `start:prod`.
  Тому `TransactionType` у shared має бути **type-only юніоном**, а `@IsEnum`
  приймати згенерований Prisma enum-об'єкт.
- **`GetCategoryByIdQuery` не існує**, а `CategoriesModule` нічого не експортує —
  зараз немає способу через шину спитати «чи належить категорія X юзеру Y?».
  Див. Етап 7: цю дірку в безпеці задача має закрити.

---

## Етап 1. Схема Prisma + міграція

```prisma
enum TransactionType {
  INCOME
  EXPENSE

  @@map("transaction_type")
}

model Transaction {
  id          String          @id @default(uuid())
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  description String?
  date        DateTime
  categoryId  String          @map("category_id")
  userId      String          @map("user_id")
  createdAt   DateTime        @default(now()) @map("created_at")

  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@map("transactions")
}
```

Плюс `transactions Transaction[]` у `User` і `Category`.

`@db.Decimal(12, 2)` — не опція: голий `Decimal` мапиться в `DECIMAL(65,30)`,
тобто 30 дробових знаків грошової суми. `(12,2)` дає стелю 9 999 999 999.99 і
саме це робить `.toNumber()` беззбитковим (Етап 2).

```bash
npm run prisma:migrate --workspace=apps/backend -- --name add-transactions
```

Суто адитивна міграція; `expenses` не чіпається.

## Етап 2. Межа Decimal — головне рішення

Prisma віддає `amount` як decimal.js `Decimal`, чий `toJSON()` — це
`toString()`. Тобто «нічого не робити» дає `"amount": "1000.50"` (рядок), коли
решта полів зберігає природний JSON-тип. Варіанта «лишити як є» не існує —
маппер мусить обрати.

**Рішення: read-model і JSON-API віддають `number`.** У `@repo/shared` уже є
`Expense.amount: number`; сусідній `Transaction.amount: string` був би
непоясненою розбіжністю в єдиному файлі, який читають обидва застосунки.
Беззбитковість тримається на обмеженні `(12,2)` — до 15 значущих цифр
round-trip через IEEE-754 точний. Уся арифметика (суми, `income - expense`)
рахується в `Decimal` **на сервері** до конвертації, тож класична біда
float-грошей не виникає; клієнт лише форматує.

| Шар               | `amount`         |                                          |
| ----------------- | ---------------- | ---------------------------------------- |
| DTO (тіло запиту) | `number`         | `@IsNumber({maxDecimalPlaces: 2})`       |
| Команда           | `number`         | контракти лишаються примітивними         |
| Вхід репозиторію  | `Prisma.Decimal` | `new Prisma.Decimal(...)` **у хендлері** |
| Read-model / JSON | `number`         | `.toNumber()` у маппері                  |

## Етап 3. `packages/shared/src/index.ts`

`TransactionType` (**юніон, не enum**), `Transaction`, `CreateTransactionDto`,
`UpdateTransactionDto`, `TransactionFiltersDto`, `TransactionSummaryQueryDto`,
`CategorySummary`, `TransactionSummary`. За прецедентом `Expense`: `date: Date`
у сутності, `date: string` у DTO.

`description?: string | null` у DTO — `?` означає «не передавати при створенні»,
явний `null` — «очистити» при PATCH.

Юніон у shared і Prisma-enum — дві декларації, що мусять збігатись; це
забезпечує рядок `type:` у маппері: він перестає компілюватись, щойно вони
розійдуться.

## Етап 4. `apps/backend/src/transactions/`

```
transactions.controller.ts   Етап 6
transactions.module.ts       дзеркалить categories.module.ts
transactions.repository.ts   єдина точка Prisma: create, findAllForUser(userId, filters),
                             findByIdForUser, update, delete, sumByTypeForUser, sumByCategoryForUser
transaction.mapper.ts        toTransactionReadModel + toAmount/toBalance
contracts/                   3 команди, 3 запити, read-models, barrel
handlers/                    create, get-list, get-by-id, get-summary, update, remove
dto/                         create, update, get-transactions.query, transaction-summary.query
```

Свідоме відхилення від взірця: `GetTransactionByIdHandler` **кидає**
`NotFoundException` (запит _і є_ самим реквестом), тоді як `GetCategoryByIdQuery`
(Етап 7) **повертає null** (це проба для рішення іншого модуля) — за формою
`GetUserByIdHandler`.

## Етап 5. Фільтри, сортування, агрегація

**Фільтри** компонуються через `undefined` — Prisma ігнорує будь-яке поле
`where` зі значенням `undefined`, тож умовні спреди не потрібні.

**Сортування:** `date: 'desc'`, потім `createdAt: 'desc'`. Багато записів
ділять один день; без тайбрейкера порядок усередині дня нестабільний і список
у UI «стрибає».

**`dateTo` як кінець дня:** `?dateTo=2025-03-31` парситься в `00:00:00Z`, і
`lte` мовчки відкидає все, що датоване пізніше того ж дня. Контракт запиту несе
ISO-рядки як прийшли (виправлення залежить від _форми_ рядка), а хендлер
перетворює date-only `dateTo` на ексклюзивну межу наступного дня; репозиторій
скрізь використовує `lt`.

**Вікно місяця:**

```ts
const start = new Date(Date.UTC(year, month - 1, 1));
const end = new Date(Date.UTC(year, month, 1)); // [start, end)
```

`Date.UTC`, а не `new Date(y, m, d)` — локальний конструктор зсуває межу на
таймзону сервера. Грудень **не** потребує окремої гілки: `Date.UTC(2025, 12, 1)`
за правилами переповнення JS дає 2026-01-01 (закріплюємо тестом, а не `if`-ом).
Напіввідкритий інтервал знімає питання округлення `timestamp(3)` на
`23:59:59.999`. Відоме обмеження до документування: місяць рахується в UTC, а не
в таймзоні користувача (у `User` є `currency`, немає `tz`) — поза обсягом.

**Агрегація: два `prisma.transaction.groupBy`** — `by: ['type']` для підсумків і
`by: ['categoryId', 'type']` для розбивки (категорія, використана і для доходу, і
для витрати, коректно дає два рядки). Не `aggregate` (немає групування) і не
raw SQL (обходить типізацію, хардкодить `@map`-нуті імена колонок, і сирого SQL
у `src/` немає взагалі).

**Назва/колір/іконка категорії приходять через QueryBus наявним
`GetCategoriesQuery` і склеюються в пам'яті через `Map`.** Репозиторій
транзакцій не торкається `prisma.category` і не використовує
`include: { category }`. Межа така: транзакції володіють власною колонкою
`category_id`, але `name`/`color`/`icon` — колонки CategoriesModule, а правило
`CLAUDE.md` каже, що чужі дані дістаються через контракти. `include` вбудував би
колонки Category у read-path транзакцій, і ніщо типізоване цього б не тримало.
Прийнята ціна: один зайвий запит (десятки рядків, паралельно через
`Promise.all`) і склейка в пам'яті.

Підсумки беруться з власного `groupBy`, а не сумуванням розбивки — щоб лишались
авторитетними. `_sum.amount` — це `Decimal | null`, тож порожній місяць дає
`{income: 0, expense: 0, balance: 0, byCategory: []}`.

## Етап 6. DTO і контролер

Create DTO: `@IsNumber({maxDecimalPlaces: 2})` + `@IsPositive` +
`@Max(9_999_999_999.99)` (збігається з колонкою, тож переповнення — це 400, а не
500); `@IsEnum(PrismaTransactionType)` на полі, _типізованому_ shared-юніоном;
`@IsOptional() @IsString() @MaxLength(255)` для description; `@IsDateString()`;
`@IsUUID('4')` для categoryId (поле тіла, що стає FK — `@Param('id')` лишається
без пайпа, як у categories). Update DTO — те саме під `@IsOptional()`.

Summary query DTO — обидва параметри **обов'язкові**, приходять рядками:

```ts
@Type(() => Number)
@IsInt() @Min(1) @Max(12)
month!: number;   // ?month=abc → NaN → 400; ?month= → 0 → 400; відсутній → 400
```

У хендлерах ніколи не писати `command.description?.trim()` — опційний ланцюжок
короткозамикається і на `null`, мовчки перетворюючи «очистити» на «не чіпати».
Потрібен явний трибічний хелпер.

**Порядок роутів:** `@Get('summary')` **мусить** бути оголошений до
`@Get(':id')`. Nest реєструє роути в порядку оголошення методів, Express матчить
перший зареєстрований, тож `:id` інакше проковтне літерал `summary` і поверне
404 `Transaction not found`. Закріплюємо e2e-тестом.

```
POST   /transactions          201
GET    /transactions          200   @Query() фільтри
GET    /transactions/summary  200   ← оголошений до :id
GET    /transactions/:id      200 / 404
PATCH  /transactions/:id      200 / 404
DELETE /transactions/:id      204
```

## Етап 7. Перевірка власності категорії (дірка в безпеці)

FK доводить, що категорія _існує_, а не хто нею володіє. Без перевірки
користувач може підчепити чужий `categoryId`, і тоді summary поверне йому
назву/колір/іконку чужої категорії — витік між тенантами.

Додається в `apps/backend/src/categories/`:

- `contracts/queries/get-category-by-id.query.ts` — `(id, userId)`
- `handlers/get-category-by-id.handler.ts` — обгортає наявний `findByIdForUser`,
  повертає `CategoryReadModel | null`, **не кидає** (за формою
  `GetUserByIdHandler`: запит не має хардкодити HTTP-статус для реквесту, який
  обслуговує інший модуль)
- реєстрація в `contracts/index.ts` і в масиві `handlers` модуля

`CreateTransactionHandler` і `UpdateTransactionHandler` (останній — лише коли
`categoryId !== undefined`, і після власної 404-перевірки транзакції)
диспатчать його і кидають `NotFoundException('Category not found')` на `null` —
байт-у-байт те, що вже повертає `PATCH /categories/:id` для чужого id, тож
нового оракула не з'являється.

## Етап 8. Реєстрація

`app.module.ts` — `TransactionsModule` в `imports` після `CategoriesModule`.
Більше нічого: шини, `PrismaModule` (`@Global`) і обидва `APP_GUARD` уже діють.

---

## Порядок робіт

| Стан | #   | Крок                                                                      |
| ---- | --- | ------------------------------------------------------------------------- |
| ✅   | 1   | Схема Prisma (`Transaction` + enum + зворотні зв'язки) + міграція         |
| ✅   | 2   | Типи в `@repo/shared`                                                     |
| ✅   | 3   | `GetCategoryByIdQuery` + хендлер у `categories`                           |
| ✅   | 4   | `transactions/contracts/` — команди, запити, read-models, barrel          |
| ✅   | 5   | `transactions.repository.ts` + `transaction.mapper.ts`                    |
| ✅   | 6   | `handlers/` — create, list, by-id, summary, update, remove                |
| ✅   | 7   | `dto/` — create, update, filters, summary-query                           |
| ✅   | 8   | `transactions.controller.ts` + `transactions.module.ts` + `app.module.ts` |
| ✅   | 9   | `npm run build:backend` + перевірка плаского `dist/`                      |
| ✅   | 10  | e2e `transactions.e2e-spec.ts` + lint/format                              |

### Що показала перевірка

Міграція `20260906104717_add_transactions` містить рівно те, що планувалось:
`CREATE TYPE "transaction_type"`, `CREATE TABLE "transactions"` з
`DECIMAL(12,2)`, індекс `(user_id, date)`, обидва каскадні FK і **жодного
`DROP`** — `expenses` не зачеплено.

`npm run build:backend` пройшов, `dist/` лишився пласким (`dist/main.js`, без
`dist/apps/`) — випадкового value-імпорту з `@repo/shared` не з'явилось.

e2e: **36/36** (11 нових на транзакції, разом із наявними auth і categories).
Покрито: CRUD; `typeof amount === 'number'` (страхує рішення Етапу 2);
очищення description через явний `null`; 400 на негативну суму, 3 знаки після
коми, `type: 'TRANSFER'`, кривий date, не-UUID categoryId; зрізання зайвого
`userId` з тіла; ізоляція між користувачами на кожному роуті з ідентичним 404;
чужий `categoryId` → 404 з тим самим текстом, що й `PATCH /categories/:id`;
усі фільтри включно з date-only `dateTo`, який захоплює 18:00 того ж дня;
summary — точний `balance` на 1000.10 − 999.99 = 0.11, межі вікна, грудневий
перехід у наступний рік, розбивка категорія×тип, порожній місяць, 400 на
неповні параметри, і що `/summary` не проковтнув `:id`; 401 на всіх шести
роутах без токена.

`npm run lint` і `npm run format:check` — чисто.

---

## Не входить у цей раунд

- Фронтенд для транзакцій (задача суто бекендова).
- Пагінація списку `GET /transactions`.
- Таймзона користувача для меж місяця (у `User` немає `tz`).
- Видалення застарілої моделі `Expense` (свідомо лишена).
