import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  /**
   * Validate JWT payload and return user
   * This method is called automatically by Passport after JWT verification
   */
  async validate(payload: JwtPayload) {
    try {
      // Validate user exists and is active
      const user = await this.authService.validateUser(payload.sub);

      if (!user) {
        this.logger.warn(`JWT validation failed: User not found (${payload.sub})`);
        throw new UnauthorizedException('User not found');
      }

      // Return user object (will be attached to request.user)
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`JWT validation error: ${errorMessage}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
