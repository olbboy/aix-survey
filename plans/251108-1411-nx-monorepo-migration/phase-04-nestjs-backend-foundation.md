# Phase 04: NestJS Backend Foundation

## Context Links

- **Parent Plan**: [Plan Overview](./plan.md)
- **Previous Phase**: [Phase 03 - Database Migration](./phase-03-database-migration.md)
- **Next Phase**: [Phase 05 - Business Logic Migration](./phase-05-business-logic-migration.md)
- **Migration Analysis**: `/Users/leo/Documents/aix-survey/NX-MONOREPO-MIGRATION-ANALYSIS.md#5-nestjs-backend-migration-strategy`

## Overview

**Phase**: 04 - NestJS Backend Foundation  
**Date**: 2025-11-08  
**Description**: Set up NestJS backend with core modules, authentication, and infrastructure  
**Priority**: HIGH  
**Implementation Status**: ❌ Not Started  
**Review Status**: ❌ Pending  
**Duration**: 1 week  
**Dependencies**: Phase 03 (Database migration completed)

## Key Insights

This phase establishes the NestJS backend foundation that will replace Next.js API routes:

1. **Authentication Migration**: Replace better-auth with Passport.js + JWT strategy
2. **Module Architecture**: Set up scalable NestJS module structure  
3. **Database Integration**: Connect Prisma with NestJS dependency injection
4. **Security Foundation**: Guards, pipes, filters, and interceptors
5. **API Documentation**: Swagger/OpenAPI integration

This foundation must be solid before migrating specific API routes in subsequent phases.

## Requirements

### Functional Requirements

1. **Core NestJS Setup**
   - Application module with proper configuration
   - Environment variable management
   - Database connection via Prisma
   - Logging service integration
   - Health check endpoints

2. **Authentication System**
   - JWT-based authentication with Passport.js
   - User registration and login endpoints
   - Session management and token refresh
   - Password hashing and validation
   - Role-based access control

3. **Security Infrastructure**
   - Guards for route protection
   - Validation pipes for input sanitization
   - Exception filters for error handling
   - Interceptors for request/response transformation
   - Rate limiting middleware

4. **API Documentation**
   - Swagger/OpenAPI integration
   - Auto-generated API docs
   - DTOs with validation decorators
   - Example requests and responses

### Non-Functional Requirements

1. **Performance**: API response times under 200ms
2. **Security**: All authentication flows properly secured
3. **Reliability**: Proper error handling and graceful degradation
4. **Maintainability**: Clean module structure and separation of concerns

## Architecture

### NestJS Application Structure
```
apps/backend/src/
├── main.ts                         # Application entry point
├── app/
│   ├── app.module.ts              # Root application module
│   ├── app.controller.ts          # Health check controller
│   └── app.service.ts             # Application service
├── auth/
│   ├── auth.module.ts             # Authentication module
│   ├── auth.controller.ts         # Auth endpoints
│   ├── auth.service.ts            # Auth business logic
│   ├── strategies/
│   │   ├── jwt.strategy.ts        # JWT validation strategy
│   │   └── local.strategy.ts      # Local login strategy
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      # JWT protection guard
│   │   └── roles.guard.ts         # Role-based access guard
│   └── decorators/
│       ├── current-user.decorator.ts
│       └── roles.decorator.ts
├── common/
│   ├── common.module.ts           # Common utilities module
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── middleware/
│       └── rate-limit.middleware.ts
└── config/
    ├── config.module.ts           # Configuration module
    ├── database.config.ts         # Database configuration
    └── app.config.ts             # Application configuration
```

### Authentication Flow
```
Client Request → JWT Guard → JWT Strategy → User Validation → Route Handler
                     ↓
              Exception Filter (if unauthorized)
```

## Related Code Files

