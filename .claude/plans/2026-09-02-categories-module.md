# План: модуль категорій (CQRS)

Створено: 2026-09-02
Статус: виконано 2026-09-02

---

## Контекст

`2026-09-02-auth-cqrs.md` (Етап 10) уже резервував категорії й витрати як
наступний раунд одразу на CQRS. Це той раунд — тільки категорії; витрати
свідомо лишаються відкритими (нижче).

Завдання: сутність категорії (id, name, color, icon, userId), CRUD
сервіс+контролер (create / findAll / update / remove), захист роутів і
валідація вхідних даних.

`Category` уже існувала в `schema.prisma` (id/name/color/userId, cascade на
User) — фактично лишень заглушка з попереднього раунду, без `icon` і без
жодного модуля/контролера над нею. `@repo/shared` теж мав `Category` і
`CreateCategoryDto`, теж без `icon`, і без `UpdateCategoryDto`.

---

## Етап 1. Сутність ✅

`Category` доповнена полем `icon`:

```prisma
model Category {
  id     String @id @default(uuid())
  name   String
  color  String
  icon   String @default("tag")
  userId String @map("user_id")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses Expense[]

  @@map("categories")
}
```

**Рішення:** `icon` — обов'язковий рядок з дефолтом, а не `String?`. `name` і
`color` уже обов'язкові; nullable `icon` змусив би обробляти `null` усюди, де
іконка рендериться, заради відсутньої вигоди. Дефолт `"tag"` (як
`User.currency` мав `"UAH"`) не вимагає бекфілу.

Міграція: `prisma/migrations/20260902141726_add_category_icon/`

```sql
ALTER TABLE "categories" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'tag';
```

## Етап 2. Спільні типи (`@repo/shared`) ✅

```ts
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
}

export interface CreateCategoryDto {
  name: string;
  color: string;
  icon: string;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  icon?: string;
}
```

`UpdateCategoryDto` — новий інтерфейс, усі поля опціональні (частковий PATCH).

## Етап 3. Контракти модуля ✅

```
src/categories/
  contracts/
    index.ts                              єдина публічна поверхня модуля
    commands/create-category.command.ts   (userId, name, color, icon)
    commands/update-category.command.ts   (id, userId, name?, color?, icon?)
    commands/remove-category.command.ts   (id, userId)
    queries/get-categories.query.ts       (userId) — тільки скоуп одного юзера
    models/category.read-model.ts         = Category з @repo/shared
```

Свідомо **без** `GetCategoryByIdQuery`: update/remove роблять власний
скоупований пошук напряму через репозиторій усередині хендлера (див. Етап 6).
Окрема шина-запит заради одного рядка репозиторію — зайва індирекція.

## Етап 4. Репозиторій і мапер ✅

```
src/categories/
  categories.repository.ts   єдина точка доступу до Prisma для Category
  category.mapper.ts         toCategoryReadModel()
```

Ключовий метод — `findByIdForUser(id, userId)`: фільтрує одразу по обох
полях, тож чужа категорія повертається як `null` так само, як і неіснуюча.
Це і є весь механізм перевірки власності — жодної окремої `if (owner !==
userId)` гілки, яку можна забути.

```ts
findByIdForUser(id: string, userId: string): Promise<Category | null> {
  return this.prisma.category.findFirst({ where: { id, userId } });
}
```

`create()` приймає `Prisma.CategoryUncheckedCreateInput` (не
`CategoryCreateInput`, на відміну від `UsersRepository.create`) — це дозволяє
передати плаский скаляр `userId` замість вкладеного `connect`.

## Етап 5. DTO з валідацією ✅

```
src/categories/dto/
  create-category.dto.ts   усі поля обов'язкові, implements CreateCategoryDto
  update-category.dto.ts   ті самі поля під @IsOptional(), implements UpdateCategoryDto
```

`color` перевіряється регуляркою на hex (`#A3B1FF`), а не просто `@IsString`.

`@IsOptional()` на update — новий патерн для репозиторію (досі жодного
`PATCH`-DTO не існувало). Комбінація з глобальним `ValidationPipe({
whitelist: true })`: пропущене поле просто не долітає до команди як щось
відмінне від `undefined`, а Prisma ігнорує `undefined` в `data`.

## Етап 6. Хендлери ✅

```
src/categories/handlers/
  create-category.handler.ts
  get-categories.handler.ts
  update-category.handler.ts   ownership-check → NotFoundException
  remove-category.handler.ts   ownership-check → NotFoundException
```

```ts
@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<
  UpdateCategoryCommand,
  CategoryReadModel
> {
  async execute(command: UpdateCategoryCommand): Promise<CategoryReadModel> {
    const existing = await this.categoriesRepository.findByIdForUser(
      command.id,
      command.userId,
    );
    if (!existing) throw new NotFoundException('Category not found');

    const updated = await this.categoriesRepository.update(command.id, {
      name: command.name?.trim(),
      color: command.color,
      icon: command.icon?.trim(),
    });
    return toCategoryReadModel(updated);
  }
}
```

