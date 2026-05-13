Status: shipped (v0.19.6 — commit pending merge)

# Plan 0004 — Canonical Docker stack template (cloned from claude-chat-reader)

**Supersedes:** [plan 0003](0003-database-tier-guide-for-future-apps.md). Plan 0003's four-tier decision tree is simplified into a single binary rule.

## Context

**Why this plan.** Plan 0003 laid out a four-tier database decision tree (SQLite / Docker Postgres / Homebrew Postgres / embedded-postgres) and provided three separate Makefile templates. The maintainer asked for a simpler, more decisive answer:

> *"If they need a database, we then go default to the Docker setup. Take a look at the claude reader app... clone that and fully implement the structure and form of that Docker setup. HTTPS and fully secure and comes with API too."*

The new binary rule:

- **App is stateless** (Dustpan, a static tool, a calculator) → no Docker. Plain Python + Vite + `make ui`.
- **App needs persistent state of any kind** → Docker stack, modeled exactly on `marvelousempire/claude-chat-reader`. No exceptions, no SQLite fallback, no Homebrew Postgres detour. One canonical pattern across every project.

**Why claude-chat-reader's pattern is the right one to clone.**

- `app` + `db` + `caddy` is the right minimum for any real app
- Caddy gives HTTPS for free with one-time `caddy trust` for localhost dev (and real certs in production)
- pgvector base image works for both regular Postgres AND AI/RAG features — no migration when an app eventually wants embeddings
- The `./go` one-shot script gives users the *same one-line UX* as Dustpan's stateless `make ui`: install Docker Desktop once, then `./go` does everything (env, build, up, health-wait, browser-open)
- Optional add-on services (`watcher`, `metabase`, `clinic-db`) compose cleanly without changing the base pattern
- Production-shaped: the same compose file you run locally is essentially what runs on a Linode/Hetzner/etc. — no dev/prod divergence

## Approach

### A — The rule, in one line

```
Needs state? → Docker (claude-chat-reader pattern).  No state? → no Docker.
```

That replaces the four tiers in plan 0003.

### B — The canonical Docker stack — minimum viable surface

Every DB-needing app ships these five files at the repo root:

```
my-app/
├── docker-compose.yml      # services: app, db, caddy (+ optional patterns)
├── Dockerfile              # multi-stage: deps → builder → runner [→ watcher]
├── Caddyfile               # HTTPS reverse proxy
├── .env.example            # variables, copied → .env on first `./go`
├── go                      # the one-line bootstrap script
└── Makefile                # standard targets: go, docker-up/down/logs, backup/restore/reset/export
```

### C — Service inventory (cloned from claude-chat-reader)

**Required (base pattern — every DB-needing app):**

| Service | Image | Port (host:cont) | Purpose |
|---|---|---|---|
| `app` | built (`Dockerfile:runner`) | internal — Caddy proxies | the application (Next.js, Node, Python, anything) |
| `db` | `pgvector/pgvector:pg16` | `5433:5432` (for CLI tools) | Postgres + pgvector ready for both regular SQL and AI/RAG |
| `caddy` | `caddy:2-alpine` | `80:80`, `443:443` (TCP + UDP/HTTP3) | HTTPS reverse proxy, security headers, single entry point |

**Optional patterns (add when needed):**

