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

## Setup Environment

```bash
# Copy environment template
cp ../.env.local .env.local
```

The frontend needs only 3 variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `FRONTEND_URL` - Frontend URL
- `UI_DEFAULT_THEME` - Default theme (dark/light/system)

## Run Development Server

```bash
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Note: The first time you access, it will redirect to `/pt-BR` (Portuguese locale).

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

## Docker/Podman Deployment

### Build Image

```bash
podman build -t testtool-frontend:latest .
```

### Run Container

```bash
podman run -d \
  --name testtool-frontend \
  -p 3000:3000 \
  --env-file .env.local \
  testtool-frontend:latest
```
