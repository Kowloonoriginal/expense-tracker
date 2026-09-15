import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  CategoryReadModel,
  CreateCategoryCommand,
  GetCategoriesQuery,
  RemoveCategoryCommand,
  UpdateCategoryCommand,
} from './contracts';

/**
 * Every route here is protected by the global JwtAuthGuard — none is `@Public()`
 * — and every one is scoped to `@CurrentUser('id')`, so a user can only ever
 * read or write their own categories.
 *
 * The `auth-ip` throttler (app.module.ts) is scoped to /auth/register and
 * /auth/login only — an authenticated user paging through their own data is
 * not the password-spraying scenario it exists for, so this controller opts
 * out rather than sharing that budget.
 */
@SkipThrottle({ 'auth-ip': true })
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryReadModel> {
    return this.commandBus.execute(
      new CreateCategoryCommand(userId, dto.name, dto.color, dto.icon),
    );
  }

  @Get()
  findAll(@CurrentUser('id') userId: string): Promise<CategoryReadModel[]> {
    return this.queryBus.execute(new GetCategoriesQuery(userId));
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryReadModel> {
    return this.commandBus.execute(
      new UpdateCategoryCommand(id, userId, dto.name, dto.color, dto.icon),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commandBus.execute(new RemoveCategoryCommand(id, userId));
  }
}
