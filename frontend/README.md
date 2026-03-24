# Frontend - TestTool UI

Next.js-based frontend for TestTool, featuring a modern dark-themed interface.

## Stack

- **Framework**: Next.js 16
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Internationalization**: next-intl
- **Icons**: Lucide React

## Prerequisites

- Node.js 22+
- TestTool Backend running on port 3001

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The frontend expects the API at `http://localhost:3001`. Configure via environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
FRONTEND_URL=http://localhost:3000
UI_DEFAULT_THEME=dark
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/              # Base UI components
│   └── providers/       # Context providers
├── lib/                 # Utilities
└── styles/              # Global styles
```

## Features

### Authentication

- Login with email/password
- OAuth2 integration (GitHub, Google, Microsoft)
- Password reset flow
- Session management

### Theme

Supports dark, light, and system themes. Theme preference is stored per-user.

### Internationalization

The app supports multiple languages via `next-intl`. Default language is Portuguese (Brazil).

## Docker

### Build Image

```bash
docker build -t testtool-frontend:latest frontend/
# or
podman build -t testtool-frontend:latest frontend/
```

### Run Container

```bash
docker run -d \
  --name testtool-frontend \
  -p 3000:3000 \
  --env-file .env \
  testtool-frontend:latest
```

For full-stack deployment, see the [root README](../README.md).
