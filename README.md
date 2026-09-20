# Expense Tracker

Застосунок для обліку особистих витрат і доходів: категорії, транзакції,
місячна статистика. Monorepo на npm workspaces: Next.js-фронтенд, Nest.js-бекенд
і спільний пакет TypeScript-типів між ними.

## Стек технологій

**Frontend** (`apps/frontend`, порт 3000)
Next.js 16 (App Router), React 19, TypeScript 5.6, Tailwind CSS 4,
`@base-ui/react` + `shadcn` (UI-кіт), `react-hook-form` + `zod` (форми),
`@tanstack/react-query` (серверний стан), `lucide-react` (іконки).

**Backend** (`apps/backend`, порт 3001)
Nest.js 11, TypeScript 5.6, `@nestjs/cqrs` (CommandBus/QueryBus), Prisma 6
(ORM), JWT-автентифікація через `@nestjs/jwt` + Passport.js (`passport-jwt`),
`bcrypt` (хешування паролів), `@nestjs/throttler` (rate limiting),
`class-validator` + `class-transformer` (валідація DTO), `@nestjs/swagger`
(API-документація), Jest (unit + e2e тести).

**Shared** (`packages/shared`)
Чистий TypeScript без збірки й рантайм-залежностей — споживається обома
застосунками як сирий `.ts` через workspace-пакет `@repo/shared`.

**База даних:** PostgreSQL, локально — через Docker Compose.

**Інструменти:** ESLint + Prettier по всіх воркспейсах, npm workspaces для
monorepo (без Turborepo/Nx).

## Вимоги

- Node.js 20+ (у CI використовується Node 22)
- npm 10+
- Docker + Docker Compose (для локальної PostgreSQL)

## Встановлення і запуск

```bash
# 1. Клонувати репозиторій і встановити залежності для всіх воркспейсів
git clone https://github.com/Kowloonoriginal/expense-tracker.git
cd expense-tracker
npm install

# 2. Створити .env у корені проєкту
cp .env.example .env
# відкрити .env і замінити JWT_SECRET на реальний секрет:
openssl rand -base64 48

# 3. Підняти PostgreSQL
docker compose up -d

# 4. Згенерувати Prisma Client і накатити міграції
npm run prisma:generate --workspace=apps/backend
npm run prisma:migrate --workspace=apps/backend

# 5. Запустити застосунки (у двох терміналах)
npm run dev:backend     # http://localhost:3001
npm run dev:frontend    # http://localhost:3000
```

Після цього фронтенд доступний на `http://localhost:3000`, бекенд — на
`http://localhost:3001`, а інтерактивна Swagger-документація API — на
`http://localhost:3001/api/docs`.

### Інші корисні команди

```bash
# Збірка
npm run build               # обидва застосунки
npm run build:frontend
npm run build:backend

# Лінтинг і форматування
npm run lint                # ESLint по всіх воркспейсах
npm run format               # Prettier — записати виправлення
npm run format:check         # Prettier — тільки перевірка

# Тести (потребують запущеної PostgreSQL)
npm run test:e2e --workspace=apps/backend

# Prisma
npm run prisma:studio --workspace=apps/backend   # GUI для БД
```

## Структура проєкту

```
expense-tracker/
├── apps/
│   ├── frontend/          # Next.js 16 (App Router), Feature-Sliced Design
│   │   └── src/
│   │       ├── app/        # роутинг, layout, глобальні стилі
│   │       ├── widgets/    # композиція фіч на сторінці (header, панелі)
│   │       ├── features/   # користувацькі дії (login, create-transaction…)
│   │       ├── entities/   # бізнес-сутності: дані, стан, API-запити
│   │       └── shared/     # UI-кіт, fetch-клієнт, дрібні хелпери
│   └── backend/            # Nest.js 11, CQRS
│       ├── prisma/         # schema.prisma + міграції
│       └── src/
│           ├── auth/        # реєстрація, логін, JWT
│           ├── users/       # користувачі
│           ├── categories/  # категорії транзакцій
│           ├── transactions/# транзакції, місячна статистика
│           ├── notifications/# реакції на події (EventBus)
│           ├── security/    # хешування паролів (PASSWORD_HASHER)
│           ├── common/      # спільні фільтри, DTO
│           ├── config/      # валідація env-змінних
│           └── prisma/      # PrismaService
├── packages/
│   └── shared/              # @repo/shared — спільні типи й DTO
├── docker-compose.yml        # PostgreSQL для локальної розробки
└── .env.example
```

