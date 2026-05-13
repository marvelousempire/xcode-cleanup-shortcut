Status: shipped (commit ba87ab7, v0.19.5)

# Plan 0003 — Database tier guide for future apps

## Context

**Why this plan.** Dustpan ships without a database — it's stateless except for the disk it scans. The maintainer asked the obvious next question: *"What about future apps that DO need a database? How do we keep the `make ui` one-line promise without forcing Docker on every user?"*

Three real options exist for a Mac-native app that needs persistent state:
1. **Docker Compose** — easy, but Docker Desktop uses 2–4 GB RAM idle and requires a one-time download.
2. **Homebrew Postgres** — native, no Docker, but runs as a launchd service forever and shares state across every app on the machine (port + auth conflicts when shipping multiple apps).
3. **SQLite** — zero install, single file, ships with macOS. Trivial backup. Single-machine only.

A fourth emerging option — **`embedded-postgres` / pglite** — downloads a Postgres binary on first run, no Docker needed. Ecosystem smaller but viable.

The decision is **not pick-one-stack-for-everything**. The right database depends on what the app needs. This plan codifies the decision tree as a guideline in `app-launch-workflow` so every future app starts with the right choice — and so the user UX stays *exactly the same* (`make ui` works either way) regardless of which database tier we pick.

**Promise to preserve.** Every future app the user clones must work with:
```sh
git pull && pnpm install && make ui
```
No "first install Postgres," no "first run docker compose up," no environment variable juggling. `make ui` handles whatever setup is needed for that app's chosen tier.

## Approach

### A — The decision tree (becomes a section in `app-launch-workflow/body.md`)

| App type | Database choice | Why |
|---|---|---|
| **Personal local tools** — single user, one Mac (e.g. Dustpan, a journaling app, a personal dashboard) | **SQLite** | Zero install. Single file. `cp` is the backup story. The simplest possible user experience. |
| **Multi-user / shared / production-shaped** (e.g. a team CRM, a customer-facing site) | **Postgres via Docker Compose** | Real database. Identical on every dev's Mac. Identical in production. Docker Desktop install is one-time. |
| **AI / RAG / vector-heavy** (embeddings, semantic search, agent memory) | **Postgres + pgvector via Docker** | pgvector is mature; sqlite-vec is fine but less battle-tested. Stick with what works. |
| **"Postgres without Docker"** (rare — specific Postgres features needed but Docker Desktop is a dealbreaker) | **`embedded-postgres` npm package** | Downloads a Postgres binary on first run. Process-local. No Docker. Smaller ecosystem but viable. |

### B — The shared "data lifecycle" make targets every DB-needing app ships

Every future app that has any state ships these four make targets, regardless of database choice. The implementations differ per tier; the user-facing API is the same:

```makefile
make backup    # Dump database → ./data/backup-YYYYMMDD-HHMMSS.{sql.gz | sqlite}
make restore   # Load the latest backup from ./data/
make reset     # Wipe and start fresh (with a confirm prompt — opt-in destruction)
make export    # Dump → ~/Downloads/<app>-export-YYYYMMDD.zip (CSV + JSON for humans)
```

### C — Three concrete Makefile templates (one per tier)

**Tier 1 — SQLite template:**
```makefile
DB := $(HOME)/Library/Application Support/$(APP_NAME)/data.sqlite
BACKUP_DIR := ./data/backups

ui: ## Build + serve (no DB setup needed)
	@mkdir -p "$(dir $(DB))" $(BACKUP_DIR)
	@pnpm install --silent && pnpm --filter @$(APP_NAME)/web build
	@XCC_HOST=0.0.0.0 python3 server.py

backup: ## Dump SQLite → ./data/backups/
	@mkdir -p $(BACKUP_DIR)
	@cp "$(DB)" "$(BACKUP_DIR)/backup-$(shell date +%Y%m%d-%H%M%S).sqlite"
	@echo "✓ Backed up to $(BACKUP_DIR)/"

restore: ## Restore from the most recent backup
	@LATEST=$$(ls -t $(BACKUP_DIR)/*.sqlite 2>/dev/null | head -1) && \
	  [ -n "$$LATEST" ] && cp "$$LATEST" "$(DB)" && echo "✓ Restored from $$LATEST"

reset: ## Wipe and start fresh (with confirmation)
	@printf "Wipe $(DB)? [y/N] "; read ans; [ "$$ans" = "y" ] && rm -f "$(DB)" && echo "✓ Reset"
```

