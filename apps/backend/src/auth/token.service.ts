import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse } from '@repo/shared';
import type { SignOptions } from 'jsonwebtoken';
import { UserReadModel } from '@/users/contracts';
import { JwtPayload } from './types/jwt-payload.type';

/** Shared by the register and login handlers so neither duplicates signing. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issue(user: UserReadModel): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_EXPIRES_IN',
        '7d',
      ) as SignOptions['expiresIn'],
    });

    return { accessToken, user };
  }
}
