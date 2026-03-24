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
- PostgreSQL 16+ (local or container)
- Redis 7+ (local or container)

## Setup Environment

```bash
# Copy environment template to this directory
cp ../.env.local .env
```

Or use podman template:
```bash
cp ../.env.podman .env
```

## Database Setup

Make sure PostgreSQL is running, then:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations and seed (creates tables and admin user)
npx prisma migrate dev --name init
```

## Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`.

## Available Scripts

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

## Project Structure

```
src/
├── infrastructure/     # External services (DB, cache, mail)
├── interfaces/         # HTTP layer (routes, plugins, middleware)
├── services/          # Business logic
├── utils/             # Utilities and helpers
├── config.ts          # Environment validation
├── app.ts             # Fastify app factory
└── index.ts          # Entry point
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

## Testing

```bash
npm test
npm run test:watch
```

## Docker/Podman Deployment

### Build Image

```bash
podman build -t testtool-backend:latest .
```

### Run Container

```bash
podman run -d \
  --name testtool-backend \
  --network testtool-internal \
  -p 3001:3001 \
  --env-file .env \
  testtool-backend:latest
```

The container automatically runs migrations and seed on first boot.
