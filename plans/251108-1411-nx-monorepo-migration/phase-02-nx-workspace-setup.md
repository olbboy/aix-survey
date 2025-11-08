# Phase 02: NX Workspace Setup

## Context Links

- **Parent Plan**: [Plan Overview](./plan.md)
- **Previous Phase**: [Phase 01 - Infrastructure Preparation](./phase-01-infrastructure-preparation.md)
- **Next Phase**: [Phase 03 - Database Migration](./phase-03-database-migration.md)
- **Migration Analysis**: `/Users/leo/Documents/aix-survey/NX-MONOREPO-MIGRATION-ANALYSIS.md#4-nx-monorepo-structure-proposal`

## Overview

**Phase**: 02 - NX Workspace Setup  
**Date**: 2025-11-08  
**Description**: Create NX monorepo structure with apps and shared libraries  
**Priority**: HIGH  
**Implementation Status**: ❌ Not Started  
**Review Status**: ❌ Pending  
**Duration**: 1 week  
**Dependencies**: Phase 01 (Infrastructure preparation completed)

## Key Insights

This phase establishes the foundational NX monorepo architecture:

1. **Workspace Structure**: Clean separation of apps (frontend, backend) from libraries (shared code)
2. **Build Orchestration**: NX dependency graph enables intelligent builds and testing
3. **Type Safety**: Shared types library ensures consistency between frontend/backend
4. **Reusable Components**: UI components library promotes consistency
5. **Business Logic Separation**: Framework-agnostic business logic in dedicated library

Proper setup of this foundation is critical for all subsequent phases.

## Requirements

### Functional Requirements

1. **NX Workspace**
   - Create new NX workspace with proper configuration
   - Set up build orchestration and caching
   - Configure TypeScript paths and imports
   - Establish linting and formatting rules

2. **Application Structure**
   - Frontend app (Next.js placeholder)
   - Backend app (NestJS placeholder)
   - E2E testing app structure

3. **Shared Libraries**
   - `libs/shared/types` - Common TypeScript types
   - `libs/shared/constants` - Application constants
   - `libs/shared/utils` - Utility functions
   - `libs/ui-components` - Reusable UI components
   - `libs/database` - Database layer with Prisma

4. **Development Experience**
   - Fast builds with NX caching
   - Hot module replacement
   - Efficient testing workflows
   - Proper IDE integration

### Non-Functional Requirements

1. **Performance**: Build times under 2 minutes for full workspace
2. **Scalability**: Structure supports future apps and libraries
3. **Maintainability**: Clear boundaries and dependencies
4. **Developer Experience**: Intuitive commands and workflows

## Architecture

### Target NX Workspace Structure
```
aix-survey-nx/
├── apps/
│   ├── backend/                    # NestJS application (placeholder)
│   ├── frontend/                   # Next.js 16.x application (placeholder)
│   └── e2e/
│       └── frontend-e2e/          # E2E tests
│
├── libs/
│   ├── shared/
│   │   ├── types/                 # Shared TypeScript types
│   │   ├── constants/             # Application constants
│   │   └── utils/                 # Utility functions
│   ├── database/                  # Database layer (Prisma)
│   └── ui-components/             # Shared UI components
│
├── tools/                         # Custom NX generators/executors
├── nx.json                        # NX workspace configuration
├── package.json                   # Root dependencies
├── tsconfig.base.json             # Base TypeScript config
└── .gitignore                     # Updated for monorepo
```

### Dependency Graph
```
Frontend App → UI Components → Shared Types
Frontend App → Shared Utils → Shared Types
Backend App → Database → Shared Types
Backend App → Shared Utils → Shared Types
Database → Shared Constants
```

## Related Code Files

**New Files to Create**:
```
nx.json                                       # NX workspace config
tsconfig.base.json                           # Base TypeScript config
apps/frontend/project.json                   # Frontend app config
apps/backend/project.json                    # Backend app config  
apps/e2e/frontend-e2e/project.json          # E2E config
libs/shared/types/project.json              # Shared types config
libs/shared/constants/project.json          # Constants config
libs/shared/utils/project.json              # Utils config
libs/database/project.json                  # Database config
libs/ui-components/project.json             # UI components config
```

