# План: сторінки логіну та реєстрації (frontend)

Створено: 2026-09-02
Статус: виконано 2026-09-02

---

## Контекст

Backend `/auth/register` і `/auth/login` уже готові й перевірені e2e (див.
`2026-09-02-auth-cqrs.md`) — перевірка дубліката email уже реалізована на
бекенді (`ConflictException('User with this email already exists')` → 409 у
`CreateUserHandler`). Це завдання — **фронтенд**: сторінки логіну й
реєстрації, які викликають цей API і показують користувачу помилку (409,
401, 400). `apps/frontend` — голий Next.js 16 scaffold: жодного API-клієнта,
стану авторизації, форм-бібліотеки, перевикористовуваних компонентів,
`.env.local`.

**Рішення, ухвалені з користувачем перед плануванням:**

- **Зберігання токена: `localStorage` + прямі клієнтські `fetch`-запити до
  Nest-бекенду.** Без httpOnly-cookie/Next.js route handler proxy, без
  `middleware.ts` — узгоджено з задокументованим у `CLAUDE.md` потоком
  `Frontend → REST API → Nest.js`.
- **Клієнтська валідація: `zod` + `react-hook-form`** (обрано користувачем).
- **Свідомо поза межами цього раунду** (користувач відхилив): глобальний
  `AuthContext`, авторизований header з кнопкою Logout, редірект уже
  залогінених з `/login`/`/register`, показ/приховання пароля,
  підтвердження пароля. Помилки — один загальний банер на форму, без
  кастомного тексту під кожен код.

Підтверджено читанням `apps/backend/src/main.ts`: CORS уже дозволяє
`http://localhost:3000`, роути без глобального префіксу, глобальний
`ValidationPipe({ whitelist: true, transform: true })`. Кореневий
`.gitignore` уже містить неприв'язані `.env`/`.env.local` — новий
`apps/frontend/.env.local` не потребує змін у `.gitignore`.

---

## Етап 1. `.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

`next dev` треба перезапустити після створення файлу — `NEXT_PUBLIC_*`
вбудовуються при старті dev-сервера.

## Етап 2–4 (переглянуто): Feature-Sliced Design

Під час реалізації користувач попросив перейти на **Feature-Sliced Design**
для `apps/frontend/src` — зафіксовано в `CLAUDE.md` (розділ "Frontend
architecture"). Замість плаского `src/lib/*`, структура за шарами (кожен
імпортує лише себе й нижчі шари, через `index.ts`-барел слайсу):

```
src/
  app/                        Next.js routing (FSD "app" — без окремої папки)
    login/page.tsx            тонкий, рендерить <LoginForm/>
    register/page.tsx         тонкий, рендерить <RegisterForm/>
  features/
    login/
      ui/LoginForm.tsx
      model/schema.ts         loginSchema, LoginFormValues (zod)
      index.ts
    register/
      ui/RegisterForm.tsx
      model/schema.ts         registerSchema, RegisterFormValues (zod)
      index.ts
  entities/
    session/
      api/auth-api.ts         login()/register() — виклики через shared/api
      model/session-storage.ts  saveSession/getToken/getStoredUser/clearSession
      index.ts
  shared/
    api/client.ts             apiFetch<T>() + ApiError (генерична fetch-обгортка)
    ui/                       shadcn/ui компоненти (button, input, label, card, alert) + form-field.tsx
    lib/utils.ts              cn() (з shadcn init)
```

`entities/session/api/auth-api.ts` — тонкі виклики `apiFetch<AuthResponse>('/auth/login' | '/auth/register', ...)`.
`entities/session/model/session-storage.ts` — те, що раніше планувалось як
`auth-storage.ts`: SSR-guard, неймспейсовані ключі localStorage, без React
Context.
`shared/api/client.ts` — те, що раніше планувалось як `api-client.ts`:
типізований `ApiError` (`status`, `message`), `apiFetch<T>(path, options)` з
префіксом `NEXT_PUBLIC_API_URL`, парсинг Nest-помилки (`message` як
`string[]` при class-validator — склеюється), нормалізація мережевої
помилки в той самий `ApiError`.
Zod-схеми більше не в одному спільному файлі — кожна лежить у
`model/schema.ts` своєї feature-слайси (login/register), бо це логіка,
специфічна для конкретної форми, а не спільна утиліта.

## Етап 5. shadcn/ui (додано за запитом користувача під час реалізації) ✅

