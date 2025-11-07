# AI Maturity Self-Assessment Platform

> Enterprise-grade platform for assessing AI maturity across 5 domains with 37 assessment items.

## 🎯 Overview

This platform enables organizations to evaluate their AI maturity level across:
- **Data** (9 items): Data quality, accessibility, governance
- **Infrastructure** (3 items): Computing power, storage, cloud scalability
- **Technology** (6 items): AI/ML tools, model deployment, monitoring
- **Organization & Investment** (14 items): Strategy, talent, culture, budget
- **Policy & Governance** (5 items): Policies, compliance, ethics, risk management

## ✨ Key Features

### MVP (Current)
- ✅ **Guest Assessment Flow**: Start assessment without login, auto-save drafts
- ✅ **Assessment Builder**: Admin CRUD for templates, domains, and items
- ✅ **Scoring Engine**: Automated scoring with maturity level classification
- ✅ **Results Dashboard**: Radar charts, domain breakdowns, gap analysis
- ✅ **Evidence Upload**: Secure file storage with checksum verification
- ✅ **Export**: PDF and CSV reports
- ✅ **RBAC**: 5 roles (Owner, Admin, Reviewer, Respondent, Viewer)
- ✅ **Audit Logging**: Complete audit trail
- ✅ **SSO**: OpenID Connect support

### Maturity Levels
- **1.0-1.5**: Sơ khai (Initial)
- **1.6-2.5**: Khởi đầu (Beginning)
- **2.6-3.5**: Phát triển (Developing)
- **3.6-4.5**: Trưởng thành (Mature)
- **4.6-5.0**: Tối ưu (Optimized)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis (draft autosave, sessions)
- **Storage**: S3-compatible (evidence files)
- **Auth**: NextAuth.js v5 (email/password, magic link, OIDC/SAML)

### Key Design Patterns
- Multi-tenant architecture with row-level security
- Immutable snapshots for finalized assessments
- Event-driven audit logging
- Optimistic UI updates with autosave

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd aix-survey
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Start local services**
```bash
docker-compose up -d
```

5. **Run database migrations**
```bash
npm run db:migrate
```

6. **Seed initial data** (37 assessment items)
```bash
npm run db:seed
```

7. **Start development server**
```bash
npm run dev
```

8. **Open browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
aix-survey/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Seed script
│   └── seed/
│       └── assessment-data.ts     # 37 assessment items
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/             # Public routes (guest assessment)
│   │   ├── (dashboard)/          # Protected routes
│   │   └── api/                  # API routes
│   ├── components/               # React components
│   ├── lib/                      # Utilities & business logic
│   │   ├── db/                  # Prisma client
│   │   ├── auth/                # Auth utilities
│   │   ├── scoring/             # Scoring engine
│   │   └── export/              # PDF/CSV export
│   └── types/                    # TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docker-compose.yml            # Local dev stack
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

## 📊 Database Schema

### Core Entities
- **Organization**: Multi-tenant support
- **User**: RBAC with 5 roles
- **AssessmentTemplate**: Versioned templates
- **Domain**: 5 domains (data, infra, tech, org, policy)
- **Item**: 37 assessment items with level 1-5 descriptions
- **Assessment**: Draft or finalized assessments
- **Response**: User answers (score 1-5 + evidence)
- **Evidence**: File metadata with checksums
- **AssessmentSnapshot**: Immutable finalized results
- **AuditLog**: Complete audit trail
- **BenchmarkData**: Anonymous industry comparisons

### Key Relationships
```
Organization → User → Assessment → Response → Evidence
AssessmentTemplate → Domain → Item
Assessment → AssessmentSnapshot (immutable)
```

## 🔒 Security

### Implemented
- ✅ TLS 1.3 in production
- ✅ OWASP security headers
- ✅ CSRF protection (NextAuth)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS prevention (React auto-escaping)
- ✅ Rate limiting (login attempts)
- ✅ Row-level security (tenant isolation)
- ✅ Evidence file validation (MIME, size, checksum)
- ✅ Audit logging (immutable)

### Compliance
- GDPR: Data minimization, DSAR support, retention policies
- PDPA (VN): Data localization options
- ISO 27001 / SOC 2 ready

## 📈 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Page Load (p95) | < 2.5s | ✅ |
| Autosave (p95) | < 200ms | ✅ |
| TTFB (p95) | < 300ms | ✅ |
| Concurrent Users | 5,000/tenant | ⏳ |
| DB Query (p95) | < 100ms | ✅ |
| Export PDF (50 pages) | < 8s | ⏳ |

## 🛠️ Development

### Available Scripts
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production server
npm run lint             # Lint code
npm run type-check       # TypeScript check
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
npm test                 # Run tests
```

### Database Management
```bash
# Create migration
npx prisma migrate dev --name <migration-name>

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npm run db:studio
```

## 🚢 Deployment

### Environment Variables
See `.env.example` for required configuration.

### Production Checklist
- [ ] Set secure `NEXTAUTH_SECRET`
- [ ] Configure production database
- [ ] Setup Redis for sessions
- [ ] Configure S3 for evidence storage
- [ ] Enable SSO (OIDC/SAML)
- [ ] Setup monitoring (Prometheus, Grafana)
- [ ] Enable audit logging
- [ ] Configure backups (RPO ≤ 1h, RTO ≤ 1h)

## 📚 Documentation

- [Architecture Design](./ARCHITECTURE.md) - System architecture and design decisions
- [API Documentation](./docs/API.md) - REST API reference (coming soon)
- [User Guide](./docs/USER_GUIDE.md) - End-user documentation (coming soon)
- [Admin Guide](./docs/ADMIN_GUIDE.md) - Administrator documentation (coming soon)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Run linting and tests
5. Submit a pull request

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues and questions, please contact the development team.

---

**Version**: 1.0.0-MVP
**Last Updated**: 2025-11-07
