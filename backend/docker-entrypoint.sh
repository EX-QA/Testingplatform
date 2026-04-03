#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "${DB_NAME:-testhub}" -c '\q' 2>/dev/null; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Attempt $attempt/$max_attempts: PostgreSQL not ready, waiting..."
    attempt=$((attempt + 1))
    sleep 2
done

if [ $attempt -gt $max_attempts ]; then
    echo "ERROR: PostgreSQL did not become ready in time"
    exit 1
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node dist/index.js