**Рішення:** `NotFoundException`, ніколи `ForbiddenException`. Однакова
відповідь незалежно від того, id невідомий чи належить іншому користувачу —
інакше різниця в статус-коді сама стає оракулом існування чужих даних. У
репозиторії досі не було жодного `NotFoundException`/`ForbiddenException` —
цей модуль перший, хто це вводить, за формою `findByEmail` → гілка → дія з
`CreateUserHandler`.

`remove-category.handler.ts` — дзеркальний, останній крок —
`categoriesRepository.delete(command.id)`, повертає `void`. Пов'язані
`Expense` каскадно видаляються схемою (`onDelete: Cascade`).

## Етап 7. Контролер і модуль ✅

```
src/categories/
  categories.controller.ts
  categories.module.ts
```

| Метод  | Ендпоінт          | Код |
| ------ | ----------------- | --- |
| POST   | `/categories`     | 201 |
| GET    | `/categories`     | 200 |
| PATCH  | `/categories/:id` | 200 |
| DELETE | `/categories/:id` | 204 |

Жодного `@UseGuards()` і жодного `@Public()` — `JwtAuthGuard` уже глобальний
(`APP_GUARD` в `auth.module.ts`), тож роут захищений з моменту створення.
`userId` завжди з токена через `@CurrentUser('id')`, ніколи з тіла запиту —
навіть якщо клієнт підсуне `userId` в body, `whitelist: true` його зріже.

`PATCH`, не `PUT` — оновлення часткове. Без `ParseUUIDPipe` на `:id`: невірний
формат просто не знайдеться в `findByIdForUser` і впаде в той самий 404, що й
чужа категорія — окрема валідація формату нічого не додає до вимоги безпеки.

`CategoriesModule` доданий в `app.module.ts` (`imports`, після
`NotificationsModule`). `CqrsModule` не імпортується локально — вже
глобальний.

## Етап 8. Перевірка ✅

- Міграція `20260902141726_add_category_icon` застосована, Prisma-клієнт
  перегенерований.
- `apps/backend/test/categories.e2e-spec.ts` — реальний `AppModule`, два
  користувачі (два токени): CRUD-щастя з `icon`, ізоляція `GET /categories`
  між користувачами, частковий `PATCH` не чіпає інші поля, `PATCH`/`DELETE`
  на чужу категорію і на неіснуючий id повертають **однаковий** 404, усі
  роути повертають 401 без токена, невалідне тіло — 400, зайві поля
  (`userId` в body) зрізаються.
- `npm run test:e2e --workspace=apps/backend` → 17/17 (разом з `auth`).
- `npm run lint`, `npm run format:check`, `npm run build:backend` — чисто.

Один нюанс під час прогону: перша версія теста "rejects every route without a
token" била 4 supertest-запити паралельно в один сервер і ловила
`ECONNRESET` — це артефакт тесту, не бага модуля; переписано послідовно.

---

## Порядок робіт

| Стан | #   | Крок                                                                               |
| ---- | --- | ---------------------------------------------------------------------------------- |
| ✅   | 1   | Prisma: поле `icon` у `Category` + міграція                                        |
| ✅   | 2   | `@repo/shared`: `Category.icon`, `CreateCategoryDto.icon`, `UpdateCategoryDto`     |
| ✅   | 3   | `contracts/` — команди, запит, read-model, barrel                                  |
| ✅   | 4   | `categories.repository.ts` + `category.mapper.ts`                                  |
| ✅   | 5   | `dto/` create + update з class-validator                                           |
| ✅   | 6   | `handlers/` create/get/update/remove, 404 на чужу категорію                        |
| ✅   | 7   | `categories.controller.ts` + `categories.module.ts` + реєстрація в `app.module.ts` |
| ✅   | 8   | e2e (`categories.e2e-spec.ts`) + lint/format/build                                 |

---

## Ухвалені рішення

**Перевірка власності — через скоуповний запит у репозиторії, не окрема
`Forbidden`-гілка.** `findByIdForUser(id, userId)` фільтрує по обох полях
одразу на рівні SQL: чужа категорія структурно невідрізнима від неіснуючої,
тож немає жодного шляху коду, який міг би випадково повернути чужі дані, і не
треба окремо пам'ятати "перевір власника".

**check-then-act, не атомарний `updateMany`/`deleteMany`.** Останні
повертають лише `count`, а не сам рядок — для відповіді все одно потрібен
попередній `findFirst`, тож "атомарна" версія не економить запит, лише
переносить перевірку. Форма узгоджена з `CreateUserHandler`
(`findByEmail` → гілка → дія).

**`icon` обов'язковий з дефолтом, не nullable.** Узгоджено з `name`/`color`;
дефолт `"tag"` дозволяє уникнути бекфілу і null-перевірок на фронтенді.

---

## Не зроблено (свідомо поза межами задачі)

- **`CreateDefaultCategoriesHandler` на `UserRegisteredEvent`.** Коментар у
  `src/notifications/handlers/log-user-registered.handler.ts` натякає на цей
  підписник (дефолтні категорії при реєстрації) — задача цього раунду просила
  тільки сутність + CRUD + захист, без seed-логіки. Природне продовження,
  коли з'явиться потреба.
- **`expenses`.** Лишається відкритим із Етапу 10 `auth-cqrs.md` — не
  зачіпалось у цьому раунді.
