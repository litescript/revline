#!/usr/bin/env bash
set -euo pipefail
export COMPOSE_PROJECT_NAME=revline
docker compose --env-file .env.prod -f infra/docker-compose.yml --profile prod down --remove-orphans
docker compose --env-file .env.prod -f infra/docker-compose.yml --profile prod up -d --build
docker compose -f infra/docker-compose.yml ps