| Service | Image | Port | When to add |
|---|---|---|---|
| `watcher` | built (`Dockerfile:watcher`) | none | When you want file-drop auto-ingest (chokidar watches `./data/incoming/`) |
| `metabase` | `metabase/metabase:v0.51.12` | `3001` (via Caddy) | When you want SQL/BI dashboards over your data |
| `<name>-db` | `pgvector/pgvector:pg16` | `543X:5432` | When a sub-system needs its own Postgres with independent lifecycle (claude-chat-reader's `clinic-db` is this) |

### D — Networking

- Docker bridge network (default — Compose creates one automatically).
- Service-to-service discovery via hostname: `postgres://user:pass@db:5432/dbname`, `http://app:3000`, etc.
- Caddy is the ONLY service with host port bindings for HTTP/HTTPS (`80:80`, `443:443`).
- DB ports exposed (`5433:5432`) for `pg_dump`/`psql` from the host — handy for backups + manual queries.
- Nothing else binds to host ports. Service-to-service traffic stays inside the Docker network.

### E — Data persistence

| Named volume | What it holds | Survives `down`? |
|---|---|---|
| `<app>_db_data` | Postgres data files | Yes, until `down -v` (explicit destruction) |
| `<app>_caddy_data` | Caddy's auto-generated certs | Yes |
| `<app>_caddy_config` | Caddy runtime config | Yes |
| `./data/` (host bind) | App data, backups, uploads | Yes (it's a host folder) |

`make reset` requires the explicit `down -v` flag — confirmation prompted. Opt-in destruction only.

### F — Healthchecks

Every data service has one. App service depends on `db: condition: service_healthy` so the app doesn't start until Postgres is ready to accept connections.

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U <user> -d <db>"]
  interval: 5s
  timeout: 5s
  retries: 10
```

### G — HTTPS via Caddy

Localhost dev: Caddy uses internal TLS. One-time setup:
```sh
docker compose run --rm caddy caddy trust   # installs Caddy's local root CA into macOS Keychain
```

After that: `https://localhost` works in every browser with no warnings.

Production: Caddy auto-fetches Let's Encrypt certs by default. Point a real domain at the box, set `CADDY_HOST=myapp.example.com` in `.env`, restart Caddy. Done.

**Security headers** (default in every Caddyfile we ship):
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`

### H — The `./go` script (one-line bootstrap)

What `./go` does, in order:

1. Verify Docker Desktop is running (`docker info`). If not: clear error message + exit.
2. Copy `.env.example` → `.env` if `.env` doesn't exist yet.
3. Create `./data/` and `./data/incoming/` and `./data/backups/` if missing.
4. Stamp `GIT_SHA`, `GIT_BRANCH`, `BUILT_AT` into env (for the app's `/health` endpoint).
5. `docker compose up -d --build --wait`.
6. Poll the app's health endpoint until ready.
7. Open `https://localhost` in the browser.
8. Tail `docker compose logs -f app caddy` so the user sees what's happening.

Same vibe as Dustpan's `make ui` — one command, no fuss.

### I — Required `make` targets (every DB-needing app)

The four data-lifecycle targets from plan 0003 stay; the `ui` target is replaced with `go` for Docker-stack apps:

```
make go            ./go (the one-shot bootstrap)
make docker-up     docker compose up -d --build --wait
make docker-down   docker compose down (keeps volumes)
make docker-logs   tail logs for app + caddy
make backup        Dump Postgres → ./data/backups/backup-YYYYMMDD-HHMMSS.sql.gz
make restore       Load the most recent backup
make reset         docker compose down -v (with confirm — destroys all local data)
make export        Dump → ~/Downloads/<app>-export-YYYYMMDD.zip (CSV + JSON)
```

### J — API surface

The `app` service exposes routes at `https://localhost/api/*` (or `https://yourdomain.com/api/*` in production). Caddy proxies them through. Whether the framework is Next.js (App Router route handlers), Node + Express, Python + FastAPI — doesn't matter. The pattern is identical: `app:3000` (or whatever port internally), reverse-proxied through Caddy, HTTPS for free.

### K — Where the canonical template lives

Add a `templates/docker-stack/` directory inside the `app-launch-workflow` skill folder in `marvelousempire/ai-skills-library`. The skill body documents which files exist and what each does; the actual files are next to it for users to copy.

```
ai-skills-library/rules/library/app-launch-workflow/
├── meta.json
├── body.md
└── templates/
    └── docker-stack/
        ├── docker-compose.yml
        ├── Dockerfile
        ├── Caddyfile
        ├── .env.example
        ├── go
        ├── README.md            # how to use the template
        └── Makefile.docker.snippet   # paste into your project's Makefile
```

A future app starts with:
```sh
cp -r ~/Developer/ai-skills-library/rules/library/app-launch-workflow/templates/docker-stack/* ./my-new-app/
# rename app names + DB user/pass in docker-compose.yml, then:
./go
```

### L — What the rule means for Dustpan

Dustpan is stateless. It scans your disk and shells out to `rm` — there is nothing to persist. **No Docker for Dustpan.** This plan is the contract for *future* apps. Dustpan's README gets one paragraph pointing future maintainers at the canonical template.

## Critical files

| File | Change |
|---|---|
| `plans/0004-canonical-docker-stack-template.md` | This plan (committed before implementation, per the v0.19.4 convention). |
| `plans/0003-…md` | Status line gets a `Superseded by plan 0004` note appended after this plan lands. |
| `~/Developer/ai-skills-library/rules/library/app-launch-workflow/templates/docker-stack/` | New folder with 7 template files (compose, Dockerfile, Caddyfile, .env.example, go, README, Makefile snippet). |
| `~/Developer/ai-skills-library/rules/library/app-launch-workflow/body.md` | Part 8 simplified — binary rule (stateless = no Docker; stateful = Docker). Old Part 8 tier templates replaced with a reference to the new `templates/docker-stack/` folder. New "Why claude-chat-reader's pattern" sub-section. |
| `~/.cursor/rules/app-launch-workflow.mdc` | Mirror — condensed binary rule + path to templates. |
| `README.md` | Add a brief "Future apps with state" subsection under "🛠️ Under the hood" pointing future maintainers at the skill. |
| `docs/CHANGELOG.md` | v0.19.6 entry. |
| `xcode-cleanup.applescript` | kVersion 0.19.5 → 0.19.6. |

## Verification

1. `templates/docker-stack/` exists in the ai-skills-library repo with all 7 files. `git -C ~/Developer/ai-skills-library log --oneline -1` shows the new commit pushed.
2. The skill body's old Part 8 (four-tier templates) is replaced with the binary rule + template reference.
3. Cursor rule mirrors.
4. Plan 0003 status line now reads: `Status: shipped... Superseded by plan 0004.`
5. Dustpan README's `🛠️ Under the hood` section has a one-paragraph "for future apps that need state" callout linking to the skill.
6. `make check` passes (no functional code touched in Dustpan).
7. PR opens, auto-merges, `v0.19.6` tag fires.
8. Plan 0004 status line gets flipped to `Status: shipped (commit <sha>, v0.19.6)` in a post-merge chore PR.
