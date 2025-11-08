#!/bin/bash

# Development Environment Setup Script
# Prepares local environment for NX Monorepo Migration
# Checks prerequisites, installs dependencies, configures services

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/setup-$(date +%Y%m%d_%H%M%S).log"

# Ensure logs directory exists
mkdir -p "${PROJECT_ROOT}/logs"

# ===================================================================
# LOGGING FUNCTIONS
# ===================================================================

log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "${BLUE}ℹ️  ${1}${NC}"
}

log_success() {
    log "${GREEN}✅ ${1}${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  ${1}${NC}"
}

log_error() {
    log "${RED}❌ ${1}${NC}"
}

# ===================================================================
# PREREQUISITE CHECKS
# ===================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    local all_good=true

    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_NODE="20.0.0"

        if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
            log_success "Node.js version: v${NODE_VERSION}"
        else
            log_error "Node.js 20+ required. Current: v${NODE_VERSION}"
            all_good=false
        fi
    else
        log_error "Node.js not found. Install Node.js 20+ from https://nodejs.org"
        all_good=false
    fi

    # Check npm version
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm version: ${NPM_VERSION}"
    else
        log_error "npm not found"
        all_good=false
    fi

    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        log_success "Docker version: ${DOCKER_VERSION}"
    else
        log_warning "Docker not found (optional but recommended)"
    fi

    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)
        log_success "Docker Compose version: ${COMPOSE_VERSION}"
    else
        log_warning "Docker Compose not found (optional but recommended)"
    fi

    # Check PostgreSQL client
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version | cut -d' ' -f3)
        log_success "PostgreSQL client version: ${PSQL_VERSION}"
    else
        log_warning "PostgreSQL client (psql) not found (optional)"
    fi

    # Check Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        log_success "Git version: ${GIT_VERSION}"
    else
        log_error "Git not found"
        all_good=false
    fi

    if [ "$all_good" = false ]; then
        log_error "Prerequisites check failed. Please install missing dependencies."
        exit 1
    fi

    log_success "All required prerequisites are installed"
}

# ===================================================================
# GLOBAL TOOLS INSTALLATION
# ===================================================================

install_global_tools() {
    log_info "Installing global development tools..."

    # Install NX CLI globally
    if ! command -v nx &> /dev/null; then
        log_info "Installing NX CLI globally..."
        npm install -g nx@latest
        log_success "NX CLI installed"
    else
        NX_VERSION=$(nx --version 2>/dev/null || echo "unknown")
        log_success "NX CLI already installed (version: ${NX_VERSION})"
    fi

    # Install NestJS CLI globally
    if ! command -v nest &> /dev/null; then
        log_info "Installing NestJS CLI globally..."
        npm install -g @nestjs/cli@latest
        log_success "NestJS CLI installed"
    else
        NEST_VERSION=$(nest --version 2>/dev/null || echo "unknown")
        log_success "NestJS CLI already installed (version: ${NEST_VERSION})"
    fi

    # Install Prisma CLI globally (optional)
    if ! command -v prisma &> /dev/null; then
        log_info "Installing Prisma CLI globally..."
        npm install -g prisma@latest
        log_success "Prisma CLI installed"
    else
        log_success "Prisma CLI already installed"
    fi
}

# ===================================================================
# ENVIRONMENT CONFIGURATION
# ===================================================================

setup_environment() {
    log_info "Setting up environment configuration..."

    cd "${PROJECT_ROOT}"

    # Create .env.local if it doesn't exist
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            log_info "Creating .env.local from .env.example..."
            cp .env.example .env.local
            log_success ".env.local created"
            log_warning "IMPORTANT: Update .env.local with your actual credentials!"
        else
            log_warning ".env.example not found. Creating minimal .env.local..."
            cat > .env.local << EOF
# Local Development Environment
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aix_survey_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
EOF
            log_success "Minimal .env.local created"
        fi
    else
        log_success ".env.local already exists"
    fi

    # Create .env.staging if staging example exists
    if [ -f ".env.staging.example" ] && [ ! -f ".env.staging" ]; then
        log_info "Creating .env.staging from .env.staging.example..."
        cp .env.staging.example .env.staging
        log_success ".env.staging created"
        log_warning "IMPORTANT: Update .env.staging with your staging credentials!"
    fi
}

