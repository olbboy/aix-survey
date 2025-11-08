# Phase 05: Frontend Migration to NX Workspace

**Status**: In Progress
**Priority**: High
**Estimated Duration**: 4-6 hours
**Dependencies**: Phase 04 (NestJS Backend Foundation)

---

## Objectives

Migrate the existing Next.js frontend application into the NX monorepo structure while:
1. Preserving all existing functionality
2. Maintaining compatibility with existing database and API routes
3. Enabling future API migration to NestJS backend
4. Setting up proper NX build and development workflows

---

## Current State Analysis

### Existing Structure
```
aix-survey/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/       # Dashboard routes
│   │   ├── api/               # API routes (to be migrated to NestJS)
│   │   ├── assessment/        # Assessment pages
│   │   └── auth/              # Auth pages
│   ├── components/            # React components
│   │   ├── assessment/
│   │   ├── auth/
│   │   ├── benchmarks/
│   │   ├── evidence/
│   │   ├── progress/
│   │   └── ui/               # shadcn/ui components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility libraries
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── benchmarks/
│   │   ├── db/              # Prisma client
│   │   ├── email/
│   │   ├── export/
│   │   ├── progress/
│   │   ├── redis/
│   │   ├── scoring/
│   │   ├── storage/
│   │   ├── utils/
│   │   └── validation/
│   ├── types/               # TypeScript types
│   └── middleware.ts        # Next.js middleware
├── public/                  # Static assets
├── prisma/                  # Database schema
└── package.json
```

### Target Structure
```
aix-survey/
├── apps/
│   ├── frontend/           # Next.js frontend app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── types/
│   │   │   └── middleware.ts
│   │   ├── public/
│   │   ├── project.json    # NX configuration
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   └── tailwind.config.ts
│   └── backend/            # NestJS backend (Phase 04)
├── libs/
│   ├── database/           # Shared database library
│   └── shared/            # Shared libraries (Phase 02)
└── prisma/                # Shared Prisma schema
```

---

## Migration Strategy

### Step 1: Create Frontend App Structure (1 hour)

**Tasks:**
1. Create `apps/frontend/` directory structure
2. Copy `src/` → `apps/frontend/src/`
3. Copy `public/` → `apps/frontend/public/`
4. Copy Next.js configuration files
5. Create NX project configuration

**Files to Create:**
- `apps/frontend/project.json` - NX project configuration
- `apps/frontend/tsconfig.json` - TypeScript configuration
- `apps/frontend/tsconfig.app.json` - App-specific TypeScript config
- `apps/frontend/next.config.js` - Next.js configuration (if not exists)
- `apps/frontend/tailwind.config.ts` - Tailwind configuration (if not exists)
- `apps/frontend/.eslintrc.json` - ESLint configuration

**Validation:**
- All files copied successfully
- Directory structure matches target
- No files left behind in root `src/`

---

### Step 2: Configure TypeScript & Paths (1 hour)

**Tasks:**
1. Update `apps/frontend/tsconfig.json` with NX-compatible settings
2. Configure path aliases for shared libraries
3. Update imports to use monorepo paths
4. Ensure Next.js App Router compatibility

**TypeScript Configuration:**
```typescript
// apps/frontend/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "baseUrl": "../../",
    "paths": {
      "@/*": ["apps/frontend/src/*"],
      "@aix-survey/database": ["libs/database/src/index.ts"],
      "@aix-survey/shared/types": ["libs/shared/types/src/index.ts"],
      "@aix-survey/shared/constants": ["libs/shared/constants/src/index.ts"],
      "@aix-survey/shared/utils": ["libs/shared/utils/src/index.ts"]
    },
    "plugins": [{ "name": "next" }],
    "incremental": true,
    "strict": true
  },
  "include": [
    "src/**/*",
    ".next/types/**/*.ts",
    "../../dist/apps/frontend/.next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Validation:**
- TypeScript compilation successful
- Path aliases resolved correctly
- No import errors

---

### Step 3: Configure Next.js for NX (1 hour)

**Tasks:**
1. Create/update `next.config.js` for monorepo
2. Configure output directory for NX
3. Set up environment variable handling
4. Configure static asset paths

**Next.js Configuration:**
```javascript
// apps/frontend/next.config.js
const { composePlugins, withNx } = require('@nx/next');

