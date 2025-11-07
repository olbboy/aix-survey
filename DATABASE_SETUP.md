# Database Setup Guide

## Overview

This guide explains how to set up the database for the AI Maturity Assessment Platform.

## Prerequisites

- PostgreSQL 15+ running and accessible
- Database: `aix_survey_db` created
- Connection credentials configured in `.env`

## Database Configuration

Update your `.env` file with the correct database URL:

```env
DATABASE_URL="postgresql://postgres:postgres@YOUR_HOST:5432/aix_survey_db?schema=public"
```

## Setup Methods

There are **3 ways** to set up the database, depending on your environment:

### Method 1: Automatic Setup Script (Recommended)

Run the automated setup script:

```bash
bash scripts/setup-database.sh
```

This script will:
- ✅ Check database connectivity
- ✅ Apply migrations if needed
- ✅ Seed initial data (templates, domains, items)

### Method 2: Via API Endpoint (If app is running)

If the application is already running:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Seed the database via API:
   ```bash
   curl -X POST http://localhost:3000/api/admin/seed
   ```

### Method 3: Manual Migration (If Prisma CLI is blocked)

If Prisma CLI cannot download engines due to network restrictions:

1. Apply migration manually:
   ```bash
   bash scripts/manual-migrate.sh
   ```

2. Seed using the API method above, or wait for Prisma client generation

## Database Schema

The initial migration creates **20 tables**:

### Core Entities
- `organizations` - Multi-tenant organizations
- `users` - User accounts with RBAC (5 roles)
- `accounts` - OAuth provider accounts
- `sessions` - User sessions
- `verifications` - Email verification & password reset

### Assessment System
- `assessment_templates` - Versioned assessment templates
- `domains` - 5 maturity domains
- `items` - 37 assessment items with level 1-5 descriptions
- `assessments` - Assessment instances (draft/finalized)
- `responses` - User responses to items
- `evidences` - Evidence file metadata
- `assessment_snapshots` - Immutable finalized results

### Benchmarking
- `benchmark_data` - Domain-level industry benchmarks
- `benchmark_item_data` - Item-level benchmarks
- `benchmark_snapshots` - Historical trends

### Progress Tracking
- `progress_goals` - Organizational improvement goals
- `progress_milestones` - Goal milestones
- `assessment_history` - Assessment comparison metadata

### System
- `audit_logs` - Complete audit trail
- `email_notifications` - Email delivery tracking

## Initial Data (Seed)

The seed process creates:
- ✅ **1 Assessment Template** (v1.0)
- ✅ **5 Domains**: Dữ liệu, Hạ tầng, Công nghệ, Tổ chức & Đầu tư, Quy định & Chính sách
- ✅ **37 Assessment Items** with Vietnamese and English descriptions

## Verification

Check if the database is properly set up:

### Via SQL
```sql
-- Check templates
SELECT COUNT(*) FROM assessment_templates WHERE "isActive" = true;
-- Should return: 1

-- Check domains
SELECT COUNT(*) FROM domains;
-- Should return: 5

-- Check items
SELECT COUNT(*) FROM items;
-- Should return: 37
```

### Via API
```bash
# Start an assessment (should return 200, not 404)
curl -X POST http://localhost:3000/api/assessments/start \
  -H "Content-Type: application/json" \
  -d '{"industry": "technology", "size": "medium", "region": "VN"}'
```

## Troubleshooting

### Error: "No active template found" (404)

**Cause**: Database is not seeded.

**Solution**: Run Method 1 or Method 2 above.

### Error: "Failed to fetch Prisma engine" (403 Forbidden)

**Cause**: Network restrictions blocking Prisma CLI.

**Solution**: Use Method 3 (Manual Migration).

### Error: "Cannot connect to database"

**Cause**: Database not accessible.

**Solutions**:
1. Check if PostgreSQL is running
2. Verify DATABASE_URL in `.env`
3. Check firewall/VPN settings
4. Ensure database `aix_survey_db` exists

### Database Connection Timeout

**Solutions**:
1. If using remote database (10.162.86.60), ensure VPN is connected
2. Check if IP is whitelisted in database firewall
3. Try using localhost if PostgreSQL is local

## Database Reset (Development Only)

To completely reset the database:

```sql
-- WARNING: This deletes ALL data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then run Method 1 to recreate everything.

## Production Deployment

For production:

1. **Never** use the seed script (it clears existing data in development)
2. Use Prisma migrations:
   ```bash
   npx prisma migrate deploy
   ```
3. Manually create initial template and data via admin interface
4. Set up automated backups
5. Use connection pooling (e.g., PgBouncer)

## Database Migrations

All migrations are in `prisma/migrations/`:

- `20251107_init/` - Initial schema (all 20 tables)

To apply migrations:
```bash
npm run db:migrate
# or if Prisma CLI blocked:
bash scripts/manual-migrate.sh
```

## Support

If you encounter issues:
1. Check logs: `tail -f /tmp/migration_output.log`
2. Verify `.env` configuration
3. Test database connection: `psql -h YOUR_HOST -U postgres -d aix_survey_db`
4. Review this documentation
