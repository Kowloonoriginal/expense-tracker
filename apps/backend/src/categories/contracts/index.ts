/**
 * The public surface of CategoriesModule. Other modules import from here and
 * nothing else — the repository and the handlers are internal.
 */
export * from './commands/create-category.command';
export * from './commands/update-category.command';
export * from './commands/remove-category.command';
export * from './queries/get-categories.query';
export * from './queries/get-category-by-id.query';
export * from './models/category.read-model';
