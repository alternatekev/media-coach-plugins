# ═══════════════════════════════════════════════════════════════════════
# K10 Media Coach — cross-platform build targets
# ═══════════════════════════════════════════════════════════════════════

.PHONY: build test clean docker-build docker-test setup-refs help

SIMHUB_REFS = lib/simhub-refs
BUILD_OUT   = build-output

# ── Docker targets (recommended for macOS) ──────────────────────────

build: check-refs ## Build plugin DLL via Docker
	@mkdir -p $(BUILD_OUT)
	docker compose run --rm build
	@echo ""
	@echo "✔ Build output: $(BUILD_OUT)/K10MediaCoach.Plugin.dll"

test: ## Run unit tests via Docker
	docker compose run --rm test

docker-build: ## Rebuild Docker image (after Dockerfile changes)
	docker compose build --no-cache

# ── Validation ──────────────────────────────────────────────────────

check-refs: ## Verify SimHub reference DLLs are vendored
	@if [ ! -f "$(SIMHUB_REFS)/SimHub.Plugins.dll" ]; then \
		echo ""; \
		echo "╔══════════════════════════════════════════════════════════════╗"; \
		echo "║  SimHub reference DLLs not found!                          ║"; \
		echo "║                                                            ║"; \
		echo "║  Copy these 5 DLLs from your SimHub install directory      ║"; \
		echo "║  (C:\\Program Files (x86)\\SimHub\\) into lib/simhub-refs/:  ║"; \
		echo "║                                                            ║"; \
		echo "║    • GameReaderCommon.dll                                   ║"; \
		echo "║    • SimHub.Plugins.dll                                     ║"; \
		echo "║    • SimHub.Logging.dll                                     ║"; \
		echo "║    • log4net.dll                                            ║"; \
		echo "║    • Newtonsoft.Json.dll                                    ║"; \
		echo "║                                                            ║"; \
		echo "║  See lib/simhub-refs/README.md for details.                ║"; \
		echo "╚══════════════════════════════════════════════════════════════╝"; \
		echo ""; \
		exit 1; \
	fi

clean: ## Remove build artifacts
	rm -rf $(BUILD_OUT)
	docker compose down --rmi local 2>/dev/null || true

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
