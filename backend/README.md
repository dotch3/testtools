# Backend - TestTool API

Fastify-based REST API for TestTool, built with TypeScript and Prisma ORM.

## Stack

- **Runtime**: Node.js 22
- **Framework**: Fastify 5
- **ORM**: Prisma 6
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7

## Prerequisites

- Node.js 22+
- PostgreSQL 16+ (or Docker/Podman)
- Redis 7+ (or Docker/Podman)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file based on the example:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/testtool
DATABASE_POOL_URL=postgresql://postgres:postgres@localhost:5432/testtool
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-at-least-32-chars
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=changeme123!
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed initial data
npx prisma db seed
```

### 4. Run the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

The API will be available at `http://localhost:3001`.

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm test` | Run test suite |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

### Database Commands

```bash
# Create new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset --force

# View database in browser
npx prisma studio
```

### Project Structure

```
src/
├── infrastructure/     # External services (DB, cache, mail)
├── interfaces/         # HTTP layer (routes, plugins, middleware)
├── services/           # Business logic
├── utils/             # Utilities and helpers
├── config.ts          # Environment validation
├── app.ts             # Fastify app factory
└── index.ts           # Entry point
```

## API Documentation

When the server is running, access Swagger UI at:

```
http://localhost:3001/docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout (revoke token) |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| PATCH | `/api/v1/auth/change-password` | Change password (authenticated) |
| GET | `/api/v1/profile` | Get current user profile |
| PATCH | `/api/v1/profile` | Update profile |
| GET | `/api/v1/admin/users` | List all users (admin) |
| GET | `/api/v1/health` | Health check |

### Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <access_token>
```

Tokens expire in 8 hours by default. Use `/auth/refresh` to get new tokens.

## Environment Variables

See `.env.example` for all available options:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DATABASE_POOL_URL` | No | DATABASE_URL | Pooled connection URL |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | 8h | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | 30d | Refresh token expiry |
| `ENCRYPTION_KEY` | Yes | - | 64-char hex key for AES-256-GCM |
| `AUTH_MODE` | No | both | Auth mode: local, oauth, both |
| `ALLOW_REGISTRATION` | No | false | Allow self-registration |
| `ADMIN_EMAIL` | Yes | - | Initial admin email |
| `ADMIN_PASSWORD` | Yes | - | Initial admin password |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Docker

### Build Image

```bash
docker build -t testtool-backend:latest backend/
# or
podman build -t testtool-backend:latest backend/
```

### Run Container

```bash
docker run -d \
  --name testtool-backend \
  --network testtool-network \
  -p 3001:3001 \
  --env-file .env \
  testtool-backend:latest
```

For full-stack deployment, see the [root README](../README.md).