**New Files to Create**:
```
apps/backend/src/main.ts                     # NestJS bootstrap
apps/backend/src/app/app.module.ts          # Root module
apps/backend/src/auth/auth.module.ts        # Auth module
apps/backend/src/auth/auth.controller.ts    # Auth endpoints
apps/backend/src/auth/auth.service.ts       # Auth service
apps/backend/src/auth/strategies/jwt.strategy.ts
apps/backend/src/auth/strategies/local.strategy.ts
apps/backend/src/auth/guards/jwt-auth.guard.ts
apps/backend/src/auth/guards/roles.guard.ts
apps/backend/src/common/filters/http-exception.filter.ts
apps/backend/src/common/interceptors/logging.interceptor.ts
apps/backend/src/config/config.module.ts
```

## Implementation Steps

### Step 1: Core Application Setup (Day 1)

1. **Main Application File**
```typescript
// apps/backend/src/main.ts
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AI Maturity Assessment API')
    .setDescription('API for AI maturity assessment platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  Logger.log(`🚀 Backend is running on: http://localhost:${port}/api`);
  Logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
```

2. **Root Application Module**
```typescript
// apps/backend/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@aix-survey/database';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

3. **Health Check Controller**
```typescript
// apps/backend/src/app/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return this.appService.getHealth();
  }
}
```

### Step 2: Authentication Module (Day 2)

1. **Authentication Service**
```typescript
// apps/backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@aix-survey/database';
import { UserRole } from '@aix-survey/shared/types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(email: string, password: string, name?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: UserRole.RESPONDENT, // Default role
      },
    });

    const { password: _, ...userResult } = user;
    return userResult;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
```

2. **JWT Strategy**
```typescript
// apps/backend/src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '@aix-survey/database';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
```

3. **Authentication Controller**
```typescript
// apps/backend/src/auth/auth.controller.ts
import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto, RegisterDto } from './dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
```

### Step 3: Guards and Security (Day 3)

1. **JWT Auth Guard**
```typescript
// apps/backend/src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }
}
```

2. **Roles Guard**
```typescript
// apps/backend/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@aix-survey/shared/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role);
  }
}
```

3. **Exception Filter**
```typescript
// apps/backend/src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from '@aix-survey/shared/utils';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message,
    };

    logger.error('HTTP Exception', {
      ...errorResponse,
      stack: exception.stack,
    });

    response.status(status).json(errorResponse);
  }
}
```

### Step 4: DTOs and Validation (Day 4)

1. **Authentication DTOs**
```typescript
// apps/backend/src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: false,
  })
  @IsString()
  name?: string;
}
```

2. **Decorators**
```typescript
// apps/backend/src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// apps/backend/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@aix-survey/shared/types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// apps/backend/src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### Step 5: Configuration and Environment (Day 5)

1. **Configuration Module**
```typescript
// apps/backend/src/config/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import databaseConfig from './database.config';
import appConfig from './app.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class ConfigModule {}
```

2. **App Configuration**
```typescript
// apps/backend/src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  environment: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
}));
```

### Step 6: Testing and Documentation (Day 6-7)

1. **Authentication Service Tests**
```typescript
// apps/backend/src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@aix-survey/database';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: '$2a$12$hashedpassword',
    role: 'RESPONDENT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return user and token for valid credentials', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);

      const result = await service.login('test@example.com', 'password');

      expect(result).toEqual({
        access_token: 'jwt-token',
        user: mockUser,
      });
    });
  });
});
```

2. **API Documentation Configuration**
```typescript
// Add to main.ts Swagger configuration
const config = new DocumentBuilder()
  .setTitle('AI Maturity Assessment API')
  .setDescription(`
    ## Overview
    REST API for the AI Maturity Assessment Platform.
    
    ## Authentication
    This API uses JWT Bearer tokens for authentication.
    
    ## Rate Limiting
    API calls are rate limited to prevent abuse.
    
    ## Support
    For API support, contact: support@aix-survey.com
  `)
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Authentication', 'User authentication and authorization')
  .addTag('Health', 'Service health checks')
  .build();
