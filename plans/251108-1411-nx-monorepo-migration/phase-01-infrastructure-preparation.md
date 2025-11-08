# Phase 01: Infrastructure Preparation

## Context Links

- **Parent Plan**: [Plan Overview](./plan.md)
- **Previous Phase**: [Phase 00 - Pre-Migration Security Fixes](./phase-00-pre-migration-security-fixes.md)
- **Next Phase**: [Phase 02 - NX Workspace Setup](./phase-02-nx-workspace-setup.md)
- **Migration Analysis**: `/Users/leo/Documents/aix-survey/NX-MONOREPO-MIGRATION-ANALYSIS.md#8-migration-roadmap`

## Overview

**Phase**: 01 - Infrastructure Preparation  
**Date**: 2025-11-08  
**Description**: Set up infrastructure, tooling, and team preparation for migration  
**Priority**: HIGH  
**Implementation Status**: ❌ Not Started  
**Review Status**: ❌ Pending  
**Duration**: 1 week  
**Dependencies**: Phase 00 (Security fixes completed)

## Key Insights

Before starting the technical migration, we need solid foundation:

1. **Team Training**: NestJS and NX expertise critical for success
2. **Infrastructure Setup**: CI/CD, environments, monitoring must be ready
3. **Documentation**: Clear migration procedures and rollback plans
4. **Tooling**: Development environment optimization for monorepo
5. **Risk Mitigation**: Backup strategies and contingency plans

Success of entire migration depends on proper preparation phase.

## Requirements

### Functional Requirements

1. **Team Training**
   - NestJS fundamentals for all developers
   - NX workspace concepts and workflows
   - Migration process understanding
   - New tooling familiarity

2. **Infrastructure Setup**
   - Staging environment preparation
   - CI/CD pipeline updates
   - Monitoring and logging setup
   - Backup and recovery procedures

3. **Development Environment**
   - Local development optimization
   - Tool installations and configurations
   - Environment variable management
   - Database setup for testing

4. **Documentation**
   - Migration procedures documented
   - Rollback plans created
   - Team communication protocols
   - Emergency response procedures

### Non-Functional Requirements

1. **Reliability**: All infrastructure components tested
2. **Performance**: Development environment optimized
3. **Security**: All environments properly secured
4. **Scalability**: Infrastructure ready for team collaboration

## Architecture

### Current Infrastructure
```
Single Repository
├── Local Development (Next.js dev server)
├── GitHub Actions (basic CI/CD)
├── Production (Vercel/similar)
└── Database (PostgreSQL + Redis)
```

### Target Infrastructure
```
Monorepo Infrastructure
├── Local Development (NX workspace with caching)
├── Staging Environment (NestJS + Next.js)
├── Enhanced CI/CD (Multi-app builds, testing)
├── Production (Containerized deployment)
├── Monitoring (Logs, metrics, alerts)
└── Database (Same, with migration tools)
```

## Related Code Files

**New Configuration Files**:
```
.github/workflows/nx-ci.yml                   # Enhanced CI/CD
docker-compose.staging.yml                   # Staging environment
scripts/setup-development.sh                 # Dev environment setup
scripts/backup-database.sh                   # Backup procedures
docs/migration-guide.md                      # Team documentation
docs/rollback-procedures.md                  # Emergency procedures
.env.staging                                 # Staging configuration
nx.json                                      # NX workspace config (template)
```

**Updated Files**:
```
.github/workflows/                           # Enhanced CI/CD pipelines
README.md                                    # Updated setup instructions
package.json                                 # Development dependencies
.gitignore                                   # Monorepo patterns
```

## Implementation Steps

### Step 1: Team Training Setup (Day 1-2)

1. **NestJS Training Materials**
```markdown
# NestJS Training Plan

## Day 1: Fundamentals
- Controllers and Services
- Dependency Injection
- Guards and Middleware
- Module System

## Day 2: Advanced Features  
- Prisma Integration
- Authentication (Passport.js)
- Validation (class-validator)
- Testing Strategies

## Day 3: Hands-on Practice
- Build sample API
- Implement auth flow
- Write tests
- Deploy to staging

## Resources
- Official NestJS docs
- Migration comparison guide
- Code examples from similar projects
```

2. **NX Training Materials**
```markdown
# NX Training Plan

## Day 1: Workspace Concepts
- Monorepo architecture
- Apps vs Libraries
- Dependency graph
- Build orchestration

## Day 2: Development Workflow
- NX CLI commands
- Code generation
- Affected commands
- Caching system

## Resources
- NX official documentation  
- Monorepo best practices
- Migration case studies
```

### Step 2: Infrastructure Setup (Day 3-4)