**Tier 2 — Docker Compose Postgres template:**
```makefile
ui: ## Build + bring up Docker stack + serve
	@if ! docker info >/dev/null 2>&1; then \
	  echo "⚠ Docker Desktop is not running. Open it and try again."; exit 1; fi
	@docker compose up -d --build --wait
	@pnpm install --silent && pnpm --filter @$(APP_NAME)/web build
	@open http://127.0.0.1:8765 &
	@docker compose logs -f app

backup: ## Dump Postgres → ./data/backups/
	@mkdir -p ./data/backups
	@docker compose exec -T db pg_dump -U app app | gzip > ./data/backups/backup-$(shell date +%Y%m%d-%H%M%S).sql.gz
	@echo "✓ Backed up"

restore: ## Restore from the most recent backup
	@LATEST=$$(ls -t ./data/backups/*.sql.gz 2>/dev/null | head -1) && \
	  [ -n "$$LATEST" ] && gunzip -c "$$LATEST" | docker compose exec -T db psql -U app app && echo "✓ Restored"

reset: ## Wipe volumes — destroys ALL local data (with confirmation)
	@printf "Wipe all Docker volumes for $(APP_NAME)? [y/N] "; read ans; \
	  [ "$$ans" = "y" ] && docker compose down -v && echo "✓ Reset"
```

**Tier 3 — Homebrew Postgres template:** (least recommended; included for completeness)
```makefile
ui: ## Build + serve (assumes Postgres running via `brew services start postgresql@16`)
	@if ! pg_isready -q; then \
	  echo "⚠ Postgres is not running. Run: brew services start postgresql@16"; exit 1; fi
	@pnpm install --silent && pnpm --filter @$(APP_NAME)/web build
	@python3 server.py

backup: ## Dump Postgres → ./data/backups/
	@mkdir -p ./data/backups
	@pg_dump $(APP_NAME) | gzip > ./data/backups/backup-$(shell date +%Y%m%d-%H%M%S).sql.gz

restore: ## Restore from the most recent backup
	@LATEST=$$(ls -t ./data/backups/*.sql.gz 2>/dev/null | head -1) && \
	  [ -n "$$LATEST" ] && gunzip -c "$$LATEST" | psql $(APP_NAME) && echo "✓ Restored"

reset: ## Drop + recreate the database
	@printf "Drop database $(APP_NAME)? [y/N] "; read ans; \
	  [ "$$ans" = "y" ] && dropdb $(APP_NAME) && createdb $(APP_NAME) && echo "✓ Reset"
```

### D — Data location convention

Every app, regardless of tier, stores user-facing data at:
- **SQLite:** `~/Library/Application Support/<APP_NAME>/data.sqlite`
- **Docker:** Docker named volume (e.g. `<app>_db_data`) — invisible to user, accessible via `docker compose exec`
- **Homebrew Postgres:** `/opt/homebrew/var/postgresql@16/` (Apple Silicon) or `/usr/local/var/postgresql@16/` (Intel)

Backups always land at `./data/backups/` inside the project folder so they're sync-able to iCloud/Dropbox if the user wants.

### E — README "Data" section for every DB-needing app

Every app's README documents:
1. Which tier this app uses (SQLite / Docker Postgres / etc) and why
2. Where data lives on disk
3. How to back it up (`make backup`)
4. How to restore (`make restore`)
5. How to start fresh (`make reset` — with the explicit confirm prompt)
6. How to export to human-readable (`make export` → CSV + JSON zip)

## Critical files

| File | Change |
|---|---|
| `plans/0003-database-tier-guide-for-future-apps.md` | This plan (committed before implementation, per the v0.19.4 convention). |
| `~/Developer/ai-skills-library/rules/library/app-launch-workflow/body.md` | Add new section: "Database tier guide — pick by app type" with the decision tree, the four make targets, and three Makefile templates. Pushed to `marvelousempire/ai-skills-library`. |
| `~/.cursor/rules/app-launch-workflow.mdc` | Mirror — add a condensed version of the decision tree + a pointer to the full skill body. |
| `docs/CHANGELOG.md` | v0.19.5 entry. |
| `xcode-cleanup.applescript` | kVersion bump 0.19.4 → 0.19.5 (per the rule that kVersion always tracks the latest CHANGELOG header even on doc-only changes). |
| `README.md` | No change — Dustpan itself doesn't have a database. Future apps that do will reference the skill. |

## Verification

1. `plans/0003-…md` exists in the repo with `Status: in progress` at top, gets flipped to `Status: shipped (commit <sha>, v0.19.5)` after merge.
2. `~/Developer/ai-skills-library/rules/library/app-launch-workflow/body.md` contains the new "Database tier guide" section with all three templates inline.
3. `git -C ~/Developer/ai-skills-library log --oneline -1` shows the new commit pushed.
4. `~/.cursor/rules/app-launch-workflow.mdc` has the condensed decision tree.
5. `make check` passes (AppleScript syntax) — no functional code touched.
6. PR opens, auto-merges via squash, `v0.19.5` tag fires via auto-release.
7. The plan's index row appears in `plans/README.md` after this lands.
