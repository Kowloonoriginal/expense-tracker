# Схема бази даних

PostgreSQL, схема описана в
[`apps/backend/prisma/schema.prisma`](../../apps/backend/prisma/schema.prisma).
Моделі — PascalCase у коді, `@@map` мапить їх на snake_case таблиці в
Postgres. **Усі ID — UUID** (`@default(uuid())`), генеруються на боці бази.

Міграції — в `apps/backend/prisma/migrations/`, застосовуються командою
`npm run prisma:migrate --workspace=apps/backend` (дев) або
`prisma migrate deploy` (прод/CI, без запиту підтвердження).

## ER-огляд

```
User (users)
 ├─ 1:N → Category (categories)      [onDelete: Cascade]
 ├─ 1:N → Expense (expenses)          [onDelete: Cascade] — застаріла модель
 └─ 1:N → Transaction (transactions)  [onDelete: Cascade]

Category (categories)
 ├─ 1:N → Expense (expenses)          [onDelete: Cascade]
 └─ 1:N → Transaction (transactions)  [onDelete: Restrict]
```

Видалення `User` каскадно зносить усі його категорії, транзакції й
(застарілі) expense-записи. Видалення `Category` каскадно зносить пов'язані
`Expense`, але **блокується**, якщо на неї посилається хоч одна
`Transaction` — див. пояснення нижче.

---

## `User` → `users`

Обліковий запис.

| Поле           | Тип у Prisma                  | Колонка         | Призначення                                                                                                                              |
| -------------- | ----------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `String @id @default(uuid())` | `id`            | первинний ключ, UUID                                                                                                                     |
| `email`        | `String @unique`              | `email`         | логін; унікальність на рівні БД — `P2002` при дублікаті                                                                                  |
| `name`         | `String`                      | `name`          | відображуване ім'я                                                                                                                       |
| `passwordHash` | `String`                      | `password_hash` | bcrypt-хеш (10 salt rounds); **ніколи** не потрапляє в API-відповідь — `user.mapper.ts` явно виключає поле при мапінгу в `UserReadModel` |
| `avatarUrl`    | `String?`                     | `avatar_url`    | опціональне посилання на аватар; нема завантаження файлів — лише URL                                                                     |
| `currency`     | `String @default("UAH")`      | `currency`      | валюта користувача; наразі не впливає на бізнес-логіку (немає конвертації), лише зберігається                                            |
| `createdAt`    | `DateTime @default(now())`    | `created_at`    | час реєстрації                                                                                                                           |
| `updatedAt`    | `DateTime @updatedAt`         | `updated_at`    | оновлюється Prisma автоматично при будь-якому записі в рядок                                                                             |

**Зв'язки:** `categories[]`, `expenses[]`, `transactions[]` — усі
`onDelete: Cascade`: видалення користувача видаляє всі його дані без
винятків.

---

## `Category` → `categories`

Категорія транзакції (напр. "Продукти", "Транспорт", "Зарплата").

| Поле     | Тип у Prisma                  | Колонка   | Призначення                                                   |
| -------- | ----------------------------- | --------- | ------------------------------------------------------------- |
| `id`     | `String @id @default(uuid())` | `id`      | первинний ключ                                                |
| `name`   | `String`                      | `name`    | назва (1–40 символів, валідується на DTO-рівні)               |
| `color`  | `String`                      | `color`   | hex-колір для UI-бейджа (`#RRGGBB`)                           |
| `icon`   | `String @default("tag")`      | `icon`    | ім'я іконки `lucide-react`; `"tag"` — фолбек за замовчуванням |
| `userId` | `String`                      | `user_id` | власник — FK на `User.id`                                     |

**Зв'язки:**

- `user` — `onDelete: Cascade` (видалення користувача видаляє категорію)
- `expenses[]` — `onDelete: Cascade` (застаріла модель)
- `transactions[]` — **`onDelete: Restrict`** ⚠️

### Чому `Restrict`, а не `Cascade`, для транзакцій

Це найважливіше архітектурне рішення схеми. Якби видалення категорії
каскадно видаляло пов'язані транзакції, `DELETE /categories/:id` міг би
випадково знищити фінансову історію користувача одним кліком, повернувши
звичайний `204 No Content` — без жодного попередження. `Restrict` натомість
змушує базу даних **відмовити** у видаленні категорії, поки на неї
посилається хоч одна транзакція: операція падає на рівні БД з кодом
`P2003`, який `PrismaClientExceptionFilter` перетворює на `409 Conflict` із
повідомленням, що інші записи все ще залежать від цього ресурсу.

Практичний наслідок: щоб видалити категорію, спершу потрібно перепризначити
або видалити всі транзакції, що на неї посилаються.

---

## `Transaction` → `transactions`

Основна модель обліку — дохід чи витрата.

