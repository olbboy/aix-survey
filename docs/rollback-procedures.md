# Emergency Rollback Procedures

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Criticality**: HIGH - Read carefully before migration

---

## Table of Contents

1. [Overview](#overview)
2. [When to Rollback](#when-to-rollback)
3. [Rollback Scenarios](#rollback-scenarios)
4. [Step-by-Step Procedures](#step-by-step-procedures)
5. [Verification & Testing](#verification--testing)
6. [Post-Rollback Actions](#post-rollback-actions)

---

## Overview

### Purpose

This document provides **emergency rollback procedures** for the NX monorepo migration. Use these procedures when:

- Migration fails critically
- Data corruption detected
- Performance degradation >50%
- System unavailable >5 minutes
- Critical bugs discovered in production

### Rollback Philosophy

**Priority Order**:
1. **Data integrity** - Prevent data loss at all costs
2. **Service availability** - Restore service quickly
3. **Functionality** - Ensure all features work
4. **Performance** - Return to baseline performance

### Recovery Time Objectives (RTO)

| Scenario | Target RTO | Maximum RTO |
|----------|------------|-------------|
| Scenario 1: Full Rollback | 15 minutes | 30 minutes |
| Scenario 2: Partial Rollback | 10 minutes | 20 minutes |
| Scenario 3: Data Recovery | 30 minutes | 60 minutes |

---

## When to Rollback

### Mandatory Rollback Triggers

Immediately initiate rollback if:

- ❌ **Data corruption detected** in production database
- ❌ **System downtime** exceeds 5 minutes
- ❌ **Critical security vulnerability** introduced
- ❌ **Payment processing** failures
- ❌ **Authentication system** completely broken
- ❌ **Data loss** confirmed (any amount)

### Recommended Rollback Triggers

Consider rollback if:

- ⚠️ **Error rate** >5% of total requests
- ⚠️ **Performance degradation** >50% from baseline
- ⚠️ **Failed health checks** for >3 minutes
- ⚠️ **Database connection** failures >50%
- ⚠️ **Critical feature** completely non-functional

### Decision Matrix

| Issue Severity | User Impact | Action |
|---------------|-------------|--------|
| Critical | High | **ROLLBACK IMMEDIATELY** |
| High | High | **ROLLBACK** after 5 min troubleshooting |
| High | Medium | **ROLLBACK** after 15 min troubleshooting |
| Medium | Low | **FIX FORWARD** (no rollback) |

---

## Rollback Scenarios

### Scenario 1: Full Migration Rollback

**When**: Complete migration failure, return to original Next.js monolith

**Timeframe**: 15-30 minutes

**Impact**:
- ✅ Minimal data loss (recent transactions may be lost)
- ⚠️ Service downtime during rollback
- ✅ All users back to original system

---

### Scenario 2: Partial Migration Rollback

**When**: One service fails, others operational

**Timeframe**: 10-20 minutes

**Impact**:
- ✅ Minimal downtime
- ✅ Partial functionality maintained
- ⚠️ Requires traffic routing changes

---

### Scenario 3: Data Corruption Recovery

**When**: Database corruption detected

**Timeframe**: 30-60 minutes

**Impact**:
- ⚠️ Data loss possible (depends on last backup)
- ❌ Extended downtime
- ⚠️ Manual data reconciliation may be needed

---

## Step-by-Step Procedures

### Scenario 1: Complete Migration Failure

#### Prerequisites
- [ ] Database backup verified and accessible
- [ ] Original code in version control
- [ ] DNS/Load balancer access available
- [ ] Team notifications sent

#### Step 1: Stop New Services (2 minutes)

```bash
# 1.1. Stop all new monorepo services
docker-compose -f docker-compose.staging.yml down

# 1.2. Verify all services stopped
docker ps | grep aix

# 1.3. Stop Kubernetes pods (if deployed to K8s)
# kubectl delete deployment aix-backend
# kubectl delete deployment aix-frontend
```

**Verification**: No aix-* containers running
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

#### Step 2: Restore Database (10 minutes)

```bash
# 2.1. Find latest backup
ls -lth backups/full/ | head -n 5

# 2.2. Verify backup integrity
./scripts/restore-database.sh --list

# 2.3. Create pre-rollback backup (safety)
./scripts/backup-database.sh

# 2.4. Restore from last known good backup
./scripts/restore-database.sh --type full

# 2.5. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

**Verification**: Row counts match expected values
```sql
-- Check critical tables
SELECT
  'users' AS table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'assessments', COUNT(*) FROM "Assessment"
UNION ALL
SELECT 'organizations', COUNT(*) FROM "Organization";
```

---

#### Step 3: Switch Traffic to Original System (3 minutes)

```bash
# 3.1. Update load balancer / reverse proxy
# Point traffic back to original Next.js application

# 3.2. If using Nginx:
sudo cp /etc/nginx/sites-available/aix-survey-original.conf \
        /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 3.3. If using cloud load balancer:
# Update target group to point to original instances

# 3.4. Update DNS (if changed during migration)
# Revert DNS A/CNAME records to original values
```

**Verification**: Traffic routing to original system
```bash
curl -I http://your-domain.com | grep -i server
```

---

#### Step 4: Start Original Application (5 minutes)

```bash
# 4.1. Navigate to original codebase directory
cd /path/to/original/aix-survey

# 4.2. Install dependencies (if needed)
npm ci

# 4.3. Start application
npm run dev   # Development
# OR
npm run build && npm start  # Production

# 4.4. Start supporting services
docker-compose up -d postgres redis
```

**Verification**: Application responding
```bash
# Health check
curl http://localhost:3000/api/health

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

---

#### Step 5: Verify System Functionality (5 minutes)

```bash
# 5.1. Run smoke tests
npm run test:e2e

# 5.2. Manual verification checklist:
```

**Critical Paths to Test**:
- [ ] Homepage loads
- [ ] User login works
- [ ] Assessment creation works
- [ ] Assessment submission works
- [ ] Admin dashboard accessible
- [ ] API endpoints responding
- [ ] Database reads/writes working
- [ ] File uploads working

**Automated Health Checks**:
```bash
# Run comprehensive health checks
./scripts/health-check.sh

# Expected output:
# ✅ Database connection: OK
# ✅ Redis connection: OK
# ✅ API endpoints: OK
# ✅ Authentication: OK
# ✅ File storage: OK
```

---

#### Step 6: Monitor and Notify (Ongoing)

```bash
# 6.1. Monitor error rates
tail -f logs/combined.log | grep ERROR

# 6.2. Monitor application metrics
# Open Grafana dashboard
open http://localhost:3002

# 6.3. Send notifications
```

**Notification Template**:
```
🚨 ROLLBACK COMPLETE

Status: Original system restored
Downtime: XX minutes
Data Loss: [None / XX records / Unknown]

Actions Taken:
1. Stopped new services
2. Restored database from backup
3. Redirected traffic to original system
4. Verified critical functionality

Next Steps:
- Monitor system for 2 hours
- Investigate migration failure
- Schedule post-mortem meeting

Contact: [Your Name] ([Your Contact])
```

---

### Scenario 2: Partial Service Rollback

#### Use Case
- Backend API failing, frontend working
- Frontend issues, backend stable
- One specific microservice problematic

#### Procedure

```bash
# 2.1. Identify failing service
docker-compose logs -f backend  # Check backend logs
docker-compose logs -f frontend # Check frontend logs

# 2.2. Stop failing service only
docker-compose stop backend

# 2.3. Update routing to bypass failed service
# Example: Route API calls to original Next.js API routes

# 2.4. Restart working services if needed
docker-compose restart frontend redis postgres

# 2.5. Verify hybrid system working
curl http://localhost:3000/api/health
```

**Hybrid Configuration Example** (Nginx):
```nginx
# Route frontend to new Next.js app
location / {
    proxy_pass http://new-frontend:3000;
}

# Route API to original Next.js API routes
location /api {
    proxy_pass http://original-nextjs:3000;
}
```

---

### Scenario 3: Data Corruption Recovery

#### Critical Data Corruption Detected

```bash
# 3.1. IMMEDIATELY stop all write operations
docker-compose stop backend frontend

# 3.2. Enable read-only mode on database
psql $DATABASE_URL -c "ALTER DATABASE aix_survey SET default_transaction_read_only = on;"

# 3.3. Assess corruption scope
./scripts/verify-data-integrity.sh

# 3.4. Restore from backup
./scripts/restore-database.sh --file backups/full/full_TIMESTAMP.sql.gz

# 3.5. Replay transactions if possible
# Review application logs for recent write operations
# Manually replay critical transactions

# 3.6. Disable read-only mode
psql $DATABASE_URL -c "ALTER DATABASE aix_survey SET default_transaction_read_only = off;"

# 3.7. Verify data integrity
./scripts/verify-data-integrity.sh
```

**Data Integrity Checks**:
```sql
-- Check for orphaned records
SELECT a.id, a."userId"
FROM "Assessment" a
LEFT JOIN "User" u ON a."userId" = u.id
WHERE a."userId" IS NOT NULL AND u.id IS NULL;

-- Check for missing required fields
SELECT COUNT(*) FROM "User" WHERE email IS NULL OR email = '';

-- Verify referential integrity
SELECT * FROM pg_constraint WHERE contype = 'f';
```

---

## Verification & Testing

### Post-Rollback Verification Checklist

#### System Health
- [ ] All services running (docker-compose ps)
- [ ] No error logs (tail -f logs/*.log)
- [ ] CPU usage normal (<70%)
- [ ] Memory usage normal (<80%)
- [ ] Disk space adequate (>20% free)

#### Application Functionality
- [ ] Homepage accessible
- [ ] User authentication working
- [ ] Assessment CRUD operations
- [ ] File upload/download
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] API endpoints responding

#### Data Integrity
- [ ] User count matches pre-migration
- [ ] Assessment count matches pre-migration
- [ ] No orphaned records
- [ ] Foreign key constraints intact
- [ ] Sample data queries return expected results

#### Performance
- [ ] Page load times <2s
- [ ] API response times <500ms
- [ ] Database query times <100ms
- [ ] No timeout errors
- [ ] Concurrent user handling normal

---

## Post-Rollback Actions

### Immediate Actions (Within 1 Hour)

1. **System Monitoring**
   - Monitor error rates for 2 hours
   - Watch performance metrics
   - Check user reports

2. **Incident Documentation**
   - Record timeline of events
   - Capture error logs
   - Screenshot dashboards

3. **Stakeholder Communication**
   - Notify management
   - Update status page
   - Send user communication if needed

### Short-Term Actions (Within 24 Hours)

1. **Root Cause Analysis**
   - Review migration logs
   - Identify failure point
   - Document lessons learned

2. **Data Reconciliation**
   - Compare pre/post rollback data
   - Identify any data loss
   - Plan recovery if needed

3. **System Hardening**
   - Apply any emergency fixes
   - Update monitoring
   - Improve alerting

### Long-Term Actions (Within 1 Week)

1. **Post-Mortem Meeting**
   - Review what happened
   - Discuss prevention measures
   - Update procedures

2. **Migration Plan Update**
   - Incorporate learnings
   - Add additional safeguards
   - Update timeline

3. **Team Training**
   - Share knowledge
   - Practice rollback procedures
   - Update documentation

---

## Emergency Contacts

| Role | Name | Contact | Responsibility |
|------|------|---------|---------------|
| Technical Lead | TBD | TBD | Overall rollback decision |
| Database Admin | TBD | TBD | Database restoration |
| DevOps Lead | TBD | TBD | Infrastructure rollback |
| Product Owner | TBD | TBD | Stakeholder communication |
| On-Call Engineer | TBD | TBD | 24/7 emergency response |

### Escalation Path

```
Level 1: On-Call Engineer (0-5 min)
    ↓ (if unresolved)
Level 2: Technical Lead (5-15 min)
    ↓ (if unresolved)
Level 3: CTO/VP Engineering (15-30 min)
    ↓ (if critical)
Level 4: CEO (business-critical only)
```

---

## Rollback Testing

### Pre-Migration Rollback Drill

**Objective**: Validate rollback procedures before real migration

**Steps**:
1. Create test migration in staging
2. Simulate failure scenario
3. Execute rollback procedure
4. Measure time taken
5. Verify functionality
6. Document findings
7. Update procedures

**Frequency**: At least once before migration, after any procedure updates

---

## Appendix

### A. Backup Verification Script

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    exit 1
fi

# Verify file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Verify gzip integrity
if gunzip -t "$BACKUP_FILE" 2>&1; then
    echo "✅ Backup file integrity OK"
else
    echo "❌ Backup file is corrupted"
    exit 1
fi

# Check backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "📦 Backup size: $SIZE"

# Extract and check SQL syntax
echo "🔍 Checking SQL syntax..."
gunzip -c "$BACKUP_FILE" | head -n 100 | grep -q "PostgreSQL database dump"
if [ $? -eq 0 ]; then
    echo "✅ Valid PostgreSQL backup"
else
    echo "❌ Invalid backup format"
    exit 1
fi

echo "✅ All checks passed"
```

### B. Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "🏥 Running system health checks..."

# Database check
if psql $DATABASE_URL -c "SELECT 1" &> /dev/null; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: FAILED"
fi

# Redis check
if redis-cli ping &> /dev/null; then
    echo "✅ Redis connection: OK"
else
    echo "❌ Redis connection: FAILED"
fi

# API check
if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    echo "✅ API health: OK"
else
    echo "❌ API health: FAILED"
fi

# Authentication check
if curl -s http://localhost:3000/api/auth/session &> /dev/null; then
    echo "✅ Authentication: OK"
else
    echo "❌ Authentication: FAILED"
fi
```

---

**Document Status**: Production Ready
**Last Reviewed**: 2025-11-08
**Next Review**: Before Phase 02 migration
**Owner**: Engineering Team
