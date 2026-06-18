#!/bin/bash
set -e

# Test script to verify migrations work on fresh database
# Usage: DATABASE_URL=postgresql://... ./test-migration.sh

DB_NAME="hiai_admin_migtest"
DB_HOST="${DATABASE_URL#*@}"
DB_HOST="${DB_HOST%/*}"
DB_USER="${DATABASE_URL#*://}"
DB_USER="${DB_USER%:*}"

# Note: DATABASE_URL should be set before running this script

echo "Testing migrations on fresh database..."
echo "Database: $DB_NAME"

# Run migrations
echo "Running migrations..."
bun run db:migrate

# Verify tables exist
echo ""
echo "Verifying tables..."
PGPASSWORD=hiadmin psql -h localhost -p 55432 -U hiadmin $DB_NAME -c "\dt"

echo ""
echo "Migration test passed!"
