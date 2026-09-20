import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger-only shape of Nest's default HTTP exception body (thrown by
 * `NotFoundException`, `BadRequestException`, `UnauthorizedException`, etc.
 * and by the global `ValidationPipe`). Not constructed anywhere at runtime —
 * exists purely so `@ApiResponse({ type: ErrorResponseDto })` can document
 * the error envelope every failed request actually gets.
 *
 * One schema is shared by every status code that uses it (400/401/404/...),
 * so its example is deliberately generic rather than tied to one endpoint —
 * each `@ApiResponse`'s own `description` says what actually triggers it.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({
    description:
      'Human-readable message. A single string for most errors; an array ' +
      "of per-field messages for a DTO that failed class-validator's checks.",
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Descriptive error message',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request', description: 'HTTP status text' })
  error!: string;
}