**Updated Files**:
```
package.json                                 # Root dependencies and scripts
.gitignore                                   # Monorepo patterns
README.md                                    # Updated instructions
```

## Implementation Steps

### Step 1: Create NX Workspace (Day 1)

1. **Initialize New NX Workspace**
```bash
# Create new NX workspace in separate directory
npx create-nx-workspace@latest aix-survey-nx --preset=apps --nxCloud=skip

cd aix-survey-nx

# Install additional dependencies
npm install @nx/next @nx/nest @nx/react @nx/jest @nx/eslint @nx/cypress
```

2. **Configure NX Workspace**
```json
// nx.json
{
  "extends": "nx/presets/npm.json",
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "affected": {
    "defaultBase": "main"
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json", "{workspaceRoot}/.eslintignore"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/src/test-setup.[jt]s",
      "!{projectRoot}/test-setup.[jt]s"
    ],
    "sharedGlobals": []
  },
  "generators": {
    "@nx/react": {
      "application": {
        "babel": true
      }
    },
    "@nx/next": {
      "application": {
        "style": "tailwind"
      }
    }
  }
}
```

3. **Base TypeScript Configuration**
```json
// tsconfig.base.json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "es2015",
    "module": "esnext",
    "lib": ["es2020", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@aix-survey/shared/types": ["libs/shared/types/src/index.ts"],
      "@aix-survey/shared/constants": ["libs/shared/constants/src/index.ts"],
      "@aix-survey/shared/utils": ["libs/shared/utils/src/index.ts"],
      "@aix-survey/database": ["libs/database/src/index.ts"],
      "@aix-survey/ui-components": ["libs/ui-components/src/index.ts"]
    },
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": ["node_modules", "tmp"]
}
```

### Step 2: Create Application Skeletons (Day 2)

1. **Generate Frontend App (Next.js)**
```bash
# Generate Next.js application
npx nx g @nx/next:app frontend --style=tailwind --src=true --appDir=true

# Configure Next.js app
cd apps/frontend
```

```typescript
// apps/frontend/next.config.js
const { composePlugins, withNx } = require('@nx/next');

const nextConfig = {
  nx: {
    svgr: false,
  },
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
```

2. **Generate Backend App (NestJS)**
```bash
# Generate NestJS application
npx nx g @nx/nest:app backend

# Configure NestJS app
cd apps/backend
```

```typescript
// apps/backend/src/main.ts
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS configuration for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Global prefix for API routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  Logger.log(`🚀 Backend is running on: http://localhost:${port}/api`);
}

bootstrap();
```

3. **Generate E2E Test App**
```bash
# Generate E2E tests for frontend
npx nx g @nx/cypress:e2e frontend-e2e --project=frontend
```

### Step 3: Create Shared Libraries (Day 3)

1. **Shared Types Library**
```bash
# Generate shared types library
npx nx g @nx/js:lib shared/types --buildable --publishable --importPath=@aix-survey/shared/types
```

```typescript
// libs/shared/types/src/lib/user.types.ts
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN', 
  REVIEWER = 'REVIEWER',
  RESPONDENT = 'RESPONDENT',
  VIEWER = 'VIEWER',
}

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
}
```

```typescript
// libs/shared/types/src/lib/assessment.types.ts
export interface Assessment {
  id: string;
  title: string;
  status: AssessmentStatus;
  userId?: string;
  organizationId?: string;
  templateId: string;
  responses: Response[];
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS', 
  FINALIZED = 'FINALIZED',
}