const nextConfig = {
  // NX configuration
  nx: {
    svgr: false,
  },

  // Output configuration for monorepo
  distDir: '../../dist/apps/frontend/.next',

  // Compiler options
  compiler: {
    styledComponents: false,
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
```

**Validation:**
- Next.js config loads without errors
- Development server starts successfully
- Build process completes

---

### Step 4: Configure NX Project (30 minutes)

**Tasks:**
1. Create `apps/frontend/project.json`
2. Define build, serve, lint, and test targets
3. Configure dependencies on shared libraries
4. Set up environment variable passing

**NX Project Configuration:**
```json
{
  "name": "frontend",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/frontend/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/apps/frontend"
      },
      "configurations": {
        "development": {
          "outputPath": "apps/frontend"
        },
        "production": {}
      }
    },
    "serve": {
      "executor": "@nx/next:server",
      "defaultConfiguration": "development",
      "options": {
        "buildTarget": "frontend:build",
        "dev": true,
        "port": 3000
      },
      "configurations": {
        "development": {
          "buildTarget": "frontend:build:development",
          "dev": true
        },
        "production": {
          "buildTarget": "frontend:build:production",
          "dev": false
        }
      }
    },
    "export": {
      "executor": "@nx/next:export",
      "options": {
        "buildTarget": "frontend:build:production"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["apps/frontend/**/*.{ts,tsx,js,jsx}"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/apps/frontend"],
      "options": {
        "jestConfig": "apps/frontend/jest.config.ts",
        "passWithNoTests": true
      }
    },
    "type-check": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc --noEmit -p apps/frontend/tsconfig.json"
      }
    }
  },
  "tags": ["type:app", "scope:frontend"]
}
```

**Validation:**
- NX commands work: `nx serve frontend`, `nx build frontend`
- All targets execute successfully
- Dependencies resolved correctly

---

### Step 5: Update Package Scripts (15 minutes)

**Tasks:**
1. Update `package.json` scripts to use NX
2. Maintain backward compatibility with existing scripts
3. Add frontend-specific scripts

**Package.json Updates:**
```json
{
  "scripts": {
    // Keep existing for backward compatibility
    "dev": "nx serve frontend",
    "build": "nx build frontend",
    "start": "nx serve frontend --configuration=production",
    "lint": "nx run-many --target=lint --all",

    // Frontend-specific
    "frontend:dev": "nx serve frontend",
    "frontend:build": "nx build frontend",
    "frontend:type-check": "nx type-check frontend",
    "frontend:lint": "nx lint frontend",

    // Backend (from Phase 04)
    "backend:dev": "tsx watch apps/backend/src/main.ts",
    "backend:build": "nx build backend",
    "backend:type-check": "tsc --noEmit -p apps/backend/tsconfig.json",

    // Full-stack development
    "dev:all": "nx run-many --target=serve --projects=frontend,backend --parallel=2",
    "build:all": "nx run-many --target=build --projects=frontend,backend",

    // Existing scripts
    "type-check": "nx run-many --target=type-check --all",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "test": "nx run-many --target=test --all",
    "nx:graph": "nx graph"
  }
}
```

**Validation:**
- All scripts execute correctly
- `npm run dev` starts frontend
- `npm run dev:all` starts both frontend and backend

---

### Step 6: Migrate Shared Code to Libraries (1 hour)

**Tasks:**
1. Identify code that can be shared between frontend/backend
2. Move shared types to `@aix-survey/shared/types`
3. Move shared constants to `@aix-survey/shared/constants`
4. Move shared utilities to `@aix-survey/shared/utils`
5. Update imports across the frontend

**Candidates for Migration:**
- `src/types/` → `libs/shared/types/src/lib/`
- Database types (already using Prisma)
- Validation schemas
- Common utilities
- Maturity level constants

**Validation:**
- No duplicate code between frontend and shared libraries
- Imports use monorepo paths
- TypeScript compilation successful

---

### Step 7: Test & Validate (1 hour)

**Tasks:**
1. Run TypeScript type-check on frontend
2. Run ESLint on frontend
3. Start development server and verify functionality
4. Build production bundle
5. Test all critical user flows

**Critical Flows to Test:**
- [ ] Home page loads
- [ ] Assessment creation
- [ ] Assessment form submission
- [ ] Evidence upload
- [ ] Results visualization
- [ ] User authentication
- [ ] API routes respond correctly

**Validation Checklist:**
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors
- [ ] Development server starts on port 3000
- [ ] Production build succeeds
- [ ] All pages accessible
- [ ] API routes functional
- [ ] Database queries work
- [ ] Redis connection active
- [ ] File upload functional

---

### Step 8: Cleanup & Documentation (30 minutes)

**Tasks:**
1. Remove old `src/` directory from root
2. Update README with new structure
3. Update development documentation
4. Create Phase 05 completion report

**Files to Update:**
- `README.md` - Update directory structure section
- `docs/system-architecture.md` - Update architecture diagrams
- `docs/codebase-summary.md` - Update file structure

**Files to Remove:**
- `src/` (after verification)
- Any root-level Next.js config files (moved to `apps/frontend/`)

**Validation:**
- Documentation accurate and up-to-date
- No references to old directory structure
- Clean git status

---

## Risk Mitigation

### Risk 1: Import Path Breakage
**Mitigation:**
- Use automated find/replace for path updates
- Run TypeScript compilation after each change
- Test imports in small batches

### Risk 2: Next.js Config Issues
**Mitigation:**
- Keep original config as backup
- Test dev server after each config change
- Validate build process early

### Risk 3: Environment Variables
**Mitigation:**
- Document all required env vars
- Test with `.env.local` in multiple locations
- Verify env loading in both dev and build modes

### Risk 4: Static Assets
**Mitigation:**
- Verify `public/` assets accessible
- Test image loading
- Check font and icon loading

---

## Success Criteria

- [ ] Frontend runs successfully from `apps/frontend/`
- [ ] All NX commands work (`nx serve frontend`, `nx build frontend`)
- [ ] TypeScript compilation: 0 errors
- [ ] ESLint: 0 errors or warnings
- [ ] Development server starts without issues
- [ ] Production build completes successfully
- [ ] All user flows functional
- [ ] Shared libraries imported correctly
- [ ] Documentation updated
- [ ] Old `src/` directory removed

---

## Dependencies & Prerequisites

### External Dependencies
- NX Next.js plugin: `@nx/next`
- Next.js: `^14.0.0` (already installed)
- React: `^18.0.0` (already installed)

### Internal Dependencies
- Phase 04 completion (NestJS Backend)
- Shared libraries (Phase 02)
- Database library (Phase 04)

---

## Timeline

| Task | Duration | Cumulative |
|------|----------|-----------|
| Create frontend app structure | 1h | 1h |
| Configure TypeScript & paths | 1h | 2h |
| Configure Next.js for NX | 1h | 3h |
| Configure NX project | 30m | 3.5h |
| Update package scripts | 15m | 3.75h |
| Migrate shared code | 1h | 4.75h |
| Test & validate | 1h | 5.75h |
| Cleanup & documentation | 30m | 6.25h |

**Total Estimated Duration**: 6-7 hours

---

## Next Phase Preview

**Phase 06: API Migration to NestJS Backend**
- Migrate Next.js API routes to NestJS controllers
- Implement assessment module in NestJS
- Implement organization module in NestJS
- Set up API integration between frontend and backend
- Remove Next.js API routes after migration

---

## Notes

- The frontend will continue using Next.js API routes during Phase 05
- Full API migration to NestJS will happen in Phase 06
- Prisma client will be shared between Next.js API and NestJS backend
- Redis client will be shared via the database library
- Frontend can gradually adopt the NestJS backend endpoints
