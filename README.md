# TestTool - Test Case Management System

A comprehensive platform for managing test cases, test plans, test suites, and execution workflows. Designed for development and QA teams.

## About

TestTool helps teams:
- Organize test cases into logical test suites and plans
- Track test execution progress and results
- Manage bugs linked to test failures
- Maintain audit logs of all activities
- Integrate with CI/CD pipelines and external tools

## Features

### Authentication
- OAuth2 (GitHub, Google, Microsoft)
- Local authentication with JWT
- Role-based access control (RBAC)
- Password policy enforcement

### Test Management
- Test Plans with customizable statuses
- Hierarchical Test Suites
- Test Cases with priorities and types
- Execution tracking and history
- Bug tracking with severity levels

### Integrations
- Jira, GitHub, GitLab
- Jenkins, GitHub Actions
- Confluence
- Webhooks

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Fastify, TypeScript |
| Frontend | Next.js, React, TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| ORM | Prisma |

## Quick Start (Containers)

The fastest way to get started. Everything is automatic - database, migrations, and seed are handled on first boot:

```bash
# Clone the repository
git clone <repository-url>
cd testtool

# Copy environment file (already configured for containers)
cp .env.example .env

# Build and run everything
docker compose --profile local-db up -d
# or
podman compose --profile local-db up -d
```

The backend automatically:
1. Waits for database to be ready
2. Runs migrations (if needed)
3. Seeds initial data (if needed)
4. Starts the server

On subsequent starts, it skips migrations and seed - just starts the server.

Wait for services to start (about 30 seconds), then access:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/docs

### Default Credentials

```
Email:    admin@company.com
Password: changeme123!
```

## Local Development

For development with hot reload:

### Backend

See [backend/README.md](backend/README.md) for detailed instructions.

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### Frontend

See [frontend/README.md](frontend/README.md) for detailed instructions.

```bash
cd frontend
npm install
npm run dev
```

## Documentation

| Document | Description |
|----------|-------------|
| [Main README](README.md) | This file - overview and quick start |
| [Backend README](backend/README.md) | API setup, development, endpoints |
| [Frontend README](frontend/README.md) | UI setup and features |
| [Architecture](docs/diagrams/architecture-diagram.md) | System architecture (Mermaid) |
| [ER Diagram](docs/diagrams/er-diagram.md) | Database schema |
| [Class Diagram](docs/diagrams/class-diagram.md) | Service classes |

## API Reference

Full API documentation available via Swagger UI at `http://localhost:3001/docs` when the backend is running.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/profile` | User profile |
| GET | `/api/v1/admin/users` | List users (admin) |

## Deployment Options

### Full-Local (On-Premise)
Uses Docker/Podman with local PostgreSQL and Redis.

```bash
docker compose --profile local-db up -d
```

### Cloud Database
Use external PostgreSQL (Supabase, Neon, RDS):

```bash
docker compose up -d
```

### Storage
- **Local**: File system storage (default)
- **Supabase Storage**: Set `STORAGE_PROVIDER=supabase`
- **S3**: Set `STORAGE_PROVIDER=s3`

## Environment Variables

Essential variables for `.env`:

```env
# Database (use service names in containers)
DATABASE_URL=postgresql://user:pass@host:5432/testtool
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=your-secret-key-at-least-32-characters
ENCRYPTION_KEY=64-char-hex-key

# Admin (first boot)
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=changeme123!
```

See `.env.example` for all options.

## Troubleshooting

### Database Connection
- **Local**: Use `localhost`
- **Container**: Use service name (`postgres`, not `localhost`)

### Podman Machine
```bash
podman machine stop
podman machine start
```

### Clean Reset
```bash
docker compose down -v  # Removes volumes
docker compose --profile local-db up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Created by**: dotch3@gmail.com
