#!/bin/sh
# backend/scripts/docker-entrypoint.sh
# Runs migrations and seed on first boot, then starts the server

set -e

# Determine database host - can be overridden via DB_HOST env var
# Docker compose uses 'postgres', local podman might use 'testtool-postgres'
DB_HOST=${DB_HOST:-postgres}

echo "Waiting for database to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if PGPASSWORD=postgres psql -h "$DB_HOST" -U postgres -d testtool -c "SELECT 1" > /dev/null 2>&1; then
    echo "Database is ready!"
    break
  fi
  attempt=$((attempt + 1))
  echo "Waiting for database... ($attempt/$max_attempts)"
  sleep 2
done

if [ $attempt -ge $max_attempts ]; then
  echo "Database not available after $max_attempts attempts"
  exit 1
fi

echo "Running database migrations..."
DATABASE_URL="postgresql://postgres:postgres@$DB_HOST:5432/testtool" DATABASE_POOL_URL="postgresql://postgres:postgres@$DB_HOST:5432/testtool" npx prisma migrate deploy

echo "Checking if seed is needed..."
admin_count=$(PGPASSWORD=postgres psql -h "$DB_HOST" -U postgres -d testtool -t -c "SELECT COUNT(*) FROM users WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | tr -d ' ' | tr -d '\n')

if [ -z "$admin_count" ] || [ "$admin_count" = "0" ]; then
  echo "Running database seed..."
  DATABASE_URL="postgresql://postgres:postgres@$DB_HOST:5432/testtool" DATABASE_POOL_URL="postgresql://postgres:postgres@$DB_HOST:5432/testtool" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" npx prisma db seed
else
  echo "Database already seeded, skipping..."
fi

echo "Starting TestTool backend..."
exec node dist/index.js