# ===================================================================
# PROJECT DEPENDENCIES
# ===================================================================

install_dependencies() {
    log_info "Installing project dependencies..."

    cd "${PROJECT_ROOT}"

    # Clean install for consistency
    if [ -d "node_modules" ]; then
        log_info "Removing existing node_modules..."
        rm -rf node_modules
    fi

    if [ -f "package-lock.json" ]; then
        log_info "Running npm ci (clean install)..."
        npm ci
    else
        log_info "Running npm install..."
        npm install
    fi

    log_success "Dependencies installed successfully"
}

# ===================================================================
# DATABASE SETUP
# ===================================================================

setup_database() {
    log_info "Setting up database..."

    cd "${PROJECT_ROOT}"

    # Check if Docker is running
    if command -v docker &> /dev/null && docker ps &> /dev/null; then
        log_info "Starting database services with Docker Compose..."

        if [ -f "docker-compose.yml" ]; then
            docker-compose up -d postgres redis
            log_success "Database services started"

            # Wait for PostgreSQL to be ready
            log_info "Waiting for PostgreSQL to be ready..."
            sleep 5

            for i in {1..30}; do
                if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
                    log_success "PostgreSQL is ready"
                    break
                fi

                if [ $i -eq 30 ]; then
                    log_error "PostgreSQL failed to start within timeout"
                    exit 1
                fi

                sleep 1
            done
        else
            log_warning "docker-compose.yml not found. Skipping Docker database setup."
        fi
    else
        log_warning "Docker not available. Please start PostgreSQL and Redis manually."
    fi

    # Run Prisma migrations
    if [ -f "prisma/schema.prisma" ]; then
        log_info "Running Prisma migrations..."
        npx prisma migrate dev --name init || log_warning "Migrations may have already been applied"

        log_info "Generating Prisma client..."
        npx prisma generate

        log_success "Database migrations completed"
    else
        log_warning "Prisma schema not found. Skipping migrations."
    fi
}

# ===================================================================
# VERIFICATION
# ===================================================================

verify_setup() {
    log_info "Verifying setup..."

    cd "${PROJECT_ROOT}"

    # Check if build works
    log_info "Running test build..."
    if npm run build &> /dev/null; then
        log_success "Build successful"
    else
        log_warning "Build failed. This is expected before NX migration."
    fi

    # Check database connection
    if command -v psql &> /dev/null; then
        if psql "${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/aix_survey_dev}" -c "SELECT 1" &> /dev/null; then
            log_success "Database connection verified"
        else
            log_warning "Database connection failed. Check DATABASE_URL in .env.local"
        fi
    fi

    # Check Redis connection
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            log_success "Redis connection verified"
        else
            log_warning "Redis connection failed. Ensure Redis is running."
        fi
    fi
}

# ===================================================================
# MAIN EXECUTION
# ===================================================================

main() {
    log_info "🚀 AIX Survey - Development Environment Setup"
    log_info "================================================"
    log_info "Project: NX Monorepo Migration"
    log_info "Date: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "Log file: ${LOG_FILE}"
    log_info "================================================"
    echo ""

    check_prerequisites
    echo ""

    install_global_tools
    echo ""

    setup_environment
    echo ""

    install_dependencies
    echo ""

    setup_database
    echo ""

    verify_setup
    echo ""

    log_success "✨ Development environment setup complete!"
    echo ""
    log_info "================================================"
    log_info "📖 Next Steps:"
    log_info "================================================"
    log_info "1. Update .env.local with your actual credentials"
    log_info "2. Run 'npm run dev' to start development server"
    log_info "3. Visit http://localhost:3000 to verify setup"
    log_info "4. Review the migration plan in plans/"
    echo ""
    log_info "🔧 Useful Commands:"
    log_info "  npm run dev          - Start development server"
    log_info "  npm run build        - Build for production"
    log_info "  npm test             - Run tests"
    log_info "  npx prisma studio    - Open Prisma database GUI"
    log_info "  nx graph             - View dependency graph (after NX setup)"
    echo ""
    log_info "📚 Documentation:"
    log_info "  docs/migration-guide.md - Migration guide"
    log_info "  plans/                  - Migration plans"
    echo ""
    log_success "Happy coding! 🎉"
}

# Run main function
main "$@"