1. **Enhanced CI/CD Pipeline**
```yaml
# .github/workflows/nx-ci.yml
name: NX Monorepo CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup NX
        run: npx nx --version

  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [frontend, backend]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests for ${{ matrix.app }}
        run: npx nx test ${{ matrix.app }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build affected projects
        run: npx nx affected --target=build --parallel=3
      
      - name: Build Docker images
        run: |
          docker build -f apps/backend/Dockerfile -t aix-backend .
          docker build -f apps/frontend/Dockerfile -t aix-frontend .

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: echo "Deploy to staging environment"
```

2. **Staging Environment Setup**
```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: aix_survey_staging
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_staging_data:/data

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/aix_survey_staging
      REDIS_URL: redis://redis:6379
      NODE_ENV: staging
    ports:
      - "3001:3000"
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3000
      NODE_ENV: staging
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_staging_data:
  redis_staging_data:
```

3. **Development Setup Script**
```bash
#!/bin/bash
# scripts/setup-development.sh

set -e

echo "🚀 Setting up development environment for NX monorepo migration..."

# Check prerequisites
echo "📋 Checking prerequisites..."
node --version || { echo "❌ Node.js 20+ required"; exit 1; }
npm --version || { echo "❌ NPM 10+ required"; exit 1; }
docker --version || { echo "❌ Docker required"; exit 1; }

# Install global tools
echo "🔧 Installing global tools..."
npm install -g @nrwl/nx@latest
npm install -g @nestjs/cli@latest

# Setup local environment
echo "📁 Setting up local environment..."
cp .env.example .env.local

# Start local services
echo "🐳 Starting local services..."
docker-compose up -d

# Setup database
echo "🗄️ Setting up database..."
npm run db:migrate
npm run db:seed

echo "✅ Development environment setup complete!"
echo "📖 Next steps:"
echo "   1. Run 'npm install' to install dependencies"
echo "   2. Run 'npm run dev' to start development server"
echo "   3. Visit http://localhost:3000 to verify setup"
```

### Step 3: Backup and Recovery (Day 5)

1. **Database Backup Script**
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_NAME="aix_survey"

echo "📦 Creating database backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database schema
pg_dump --schema-only --no-owner --no-privileges $DB_NAME > "$BACKUP_DIR/schema_$TIMESTAMP.sql"

# Backup database data
pg_dump --data-only --no-owner --no-privileges $DB_NAME > "$BACKUP_DIR/data_$TIMESTAMP.sql"

# Backup full database
pg_dump --no-owner --no-privileges $DB_NAME > "$BACKUP_DIR/full_$TIMESTAMP.sql"

# Compress backups
gzip "$BACKUP_DIR/schema_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/data_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/full_$TIMESTAMP.sql"

echo "✅ Database backup complete: $BACKUP_DIR/"
echo "📋 Backup files:"
ls -la "$BACKUP_DIR/"*$TIMESTAMP*
```

2. **Recovery Procedures**
```markdown
# docs/rollback-procedures.md

## Emergency Rollback Procedures

### Scenario 1: Migration Failure - Return to Current System

**Timeframe**: 15 minutes

1. **Stop New Services**
   ```bash
   docker-compose down
   ```

2. **Restore Database**
   ```bash
   gunzip backups/full_[timestamp].sql.gz
   psql aix_survey < backups/full_[timestamp].sql
   ```

3. **Switch DNS/Load Balancer**
   - Point traffic back to original deployment
   - Verify health checks pass

4. **Verify System**
   - Run smoke tests
   - Check all critical paths
   - Monitor error rates

### Scenario 2: Partial Migration Issues

1. **Identify Failed Component**
2. **Roll Back Specific Service** 
3. **Update Load Balancer Rules**
4. **Monitor and Validate**

### Scenario 3: Data Corruption

1. **Stop All Services Immediately**
2. **Assess Corruption Scope**
3. **Restore from Latest Backup**
4. **Replay Recent Transactions (if possible)**
5. **Validate Data Integrity**

### Emergency Contacts

- **Technical Lead**: [Contact]
- **Database Admin**: [Contact]  
- **DevOps Lead**: [Contact]
- **Product Owner**: [Contact]
```

### Step 4: Monitoring and Logging (Day 6)

1. **Monitoring Setup**
```yaml
# monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

volumes:
  grafana-storage:
```

2. **Logging Configuration**
```typescript
// libs/monitoring/src/logger.ts
import winston from 'winston';
import { LokiTransport } from 'winston-loki';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'unknown',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console(),
    new LokiTransport({
      host: process.env.LOKI_HOST || 'http://localhost:3100'
    })
  ],
});

export { logger };
```

### Step 5: Team Documentation (Day 7)

1. **Migration Guide**
```markdown
# docs/migration-guide.md

