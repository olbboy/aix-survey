# NX Monorepo Migration Guide

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Status**: Phase 01 Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase-by-Phase Guide](#phase-by-phase-guide)
4. [Troubleshooting](#troubleshooting)
5. [Testing & Validation](#testing--validation)
6. [Rollback Procedures](#rollback-procedures)

---

## Overview

### Migration Objective

Transform AIX Survey from a Next.js monolithic application to an NX monorepo with separate NestJS backend and Next.js frontend, enabling:

- **Better separation of concerns**: Frontend and backend in separate applications
- **Improved scalability**: Independent scaling of frontend and backend
- **Enhanced developer experience**: Better tooling, build caching, and code generation
- **Code reusability**: Shared libraries for common utilities, types, and components
- **Parallel development**: Multiple teams can work independently

### Architecture Comparison

**Current (Monolithic)**:
```
aix-survey/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API Routes (mixed with pages)
│   │   └── (pages)/      # Frontend pages
│   └── lib/              # Shared utilities
├── prisma/               # Database schema
└── package.json
```

**Target (Monorepo)**:
```
aix-survey/
├── apps/
│   ├── frontend/         # Next.js application
│   │   └── src/
│   └── backend/          # NestJS application
│       └── src/
├── libs/
│   ├── shared/           # Shared TypeScript types
│   ├── ui/               # Shared UI components
│   ├── database/         # Prisma schema & utilities
│   └── utils/            # Shared utilities
├── tools/                # Build tools and scripts
├── nx.json               # NX workspace configuration
└── package.json          # Root package.json
```

### Migration Timeline

| Phase | Duration | Status | Description |
|-------|----------|--------|-------------|
| **Phase 00** | 1 day | ✅ Complete | Pre-migration security fixes |
| **Phase 01** | 1 week | ✅ Complete | Infrastructure preparation |
| **Phase 02** | 1 week | 🔄 Pending | NX workspace setup |
| **Phase 03** | 2 weeks | 🔄 Pending | Backend service creation |
| **Phase 04** | 2 weeks | 🔄 Pending | Frontend migration |
| **Phase 05** | 1 week | 🔄 Pending | Shared libraries |
| **Phase 06** | 1 week | 🔄 Pending | Testing & optimization |

**Total Estimated Duration**: 8-10 weeks

---

## Prerequisites

### Required Tools

#### 1. **Node.js & npm**
- **Version**: Node.js 20+ (LTS recommended)
- **Installation**: https://nodejs.org/
- **Verification**:
  ```bash
  node --version  # Should be v20.x.x or higher
  npm --version   # Should be 10.x.x or higher
  ```

#### 2. **NX CLI**
- **Installation**:
  ```bash
  npm install -g nx@latest
  ```
- **Verification**:
  ```bash
  nx --version
  ```

#### 3. **NestJS CLI**
- **Installation**:
  ```bash
  npm install -g @nestjs/cli@latest
  ```
- **Verification**:
  ```bash
  nest --version
  ```

#### 4. **Docker & Docker Compose**
- **Version**: Docker 20+, Docker Compose 2+
- **Installation**: https://docs.docker.com/get-docker/
- **Verification**:
  ```bash
  docker --version
  docker-compose --version
  ```

#### 5. **PostgreSQL Client Tools**
- **Installation** (Ubuntu/Debian):
  ```bash
  sudo apt-get install postgresql-client
  ```
- **Verification**:
  ```bash
  psql --version
  ```

#### 6. **Git**
- **Version**: Git 2.30+
- **Verification**:
  ```bash
  git --version
  ```

### Environment Setup

#### 1. **Clone Repository**
```bash
git clone <repository-url>
cd aix-survey
```

#### 2. **Run Setup Script**
```bash
./scripts/setup-development.sh
```

This script will:
- ✅ Check all prerequisites
- ✅ Install global tools (NX, NestJS CLI)
- ✅ Create environment files (.env.local)
- ✅ Install project dependencies
- ✅ Start Docker services (PostgreSQL, Redis)
- ✅ Run database migrations
- ✅ Verify setup

#### 3. **Manual Setup** (if script fails)
```bash
# Install dependencies
npm ci

# Copy environment template
cp .env.example .env.local

# Update .env.local with your credentials
# DATABASE_URL, REDIS_URL, JWT_SECRET, etc.

# Start services
docker-compose up -d

# Run migrations
npx prisma migrate dev
npx prisma generate
```

---

## Phase-by-Phase Guide

### Phase 00: Pre-Migration Security Fixes ✅

**Status**: COMPLETE (95%)
**Duration**: 1 day
**Completion Date**: 2025-11-08

#### Completed Work

1. **Security Infrastructure**
   - ✅ Winston logger with PII sanitization
   - ✅ Zod validation schemas
   - ✅ Rate limiter middleware
   - ✅ Auth middleware helpers

2. **Critical Vulnerabilities Fixed**
   - ✅ Session token verification
   - ✅ Admin role enforcement
   - ✅ Complete audit trail
   - ✅ Input validation on core routes

3. **Security Grade**: **F → A-**

**Details**: See `plans/251108-1411-nx-monorepo-migration/reports/251108-phase-00-completion-report.md`

---

### Phase 01: Infrastructure Preparation ✅

**Status**: COMPLETE (100%)
**Duration**: 1 week
**Start Date**: 2025-11-08

#### Completed Work

1. **Enhanced CI/CD Pipeline**
   - ✅ Created `.github/workflows/nx-ci.yml`
   - ✅ Multi-app build support
   - ✅ Parallel testing matrix
   - ✅ Docker image building
   - ✅ Staging deployment workflow
   - ✅ Security scanning (npm audit, Snyk, Trivy)

2. **Staging Environment**
   - ✅ Created `docker-compose.staging.yml`
   - ✅ PostgreSQL, Redis, Backend, Frontend services
   - ✅ Nginx reverse proxy configuration
   - ✅ pgAdmin and Redis Commander (dev tools)
   - ✅ Environment configuration template (`.env.staging.example`)

3. **Development Tools**
   - ✅ Development setup script (`scripts/setup-development.sh`)
   - ✅ Database backup script (`scripts/backup-database.sh`)
   - ✅ Database restore script (`scripts/restore-database.sh`)
   - ✅ All scripts are executable and tested

4. **Monitoring Stack**
   - ✅ Prometheus for metrics collection
   - ✅ Grafana for visualization
   - ✅ Loki for log aggregation
   - ✅ Promtail for log shipping
   - ✅ Node Exporter for system metrics
   - ✅ cAdvisor for container metrics

5. **Documentation**
   - ✅ Migration guide (this document)
   - ✅ Rollback procedures (see `docs/rollback-procedures.md`)

#### How to Use Phase 01 Deliverables

**1. Setup Development Environment**
```bash
# Run automated setup
./scripts/setup-development.sh

# Or manually install tools
npm install -g nx@latest @nestjs/cli@latest
npm ci
```

**2. Start Staging Environment**
```bash
# Start all staging services
docker-compose -f docker-compose.staging.yml up -d

# Check service status
docker-compose -f docker-compose.staging.yml ps

# View logs
docker-compose -f docker-compose.staging.yml logs -f
```

**3. Backup Database Before Migration**
```bash
# Create comprehensive backup
./scripts/backup-database.sh

# Backups saved to: backups/
# - backups/schema/
# - backups/data/
# - backups/full/
```

**4. Start Monitoring Stack**
```bash
cd monitoring
docker-compose up -d

# Access services:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3002 (admin/admin)
# - Loki: http://localhost:3100
```

**5. Run CI/CD Pipeline**
```bash
# Trigger workflow on push
git push origin develop

# Or manually run jobs
npm run lint
npm run test
npm run build
```

---

### Phase 02: NX Workspace Setup (NEXT)

**Status**: PENDING
**Duration**: 1 week
**Planned Start**: After Phase 01 approval

#### Planned Activities

1. **Initialize NX Workspace**
   ```bash
   npx create-nx-workspace@latest aix-survey-nx \
     --preset=empty \
     --nx-cloud=false \
     --package-manager=npm
   ```

2. **Configure Workspace**
   - Create `nx.json` with caching strategies
   - Configure build targets and executors
   - Set up affected command optimization

3. **Create Apps Structure**
   ```bash
   nx generate @nrwl/next:application frontend
   nx generate @nrwl/nest:application backend
   ```

4. **Migrate Existing Code**
   - Copy Next.js app to `apps/frontend`
   - Extract API routes for backend migration
   - Update import paths

**Prerequisites**:
- ✅ Phase 01 complete
- ✅ All backups created
- ✅ Team training completed

---

### Phase 03: Backend Service Creation

**Status**: PENDING
**Duration**: 2 weeks

#### Planned Activities

1. **NestJS Application Setup**
2. **Migrate API Routes**
3. **Authentication & Authorization**
4. **Database Integration (Prisma)**
5. **API Documentation (Swagger)**

---

### Phase 04: Frontend Migration

**Status**: PENDING
**Duration**: 2 weeks

#### Planned Activities

1. **Next.js Application in NX**
2. **Update API Client**
3. **Environment Configuration**
4. **Authentication Integration**

---

### Phase 05: Shared Libraries

**Status**: PENDING
**Duration**: 1 week

#### Planned Activities

1. **Create Shared Libraries**
2. **Extract Common Code**
3. **Update Imports**

---

### Phase 06: Testing & Optimization

**Status**: PENDING
**Duration**: 1 week

#### Planned Activities

1. **Comprehensive Testing**
2. **Performance Optimization**
3. **Production Deployment**

---

## Troubleshooting

### Common Issues

#### 1. **NX Command Not Found**

**Symptom**:
```bash
nx: command not found
```

**Solution**:
```bash
# Install NX globally
npm install -g nx@latest

# Or use npx
npx nx --version
```

---

#### 2. **Database Connection Failed**

**Symptom**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Start PostgreSQL
docker-compose up -d postgres

# Verify connection
psql postgresql://postgres:password@localhost:5432/aix_survey_dev
```

---

#### 3. **Docker Build Failures**

**Symptom**:
```
ERROR: failed to solve: failed to compute cache key
```

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -f apps/backend/Dockerfile .
```

---

#### 4. **Port Already in Use**

**Symptom**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port in .env.local
PORT=3001
```

---

#### 5. **Prisma Migration Failures**

**Symptom**:
```
Error: P3009 Migration failed to apply cleanly
```

**Solution**:
```bash
# Reset database (DESTRUCTIVE)
npx prisma migrate reset

# Or manually resolve conflicts
npx prisma migrate resolve --applied <migration-name>
npx prisma migrate deploy
```

---

## Testing & Validation

### Pre-Migration Checklist

Before starting migration, verify:

- [ ] All backups created and verified
- [ ] Development environment setup complete
- [ ] All tests passing in current system
- [ ] Staging environment operational
- [ ] Monitoring stack running
- [ ] Team training completed
- [ ] Rollback procedures documented and tested

### During Migration

- [ ] Run tests after each phase
- [ ] Verify functionality in staging
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Review logs for issues

### Post-Migration

- [ ] End-to-end testing
- [ ] Load testing
- [ ] Security testing
- [ ] User acceptance testing
- [ ] Production smoke tests

---

## Rollback Procedures

For emergency rollback procedures, see:
- **Document**: `docs/rollback-procedures.md`
- **Scripts**: `scripts/restore-database.sh`

**Quick Rollback**:
```bash
# 1. Restore database
./scripts/restore-database.sh --type full

# 2. Stop new services
docker-compose down

# 3. Restart original application
npm run dev
```

---

## Support & Escalation

### Emergency Contacts

| Role | Contact | When to Contact |
|------|---------|----------------|
| Technical Lead | TBD | Critical system failures |
| Database Admin | TBD | Data integrity issues |
| DevOps Lead | TBD | Infrastructure problems |
| Product Owner | TBD | Migration decisions |

### Escalation Path

1. **Level 1**: Check troubleshooting section
2. **Level 2**: Review logs and monitoring
3. **Level 3**: Contact technical lead
4. **Level 4**: Initiate rollback procedures

---

## Additional Resources

- **Migration Plan**: `plans/251108-1411-nx-monorepo-migration/plan.md`
- **Architecture Docs**: `docs/system-architecture.md`
- **API Documentation**: (TBD - Swagger after Phase 03)
- **NX Documentation**: https://nx.dev/getting-started/intro
- **NestJS Documentation**: https://docs.nestjs.com/

---

**Last Updated**: 2025-11-08
**Maintainer**: Engineering Team
**Version**: 1.0 (Phase 01 Complete)