export interface Response {
  id: string;
  assessmentId: string;
  itemId: string;
  score?: number;
  currentState?: string;
  desiredState?: string;
  evidences: Evidence[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  id: string;
  responseId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  uploadedAt: Date;
  uploadedById?: string;
}
```

```typescript
// libs/shared/types/src/index.ts
export * from './lib/user.types';
export * from './lib/assessment.types';
export * from './lib/organization.types';
export * from './lib/api.types';
```

2. **Shared Constants Library**
```bash
# Generate shared constants library
npx nx g @nx/js:lib shared/constants --buildable --publishable --importPath=@aix-survey/shared/constants
```

```typescript
// libs/shared/constants/src/lib/maturity-levels.ts
export const MATURITY_LEVELS = {
  1: { min: 1.0, max: 1.5, label: 'Sơ khai (Initial)', color: '#EF4444' },
  2: { min: 1.6, max: 2.5, label: 'Khởi đầu (Beginning)', color: '#F97316' },
  3: { min: 2.6, max: 3.5, label: 'Phát triển (Developing)', color: '#EAB308' },
  4: { min: 3.6, max: 4.5, label: 'Trưởng thành (Mature)', color: '#22C55E' },
  5: { min: 4.6, max: 5.0, label: 'Tối ưu (Optimized)', color: '#3B82F6' },
} as const;

export const DOMAIN_COLORS = {
  data: '#3B82F6',
  infrastructure: '#8B5CF6', 
  technology: '#10B981',
  organization: '#F59E0B',
  policy: '#EF4444',
} as const;
```

```typescript
// libs/shared/constants/src/lib/app-config.ts
export const APP_CONFIG = {
  name: 'AI Maturity Assessment Platform',
  version: '1.0.0',
  description: 'Enterprise-grade platform for assessing AI maturity',
  supportEmail: 'support@aix-survey.com',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  autosaveInterval: 5000, // 5 seconds
} as const;

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout', 
    register: '/auth/register',
    session: '/auth/session',
  },
  assessments: {
    list: '/assessments',
    create: '/assessments',
    get: (id: string) => `/assessments/${id}`,
    update: (id: string) => `/assessments/${id}`,
    finalize: (id: string) => `/assessments/${id}/finalize`,
    export: (id: string, format: string) => `/assessments/${id}/export/${format}`,
  },
} as const;
```

3. **Shared Utils Library**
```bash
# Generate shared utils library  
npx nx g @nx/js:lib shared/utils --buildable --publishable --importPath=@aix-survey/shared/utils
```

```typescript
// libs/shared/utils/src/lib/validation.utils.ts
import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
```

```typescript
// libs/shared/utils/src/lib/date.utils.ts
import { format } from 'date-fns';

export function formatDate(date: Date | string, pattern = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, pattern);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
}
```

### Step 4: Database Library Setup (Day 4)

```bash
# Generate database library
npx nx g @nx/js:lib database --buildable --publishable --importPath=@aix-survey/database
```

```typescript
// libs/database/src/lib/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// libs/database/src/lib/database.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

### Step 5: UI Components Library (Day 5)

```bash
# Generate UI components library
npx nx g @nx/react:lib ui-components --buildable --publishable --importPath=@aix-survey/ui-components
```

```typescript
// libs/ui-components/src/lib/button/button.tsx
import React from 'react';
import { cn } from '../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'border border-gray-300 bg-white hover:bg-gray-50': variant === 'outline',
            'hover:bg-gray-100': variant === 'ghost',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Step 6: Configure Build & Test (Day 6-7)

1. **Update Root Package.json**
```json
{
  "name": "aix-survey-nx",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nx run-many --target=serve --projects=frontend,backend --parallel",
    "build": "nx run-many --target=build --projects=frontend,backend --parallel",
    "test": "nx run-many --target=test --all",
    "test:affected": "nx affected --target=test",
    "lint": "nx run-many --target=lint --all", 
    "lint:affected": "nx affected --target=lint",
    "type-check": "nx run-many --target=type-check --all",
    "db:generate": "cd libs/database && npx prisma generate",
    "db:migrate": "cd libs/database && npx prisma migrate dev",
    "db:studio": "cd libs/database && npx prisma studio"
  }
}
```

2. **Validate NX Configuration**
```bash
# Check dependency graph
npx nx graph

