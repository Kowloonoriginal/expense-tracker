import { Global, Module } from '@nestjs/common';
import { PASSWORD_HASHER } from './password-hasher';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';

@Global()
@Module({
  providers: [{ provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher }],
  exports: [PASSWORD_HASHER],
})
export class SecurityModule {}