| Поле          | Тип у Prisma                  | Колонка       | Призначення                                                                                                                                  |
| ------------- | ----------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `String @id @default(uuid())` | `id`          | первинний ключ                                                                                                                               |
| `amount`      | `Decimal @db.Decimal(12, 2)`  | `amount`      | сума; **`Decimal`, не `Float`** — гроші ніколи не рахуються в IEEE-754, щоб уникнути похибок на кшталт `1000.10 - 999.99 = 0.10999999999994` |
| `type`        | `TransactionType` (enum)      | `type`        | `INCOME` \| `EXPENSE`                                                                                                                        |
| `description` | `String?`                     | `description` | опціональний вільний текст, ≤255 символів на DTO-рівні                                                                                       |
| `date`        | `DateTime`                    | `date`        | дата операції; дата-без-часу з клієнта зберігається як опівніч UTC                                                                           |
| `categoryId`  | `String`                      | `category_id` | FK на `Category.id`, `onDelete: Restrict`                                                                                                    |
| `userId`      | `String`                      | `user_id`     | FK на `User.id`, `onDelete: Cascade`                                                                                                         |
| `createdAt`   | `DateTime @default(now())`    | `created_at`  | час створення запису (може відрізнятись від `date`)                                                                                          |

**Індекс:** `@@index([userId, date])` — складений індекс під найчастіший
запит: "усі транзакції користувача за період", посортовані/відфільтровані
за датою (`GET /transactions`, `GET /transactions/summary`).

**Чому `amount` — `Decimal`, а не `Float` чи `Int` (центи):** `Decimal(12,2)`
дає до 10 цифр цілої частини й точно 2 знаки після коми без похибки
округлення — саме те, що потрібно для грошей, без ручного множення/ділення
на 100, яке довелося б робити з `Int`-центами. `TransactionsRepository`
і `transaction.mapper.ts` явно конвертують `Prisma.Decimal` у `number` лише
на виході з модуля (`toAmount()`), а всередині суми (агрегації `groupBy`,
`toBalance()`) завжди рахуються в `Decimal`, щоб похибка не накопичувалась.

**Чому `date`, а не тільки `createdAt`:** `date` — це дата _операції_ (коли
відбулась купівля), яку користувач вводить сам і може редагувати заднім
числом; `createdAt` — коли рядок фізично з'явився в БД. Пагінація сортує за
`[date DESC, createdAt DESC]` — другий ключ потрібен, бо багато транзакцій
одного дня матимуть однакове `date` (опівніч), і без стабільного tie-break
`skip`/`take` пагінація була б недетермінованою.

---

## `Expense` → `expenses` (застаріла модель)

> **Не використовується жодним кодом застосунку.** Замінена моделлю
> `Transaction`, яка додає `type` (дохід/витрата) і опціональний `description`.
> Модель і таблиця лишені в схемі задля сумісності (можливо, старі дані чи
> зовнішні інтеграції), але жоден хендлер, репозиторій чи контролер її не
> читає й не пише.

| Поле          | Тип у Prisma                  | Колонка                                                                                                                          |
| ------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `String @id @default(uuid())` | `id`                                                                                                                             |
| `amount`      | `Float`                       | `amount` — **на відміну від `Transaction.amount`, тут звичайний `Float`, не `Decimal`** — ще одна причина, чому модель застаріла |
| `description` | `String`                      | `description` — обов'язкове, на відміну від `Transaction.description`                                                            |
| `date`        | `DateTime`                    | `date`                                                                                                                           |
| `createdAt`   | `DateTime @default(now())`    | `created_at`                                                                                                                     |
| `categoryId`  | `String`                      | `category_id`, `onDelete: Cascade`                                                                                               |
| `userId`      | `String`                      | `user_id`, `onDelete: Cascade`                                                                                                   |

Якщо плануєте писати новий функціонал — використовуйте `Transaction`, не
`Expense`.

---

## `TransactionType` (enum → `transaction_type`)

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}
```

Дзеркалиться на фронтенді/бекенді як union-тип
`'INCOME' | 'EXPENSE'` у `packages/shared/src/index.ts` — навмисно не
TS `enum`, бо `@repo/shared` імпортується лише через `import type` і не
повинен існувати в рантаймі.

---

## Журнал міграцій

| Міграція                                              | Що змінила                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `20260902092255_init`                                 | початкова схема: `User`, `Category`, `Expense`                          |
| `20260902100000_user_auth_fields`                     | додано `passwordHash`, поля автентифікації до `User`                    |
| `20260902141726_add_category_icon`                    | додано `icon` до `Category`                                             |
| `20260906104717_add_transactions`                     | нова модель `Transaction` + enum `TransactionType`                      |
| `20260915171736_restrict_transaction_category_delete` | змінено `onDelete` для `Transaction.category` з `Cascade` на `Restrict` |

Остання міграція — приклад **не-деструктивної** зміни обмеження: вона не
видаляє й не звужує жодну колонку, лише посилює правило видалення
(раніше видалення категорії тихо стирало пов'язані транзакції — тепер це
явно заборонено). Якщо додаєте нову міграцію, що видаляє чи звужує колонку
з існуючими даними — обов'язково зазначте це як **деструктивну** в описі PR
(див. [`docs/GIT_WORKFLOW.md`](../../docs/GIT_WORKFLOW.md)).

## Робота зі схемою

```bash
# після зміни schema.prisma — створити нову міграцію й застосувати локально
npm run prisma:migrate --workspace=apps/backend

# перегенерувати Prisma Client (типи для TS) без нової міграції
npm run prisma:generate --workspace=apps/backend

# GUI для перегляду/редагування даних
npm run prisma:studio --workspace=apps/backend
```

Е2е-тести працюють на окремій БД `expense_tracker_test`
(`apps/backend/test/.env.test`), яку `apps/backend/test/global-setup.ts`
створює й накатує міграціями (`prisma migrate deploy`) автоматично при
першому запуску — вручну нічого готувати не потрібно.
