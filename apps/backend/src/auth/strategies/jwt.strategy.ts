import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { QueryBus } from '@nestjs/cqrs';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { GetUserByIdQuery, UserReadModel } from '@/users/contracts';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly queryBus: QueryBus,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Runs after the signature and expiry check. We re-read the user so a deleted
   * or changed account cannot keep using a still-valid token.
   */
  async validate(payload: JwtPayload): Promise<UserReadModel> {
    const user = await this.queryBus.execute<
      GetUserByIdQuery,
      UserReadModel | null
    >(new GetUserByIdQuery(payload.sub));

    if (!user) {
      throw new UnauthorizedException(
        'Token refers to a user that no longer exists',
      );
    }

    return user;
  }
}
