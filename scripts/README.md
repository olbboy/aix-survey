# Database Scripts

This directory contains utility scripts for database management.

## Scripts Overview

### 1. `setup-database.sh` 🚀
**Purpose**: Automated database setup (migration + seeding)

**Usage**:
```bash
bash scripts/setup-database.sh
```

**What it does**:
- Checks database connectivity
- Applies migrations if tables don't exist
- Seeds initial data (templates, domains, items)
- Verifies setup completion

**When to use**:
- Initial project setup
- After fresh database creation
- When database is empty

---

### 2. `manual-migrate.sh` 📦
**Purpose**: Apply migrations when Prisma CLI is blocked

**Usage**:
```bash
bash scripts/manual-migrate.sh
```

**What it does**:
- Creates `_prisma_migrations` tracking table
- Applies all SQL migrations from `prisma/migrations/`
- Records migration history
- Skips already-applied migrations

**When to use**:
- Network blocks Prisma engine downloads (403 Forbidden)
- Offline environments
- CI/CD without internet access

---

### 3. `apply-migrations.sh` 📝
**Purpose**: Simple migration application script

**Usage**:
```bash
bash scripts/apply-migrations.sh
```

**What it does**:
- Finds and applies all migration SQL files
- No migration tracking (simpler version)

**When to use**:
- Quick migration testing
- Development environments
- When you don't need migration history

---

### 4. `check-and-seed.ts` 🌱
**Purpose**: Check database status and seed if needed (TypeScript)

**Usage**:
```bash
npx tsx scripts/check-and-seed.ts
```

**What it does**:
- Tests database connection
- Checks if templates exist
- Seeds database if empty
- Shows current data counts

**When to use**:
- After migrations are applied
- To verify database state
- When Prisma client is working

---

## Configuration

All scripts use environment variables from `.env`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db_name?schema=public"
```

For manual scripts, they extract:
- `DB_HOST` - Database server host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASS` - Database password (default: postgres)

## Troubleshooting

### Error: "Cannot connect to database"

**Solutions**:
1. Check if PostgreSQL is running
2. Verify DATABASE_URL in `.env`
3. Test connection:
   ```bash
   psql -h YOUR_HOST -U postgres -d aix_survey_db
   ```
4. Check firewall/VPN

### Error: "Prisma client not initialized"

**Solutions**:
1. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
2. If blocked, use `manual-migrate.sh` instead
3. Or use API seed endpoint (see DATABASE_SETUP.md)

### Error: "Migration already applied"

**This is normal** - scripts skip already-applied migrations automatically.

### Permission Denied

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

## Workflow Examples

### Fresh Database Setup
```bash
# 1. Apply migrations
bash scripts/setup-database.sh

# 2. Verify
psql -h HOST -U postgres -d aix_survey_db -c "SELECT COUNT(*) FROM assessment_templates;"
```

### CI/CD Pipeline
```bash
# In restricted network environment
export DATABASE_URL="postgresql://..."

# Apply migrations without Prisma CLI
bash scripts/manual-migrate.sh

# Seed via API (app must be running)
curl -X POST http://localhost:3000/api/admin/seed
```

### Development Reset
```bash
# Drop all tables
psql -h HOST -U postgres -d aix_survey_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Recreate everything
bash scripts/setup-database.sh
```

## Best Practices

✅ **DO**:
- Run `setup-database.sh` for new installations
- Use `manual-migrate.sh` when Prisma CLI fails
- Keep scripts executable (`chmod +x`)
- Test on development database first

❌ **DON'T**:
- Run seed scripts in production
- Modify migration SQL files after they're applied
- Delete `_prisma_migrations` table
- Run scripts without database backup

## See Also

- [DATABASE_SETUP.md](../DATABASE_SETUP.md) - Complete database setup guide
- [prisma/schema.prisma](../prisma/schema.prisma) - Database schema definition
- [prisma/migrations/](../prisma/migrations/) - Migration files
