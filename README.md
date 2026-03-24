# TestTool - Test Case Management System

TestTool is a comprehensive test case management platform designed to help development and QA teams organize, track, and execute their testing workflows efficiently. The system provides a centralized hub for managing test plans, test suites, test cases, and execution results.

With TestTool, teams can create structured test hierarchies, track execution progress, manage bugs, and maintain detailed audit logs of all testing activities. The platform supports both manual and automated testing workflows, making it suitable for projects of any size.

## Key Benefits

- **Centralized Test Management**: Organize test cases into logical test suites and plans
- **Execution Tracking**: Track test runs, results, and historical trends
- **Team Collaboration**: Role-based access control ensures proper permissions
- **Bug Integration**: Link test failures directly to bug reports
- **Audit Trail**: Complete history of all changes and actions

## Features

- **Authentication & Authorization**
  - OAuth2 integration (GitHub, Google, Microsoft)
  - Local authentication with JWT + refresh tokens
  - Role-based access control (RBAC)
  - Password policy enforcement
  - Account lockout protection

- **Test Management**
  - Test Plans with customizable statuses
  - Test Suites for organizing test cases
  - Test Cases with priorities and types
  - Test Execution tracking
  - Bug tracking with severity and priority

- **Integrations**
  - Jira for issue tracking and project management
  - GitHub/GitLab for repository integration and PR-linked testing
  - Confluence for documentation linking
  - Jenkins CI/CD for automated test triggers
  - GitHub Actions for CI/CD pipeline integration
  - Webhook support for custom integrations

- **Additional Features**
  - Custom fields support
  - File attachments
  - Audit logging
  - Automated backups

## Tech Stack

- **Backend**: Node.js + Fastify + TypeScript + Prisma
- **Frontend**: Next.js + React + TypeScript
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis
- **Container**: Podman/Docker

## Prerequisites

- Node.js 22+
- Podman or Docker
- PostgreSQL 16+ (or use containers)
- Redis 7+

## Project Structure

```
testtool/
├── backend/
│   ├── prisma/              # Database schema & migrations
│   ├── src/
│   │   ├── infrastructure/   # Database, external services
│   │   ├── interfaces/       # HTTP routes, plugins, middleware
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   └── tests/               # Integration tests
├── frontend/                # Next.js application
├── docker-compose.yml       # Container orchestration
└── .env                     # Environment variables
```

## Quick Start

### 1. Clone and Setup Environment

```bash
git clone <repository-url>
cd testtool
cp .env.example .env  # Or create .env from the template below
```

### 2. Start Infrastructure (PostgreSQL + Redis)

```bash
# Using docker compose (requires docker running)
docker compose --profile local-db up -d

# Or using podman directly
podman network create testtool-internal
podman run -d --name testtool-postgres \
  --network testtool-internal \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=testtool \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

podman run -d --name testtool-redis \
  --network testtool-internal \
  -v redis_data:/data \
  redis:7-alpine redis-server --appendonly yes
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create database migrations
npx prisma migrate dev --name init

# Seed the database
npx prisma db seed
# or
npm run db:seed

# Build the application
npm run build

# Run in development
npm run dev

# Or run in production (after building)
node dist/index.js
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
npm start
```

### 5. Using Docker/Podman (Full Stack)

```bash
# Build images
cd backend && podman build -t testtool-backend:latest .
cd ../frontend && podman build -t testtool-frontend:latest .

# Run all services
podman network create testtool-internal testtool-public

podman run -d --name testtool-postgres \
  --network testtool-internal \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=testtool \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

podman run -d --name testtool-redis \
  --network testtool-internal \
  -v redis_data:/data \
  redis:7-alpine

podman run -d --name testtool-backend \
  --network testtool-internal \
  -p 3001:3001 \
  --env-file .env \
  testtool-backend:latest

podman run -d --name testtool-frontend \
  --network testtool-public \
  -p 3000:3000 \
  --env-file .env \
  testtool-frontend:latest
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ─── Database ───────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/testtool
DATABASE_POOL_URL=postgresql://postgres:postgres@localhost:5432/testtool
SHADOW_DATABASE_URL=

# ─── Redis ───────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Auth ────────────────────────────────────────────────────────────────────
AUTH_MODE=local
ALLOW_REGISTRATION=false
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_KEY=32-byte-hex-key-for-aes-256-gcm-encryption

# ─── OAuth2 providers (optional) ───────────────────────────────────────────────
OAUTH_GITHUB_CLIENT_ID=your-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
OAUTH_MICROSOFT_CLIENT_ID=your-microsoft-client-id
OAUTH_MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# ─── First-boot admin ────────────────────────────────────────────────────────
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=changeme123!

# ─── File Storage ────────────────────────────────────────────────────────────
STORAGE_PROVIDER=local
STORAGE_PATH=/data/uploads

# ─── Frontend ────────────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# ─── Password Policy ─────────────────────────────────────────────────────────
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_SYMBOL=true

# ─── Account Lockout ─────────────────────────────────────────────────────────
LOCKOUT_MAX_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
```

### Container-specific DATABASE_URL

When running in containers, use the service name instead of `localhost`:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/testtool
REDIS_URL=redis://redis:6379
```

## API Documentation

Once the backend is running, access the Swagger UI at:

```
http://localhost:3001/docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/register` | Register new user (if enabled) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/profile` | Get current user profile |
| PATCH | `/api/v1/profile` | Update profile |
| GET | `/api/v1/admin/users` | List all users (admin only) |

## Default Credentials

After seeding, the default admin user is:

- **Email**: `admin@company.com`
- **Password**: `changeme123!`

## Development

### Running Tests

```bash
cd backend
npm test
```

### Database Commands

```bash
# Run migrations
npx prisma migrate dev --name <migration-name>

# Apply migrations to production
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Seed database
npx prisma db seed
```

### Container Management

```bash
# Stop all containers
podman stop $(podman ps -aq)

# Remove all containers
podman rm $(podman ps -aq)

# View logs
podman logs -f testtool-backend
```

## Troubleshooting

### Database Connection Issues

Ensure DATABASE_URL uses the correct host:
- **Local development**: `localhost`
- **Docker/Podman**: Service name (`postgres`)

### Podman Machine Not Running

```bash
podman machine stop
podman machine start
```

### Clean Reset

```bash
# Remove containers and volumes
podman stop $(podman ps -aq)
podman rm $(podman ps -aq)
podman volume rm postgres_data redis_data

# Fresh start
podman run -d --name testtool-postgres ...
```

## License

MIT License

Copyright (c) 2026 TestTool

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Created by**: dotch3@gmail.com
