.PHONY: prod-preview header-check prod-verify prod-down

prod-preview:
	@docker compose -f infra/docker-compose.yml --profile prod up -d --build frontend-prod
	@echo "Prod preview running on http://localhost:8080"

header-check:
	@echo "HTML headers:"
	@curl -si http://localhost:8080/ | grep -Ei 'cache-control|content-security-policy|cross-origin-.*-policy' || true
	@echo ""
	@echo "Asset headers:"
	@ASSET=$$(curl -s http://localhost:8080/ | grep -oE '/assets/[a-zA-Z0-9._-]+\.js' | head -n1); \
	curl -si "http://localhost:8080$$ASSET" | grep -Ei 'cache-control|content-security-policy|cross-origin-.*-policy' || true

prod-verify: prod-preview header-check

prod-down:
	@docker compose -f infra/docker-compose.yml --profile prod down -v
