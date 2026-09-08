# Нова функціональність  - Создай модуль транзакцій 

## Контекст
Проєкт: Nest.js + Next + PostgreSQL + Prisma 
Що вже є: User, авторазація JWT, модуль категорій + Frontend атворизація

## Задача
Создай TransactionsModule - центральний модуль додатку для учьота доходів та розходів

## Модель данних
Додай модель Transaction у schema.prisma:
-id (String, uuid, @default(uuid()))
-amount (Decimal)
-type (Enum: INCOME, EXPENSE)
-description (String, nullable)
-date (DateTime)
-categoryId (String, зв'язок із Category)
-userId (String, зв'язок із User)
-createdAt (DateTime, @default(now()))

Онови моделі User та Category — додай зворотні зв'язки transactions Transaction[]

Після зміни схеми створи та застосуй міграцію npx prisma migrate dev --name add-transactions


## Контроллер
-POST /transactions: створити транзакцію
-GET /transactions: список із query параметрами dateFrom, dateTo, type, categoryId (по користувачу)
-GET /transactions/summary: агрегація,query параметри month та year (обидва обов'язкові)
-GET /transactions/:id: одна транзакція
-PATCH /transactions/:id: оновити
-DELETE /transactions/:id: видалити

## Патерн
Використовуй @backend/src/categories як взірець стурктури backend

## Обмеження
 - Не добавляти залежності якщо не вказано в задачі
 - Використовуй class-validator для DTO 
 - Після реалізації збирай проєкт