Кожен застосунок несе власний `CLAUDE.md` з детальнішими правилами:
[`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md) (FSD-шари, конвенції),
[`apps/backend/CLAUDE.md`](apps/backend/CLAUDE.md) (CQRS, ендпоінти, паттерни).

**Потік даних:** Frontend → REST API → Nest.js контролери →
CommandBus/QueryBus → хендлери → репозиторії → Prisma → PostgreSQL.

**Модулі не імпортують сервіси одне одного** — публічна поверхня модуля це
його `contracts/` (команди, запити, read-моделі); взаємодія лише через шину.

## Базові ендпоінти

Повна інтерактивна документація — `http://localhost:3001/api/docs` (Swagger UI).
DTO для запитів/відповідей визначені в `packages/shared/src/index.ts`. Усе
захищено `JwtAuthGuard`, окрім позначеного `@Public()`.

| Метод  | Шлях                    | DTO / відповідь                    | Примітка                                     |
| ------ | ----------------------- | ---------------------------------- | -------------------------------------------- |
| GET    | `/`                     | —                                  | `@Public()`, health check                    |
| POST   | `/auth/register`        | `RegisterDto` → `AuthResponse`     | `@Public()`, ліміт 10/год                    |
| POST   | `/auth/login`           | `LoginDto` → `AuthResponse`        | `@Public()`, ліміт 5/хв на IP+email          |
| GET    | `/auth/me`              | → поточний користувач              |                                              |
| POST   | `/categories`           | `CreateCategoryDto`                |                                              |
| GET    | `/categories`           | → список категорій                 |                                              |
| PATCH  | `/categories/:id`       | `UpdateCategoryDto`                |                                              |
| DELETE | `/categories/:id`       | —                                  | 204 No Content                               |
| POST   | `/transactions`         | `CreateTransactionDto`             |                                              |
| GET    | `/transactions`         | `GetTransactionsQueryDto` → список | фільтри за датою/типом/категорією, пагінація |
| GET    | `/transactions/summary` | `TransactionSummaryQueryDto`       | місячна сума доходів/витрат за категоріями   |
| GET    | `/transactions/:id`     | → одна транзакція                  |                                              |
| PATCH  | `/transactions/:id`     | `UpdateTransactionDto`             |                                              |
| DELETE | `/transactions/:id`     | —                                  | 204 No Content                               |

Автентифікація — через заголовок `Authorization: Bearer <token>`, токен
видається `/auth/register` або `/auth/login`.

## Змінні середовища

Скопіюйте `.env.example` у `.env` в корені проєкту й заповніть:

| Змінна                | Обов'язково | За замовчуванням        | Опис                                                                                                                              |
| --------------------- | :---------: | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        |     так     | —                       | Рядок підключення до PostgreSQL. Значення з `.env.example` відповідає `docker-compose.yml`                                        |
| `JWT_SECRET`          |     так     | —                       | ≥32 символи, без плейсхолдерів. Застосунок відмовляється стартувати з дефолтним значенням. Згенерувати: `openssl rand -base64 48` |
| `JWT_EXPIRES_IN`      |     ні      | `7d`                    | Термін дії JWT-токена                                                                                                             |
| `NEXT_PUBLIC_API_URL` |     ні      | `http://localhost:3001` | URL бекенду для фронтенду                                                                                                         |
| `PORT`                |     ні      | `3001`                  | Порт бекенду                                                                                                                      |
| `CORS_ORIGIN`         |     ні      | `http://localhost:3000` | Дозволений origin для CORS                                                                                                        |
| `TRUST_PROXY`         |     ні      | не встановлено          | `1` — лише за реверс-проксі, що видаляє клієнтський `X-Forwarded-For`. Інакше клієнт може підмінити IP і обійти rate limit        |

Тестова e2e-сюїта бекенду використовує окрему БД — див.
`apps/backend/test/.env.test`.

## База даних

Схема — `apps/backend/prisma/schema.prisma`. Моделі PascalCase у коді,
`@@map` до snake_case таблиць у Postgres; усі ID — UUID.

```
User        — users
Category    — categories
Transaction — transactions
Expense     — expenses (застаріла модель, лишена для сумісності)
```

## Тестування

```bash
docker compose up -d                        # потрібна запущена PostgreSQL
npm run test:e2e --workspace=apps/backend
```

## Робочий процес

Гілки — від `main` за GitHub Flow, PR через `gh`, Conventional Commits.
Детально — [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md).
