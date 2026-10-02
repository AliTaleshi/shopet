#!/usr/bin/env bash
# Runs every test layer: backend (Testcontainers), frontend (Vitest) and end-to-end (Playwright on docker compose).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Backend tests"
(cd backend && ./mvnw -B -q test)

echo "==> Frontend tests"
(cd frontend && npm ci --no-audit --no-fund --silent && npx tsc -p tsconfig.app.json --noEmit && npx vitest run)

echo "==> Starting the stack"
docker compose up -d --build --wait

echo "==> End-to-end tests"
(cd e2e && npm ci --no-audit --no-fund --silent && npx playwright test)