[shadcn/ui](https://ui.shadcn.com/) як UI-кит, розміщується в `shared/ui`
(FSD-шар shared, генерично, без бізнес-логіки): `npx shadcn@latest init`
(типово пише в `src/components/ui` + `src/lib/utils.ts` — після init
перенесено в `src/shared/ui`/`src/shared/lib/utils.ts`, і `components.json`
aliases виправлено на `@/shared/ui`, `@/shared/lib/utils`, щоб наступні
`shadcn add` одразу писали в правильне місце), потім `npx shadcn@latest add
button input label form card alert`.

**Відхилення від плану:** інстальована версія shadcn (стиль `base-nova`, на
Base UI замість Radix) має **порожній** registry-item `form` (`--view`
підтверджує: `"No files."`) — класичний `Form`/`FormField`/`FormMessage`
wrapper із документації в цій версії відсутній. Замість нього написано
власний `shared/ui/form-field.tsx` (label + input + текст помилки), що
composить уже встановлені `Input`/`Label`. React 19 передає `ref` як
звичайний проп (без `forwardRef`), тож `{...register('field')}` з
react-hook-form спокійно розкладається на звичайний функціональний
компонент. `Card` — контейнер форми, `Alert` — банер помилки, `Button`/
`Input` — поля, як і планувалось.

## Етап 6. Сторінки та features ✅

`features/login/ui/LoginForm.tsx` і `features/register/ui/RegisterForm.tsx`
— `'use client'`, `useForm` + `zodResolver`, поля через власний
`shared/ui/form-field.tsx` (Label + shadcn `Input`) всередині shadcn `Card`.
Поля: email/пароль (логін), email/ім'я/пароль
(реєстрація). На submit: `entities/session`'s `login()`/`register()`,
`saveSession(auth)` при успіху, редірект через `useRouter().push('/')`.
Один `Alert` з `err.message`, коли `err instanceof ApiError`. `Button`
disabled + перепідписаний під час `isSubmitting`. Лінк між формами.
`src/app/login/page.tsx` / `.../register/page.tsx` — тонкі, лише
`return <LoginForm />` / `return <RegisterForm />`.

**Нюанс 409:** оскільки кастомний текст під код відхилено, повідомлення
бекенду ("User with this email already exists") показується як є —
англійською в україномовному інтерфейсі. Це свідомо прийнятий компроміс
цього раунду, не недогляд.

## Етап 7. Залежності ✅

`zod`, `react-hook-form`, `@hookform/resolvers` в `apps/frontend/package.json`:

```bash
npm install zod react-hook-form @hookform/resolvers --workspace=apps/frontend
```

## Етап 8. Перевірка ✅

Вручну через Browser pane (у репозиторії немає фронтенд-тестового
фреймворку, новий не додається цим раундом). Усі пункти пройдені:

1. `docker compose up -d` (уже був піднятий), `npm run dev:backend`,
   `npm run dev:frontend` (через `.claude/launch.json` + Browser pane).
2. `/register` з `not-an-email`/`A`/`short` → три inline zod-помилки
   українською, **0 запитів** до `localhost:3001` (підтверджено
   `read_network_requests`).
3. Реєстрація `test-user-1@example.com` → `201 Created`, редірект на `/`,
   `localStorage` містить `expense-tracker:accessToken` і
   `expense-tracker:user` з коректними даними.
4. Той самий email ще раз → `409 Conflict`, банер "User with this email
   already exists", без редіректу.
5. `/login` тим самим email + неправильний пароль → `401 Unauthorized`,
   банер "Invalid email or password".
6. `/login` з правильним паролем → `200 OK`, редірект на `/`.
7. Усі запити (`OPTIONS`+`POST` на `/auth/register` і `/auth/login`) пішли
   саме на `localhost:3001` — `NEXT_PUBLIC_API_URL` дійшов до браузера.
8. `npm run build:frontend` ✅, `npm run lint` ✅, `npm run format:check` ✅
   (після `prettier --write` на нові файли).

---

## Порядок робіт

| Стан | #   | Крок                                                                        |
| ---- | --- | --------------------------------------------------------------------------- |
| ✅   | 1   | `apps/frontend/.env.local`                                                  |
| ✅   | 2   | `shared/api/client.ts` (було заплановано як `lib/api-client.ts`)            |
| ✅   | 3   | `entities/session/model/session-storage.ts` (було `lib/auth-storage.ts`)    |
| ✅   | 4   | `features/login\|register/model/schema.ts` (було `lib/validation/auth.ts`)  |
| ✅   | 5   | shadcn/ui init + button/input/label/card/alert + власний `form-field.tsx`   |
| ✅   | 6   | `app/login/page.tsx` + `app/register/page.tsx` + `features/login\|register` |
| ✅   | 7   | Встановлено `zod` / `react-hook-form` / `@hookform/resolvers`               |
| ✅   | 8   | Ручна перевірка (Browser pane) + lint ✅ + format ✅ + build ✅             |

---

## Не зроблено (свідомо поза межами задачі)

- `AuthContext`, header з іменем користувача, кнопка Logout.
- Редірект уже залогінених користувачів з `/login`/`/register`.
- Показ/приховання пароля, поле підтвердження пароля.
- Кастомні (не загальні) тексти помилок під кожен HTTP-код.
- Локалізація повідомлень бекенду (409/401 лишаються англійською).
