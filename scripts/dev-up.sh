#!/usr/bin/env bash
set -euo pipefail
export COMPOSE_PROJECT_NAME=revline
docker compose --env-file .env.dev -f infra/docker-compose.yml --profile dev down --remove-orphans
docker compose --env-file .env.dev -f infra/docker-compose.yml --profile dev up -d
docker compose -f infra/docker-compose.yml ps