```

## Todo List

### Core Application Setup
- [ ] Set up NestJS main.ts with global configuration
- [ ] Create root AppModule with proper imports
- [ ] Set up health check controller and service
- [ ] Configure CORS for frontend communication
- [ ] Add global validation pipe configuration
- [ ] Set up Swagger/OpenAPI documentation

### Authentication System
- [ ] Install and configure Passport.js with JWT strategy
- [ ] Create AuthService with login/register/profile methods
- [ ] Implement JWT strategy for token validation
- [ ] Create authentication controller with endpoints
- [ ] Set up password hashing with bcrypt
- [ ] Implement user role management

### Security Infrastructure
- [ ] Create JWT authentication guard
- [ ] Create roles-based authorization guard
- [ ] Set up global exception filter
- [ ] Add logging interceptor for request/response
- [ ] Configure validation pipes for DTOs
- [ ] Add rate limiting middleware

### DTOs and Validation
- [ ] Create authentication DTOs with validation
- [ ] Set up class-validator decorators
- [ ] Create custom decorators for common patterns
- [ ] Add Swagger documentation decorators
- [ ] Implement input sanitization
- [ ] Add response transformation

### Configuration Management
- [ ] Set up ConfigModule for environment variables
- [ ] Create app and database configuration files
- [ ] Implement proper environment validation
- [ ] Set up secrets management
- [ ] Configure different environments (dev/staging/prod)
- [ ] Add configuration testing

### Testing and Documentation
- [ ] Write unit tests for AuthService
- [ ] Write unit tests for guards and strategies
- [ ] Write integration tests for auth endpoints
- [ ] Set up E2E tests for authentication flow
- [ ] Complete Swagger API documentation
- [ ] Create authentication flow documentation

## Success Criteria

1. **Authentication Working**
   - User registration creates new users successfully
   - Login returns valid JWT tokens
   - JWT tokens properly authenticate requests
   - Role-based authorization works correctly

2. **Security Implemented**
   - All routes protected by JWT guard (except public ones)
   - Input validation prevents malicious data
   - Exception handling provides clean error responses
   - Rate limiting prevents API abuse

3. **Documentation Complete**
   - Swagger UI accessible and functional
   - All endpoints documented with examples
   - DTOs properly documented
   - Authentication flow clearly explained

4. **Testing Comprehensive**
   - Unit tests cover all services and guards
   - Integration tests verify API endpoints
   - Test coverage above 80%
   - All critical paths tested

## Risk Assessment

**Authentication Risks**:
- **MEDIUM**: Complex migration from better-auth to Passport.js
- **LOW**: JWT token security and expiration handling
- **LOW**: Role-based access control complexity

**Technical Risks**:
- **MEDIUM**: NestJS learning curve for team
- **LOW**: Database connection and Prisma integration
- **LOW**: CORS and frontend integration issues

**Timeline Risks**:
- **MEDIUM**: Authentication system more complex than expected
- **LOW**: Testing taking longer than planned
- **LOW**: Documentation completion delays

**Mitigation**:
- Follow NestJS authentication best practices
- Use established patterns from documentation
- Implement comprehensive testing early
- Regular check-ins with team for questions

## Security Considerations

**Authentication Security**:
- JWT tokens have appropriate expiration times
- Passwords hashed with strong algorithm (bcrypt)
- No sensitive data in JWT payload
- Proper token validation and user verification

**API Security**:
- Input validation prevents injection attacks
- Rate limiting prevents abuse
- CORS properly configured for frontend
- Error messages don't leak sensitive information

**Environment Security**:
- JWT secret properly configured and secured
- Database credentials managed securely
- No secrets in code or logs
- Environment-specific configuration

## Next Steps

1. **Week 5**: Begin Phase 05 (Business Logic Migration)
2. **Ongoing**: Monitor authentication performance
3. **Continuous**: Refine security measures based on testing
4. **Week 6**: Start integrating with migrated business logic

**Critical Path**: Authentication must be fully functional before starting API route migration in Phase 07.