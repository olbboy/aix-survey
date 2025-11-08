import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '@aix-survey/database';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { GoalsModule } from '../goals/goals.module';
import { BenchmarksModule } from '../benchmarks/benchmarks.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AdminModule } from '../admin/admin.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Database module with Prisma
    DatabaseModule,

    // Common utilities module
    CommonModule,

    // Authentication module
    AuthModule,

    // Feature modules
    GoalsModule,
    BenchmarksModule,
    OrganizationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT authentication guard
    // All routes require authentication by default unless marked with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles authorization guard
    // Enforces @Roles() decorator requirements
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