# Test builds
npx nx run-many --target=build --all

# Run tests
npx nx run-many --target=test --all

# Check linting
npx nx run-many --target=lint --all
```

## Todo List

### Workspace Setup
- [ ] Create new NX workspace with proper configuration
- [ ] Configure nx.json with build orchestration settings
- [ ] Set up base TypeScript configuration with path mapping
- [ ] Configure ESLint and Prettier for monorepo
- [ ] Set up Jest testing configuration
- [ ] Configure Cypress for E2E testing

### Application Skeletons
- [ ] Generate Next.js frontend application with Tailwind
- [ ] Generate NestJS backend application
- [ ] Generate E2E test application for frontend
- [ ] Configure CORS and API prefix for backend
- [ ] Set up basic routing and health checks
- [ ] Test application skeletons work independently

### Shared Libraries
- [ ] Create shared/types library with user and assessment types
- [ ] Create shared/constants library with app configuration
- [ ] Create shared/utils library with validation and date utilities  
- [ ] Create database library with Prisma service and module
- [ ] Create ui-components library with base components
- [ ] Configure TypeScript path mapping for all libraries

### Build Configuration
- [ ] Configure NX build targets and caching
- [ ] Set up dependency graph between apps and libraries
- [ ] Configure hot module replacement for development
- [ ] Set up parallel builds and testing
- [ ] Configure affected command for efficient CI/CD
- [ ] Test all build and development commands

### Quality Assurance
- [ ] Test library imports work correctly across apps
- [ ] Validate TypeScript path mapping resolves properly
- [ ] Verify hot reload works for all apps and libraries
- [ ] Test build caching improves build times
- [ ] Ensure linting rules are consistent across workspace
- [ ] Validate test configuration works for all projects

## Success Criteria

1. **Workspace Structure**
   - NX workspace created with proper configuration
   - All apps and libraries generated successfully
   - TypeScript path mapping works correctly
   - Dependency graph is clean and logical

2. **Development Experience**
   - `nx dev` starts both frontend and backend
   - Hot reload works for all applications
   - Build times under 2 minutes for full workspace
   - Tests run efficiently with proper isolation

3. **Library Architecture**
   - Shared types library usable by both apps
   - UI components render correctly in frontend
   - Database library integrates properly with backend
   - Utils library functions work across apps

4. **Build System**
   - All apps and libraries build successfully
   - NX caching improves subsequent build times
   - Affected commands work correctly for CI/CD
   - Linting and formatting consistent across codebase

## Risk Assessment

**Technical Risks**:
- **MEDIUM**: NX configuration complexity may cause issues
- **LOW**: TypeScript path mapping might not resolve correctly
- **LOW**: Build caching may not work as expected

**Timeline Risks**:
- **MEDIUM**: Learning curve for NX workspace concepts
- **LOW**: Library generation taking longer than expected
- **LOW**: Configuration issues delaying progress

**Integration Risks**:
- **LOW**: Shared libraries may not integrate smoothly
- **LOW**: Hot reload may not work properly in monorepo
- **LOW**: Build orchestration complexity

**Mitigation**:
- Follow NX best practices and documentation
- Start with simple configurations and iterate
- Test each library integration thoroughly
- Keep detailed notes on configuration decisions

## Security Considerations

**Workspace Security**:
- Proper .gitignore for monorepo patterns
- Environment variables managed securely
- Library boundaries prevent unauthorized access
- Build artifacts properly excluded from version control

**Dependencies**:
- All packages updated to latest secure versions
- Audit dependencies for vulnerabilities
- Proper peer dependency management
- Secure package registry configuration

## Next Steps

1. **Day 8**: Begin Phase 03 (Database Migration)
2. **Ongoing**: Monitor build performance and optimize
3. **Week 3**: Start migrating existing code to new structure
4. **Continuous**: Refine library boundaries based on actual usage

**Critical Path**: All libraries must be functional before starting code migration in subsequent phases.