## NX Monorepo Migration Guide

### Overview
This guide walks through the complete migration process from Next.js monolith to NX monorepo with NestJS backend.

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- PostgreSQL client tools
- Basic NX and NestJS knowledge

### Phase-by-Phase Guide

#### Phase 01: Infrastructure (CURRENT)
- Team training completed ✅
- Infrastructure setup ✅ 
- Backup procedures tested ✅
- Monitoring configured ✅

#### Phase 02: NX Workspace Setup
- [Detailed steps for Phase 02]

#### [Additional phases...]

### Troubleshooting

#### Common Issues
1. **NX Command Not Found**
   - Solution: Install NX globally: `npm install -g @nrwl/nx`

2. **Database Connection Issues**  
   - Check PostgreSQL service status
   - Verify connection string
   - Test with psql client

3. **Docker Build Failures**
   - Clear Docker cache: `docker system prune`
   - Check Dockerfile syntax
   - Verify base image availability

### Emergency Procedures
- See [Rollback Procedures](./rollback-procedures.md)
- Contact emergency team if critical issues
```

## Todo List

### Team Preparation
- [ ] Schedule NestJS training sessions (2 days)
- [ ] Schedule NX workspace training (1 day)  
- [ ] Create training materials and examples
- [ ] Assign training completion deadlines
- [ ] Set up practice environment for hands-on learning
- [ ] Evaluate team readiness after training

### Infrastructure Setup
- [ ] Create staging environment configuration
- [ ] Set up enhanced CI/CD pipeline
- [ ] Configure monitoring and logging
- [ ] Test backup and recovery procedures
- [ ] Create development setup scripts
- [ ] Document infrastructure architecture

### Environment Configuration  
- [ ] Prepare staging environment
- [ ] Configure environment variables
- [ ] Set up database connections
- [ ] Test service communication
- [ ] Validate security configurations
- [ ] Create environment-specific configs

### Documentation
- [ ] Write comprehensive migration guide
- [ ] Create rollback procedures
- [ ] Document troubleshooting steps
- [ ] Set up team communication protocols
- [ ] Create emergency contact list
- [ ] Review and approve all documentation

### Quality Assurance
- [ ] Test all infrastructure components
- [ ] Validate backup and recovery procedures
- [ ] Verify monitoring and alerting
- [ ] Check security configurations
- [ ] Performance test staging environment
- [ ] Conduct team readiness review

## Success Criteria

1. **Team Readiness**
   - All developers complete NestJS training
   - All developers complete NX training  
   - Team demonstrates competency in new tools
   - Training feedback positive

2. **Infrastructure Ready**
   - Staging environment operational
   - CI/CD pipeline tested and working
   - Monitoring and logging functional
   - All environments secured properly

3. **Procedures Documented**
   - Migration guide complete and reviewed
   - Rollback procedures tested
   - Emergency procedures documented
   - Team communication protocols established

4. **Risk Mitigation**
   - Backup procedures tested successfully
   - Recovery time meets requirements (<1 hour)
   - All failure scenarios documented
   - Emergency team contacts confirmed

## Risk Assessment

**Team Readiness Risks**:
- **MEDIUM**: Learning curve steeper than expected
- **LOW**: Team availability for training sessions
- **LOW**: Resistance to new technologies

**Infrastructure Risks**:
- **MEDIUM**: Staging environment complexity
- **LOW**: CI/CD pipeline configuration issues
- **LOW**: Monitoring setup difficulties

**Timeline Risks**:  
- **MEDIUM**: Training taking longer than planned
- **LOW**: Infrastructure setup delays
- **LOW**: Documentation taking extra time

**Mitigation**:
- Buffer time built into training schedule
- Expert consultant available if needed
- Parallel work streams where possible
- Daily check-ins to track progress

## Security Considerations

**Environment Security**:
- All staging credentials unique and secure
- Environment variables properly managed
- Network access controls implemented
- Database connections encrypted

**CI/CD Security**:
- Secrets management in GitHub Actions
- Limited access permissions
- Audit trail for all deployments
- Secure container registry access

**Backup Security**:
- Encrypted backup storage
- Access controls on backup files
- Secure transfer mechanisms
- Regular backup integrity testing

## Next Steps

1. **Immediate**: Begin team training on NestJS fundamentals
2. **Day 2**: Start infrastructure setup in parallel
3. **Day 5**: Complete backup procedure testing
4. **Day 7**: Final team readiness assessment
5. **Week 2**: Begin Phase 02 (NX Workspace Setup)

**Critical Path**: Team training must be completed before technical phases begin.

**Success Gate**: All success criteria must be met before proceeding to Phase 02.