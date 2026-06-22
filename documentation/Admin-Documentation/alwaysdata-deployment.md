# Deploying on Alwaysdata (shared hosting, no Docker)

Alwaysdata is a shared host with **no Docker** but with **Node.js sites**, **SSH**, and
**managed PostgreSQL** — which is enough to run Sprout Track. This guide covers a
non-Docker install using PostgreSQL (recommended on shared/networked storage, where
SQLite file-locking can be unreliable).

> Throughout this guide, replace every placeholder in `< >` with your own values.
> Never commit or share real credentials, the generated `ENC_HASH`, or your `.env`.

## Prerequisites

- An Alwaysdata account with **SSH** enabled.
- **Node.js 20+** available (this guide uses 22; the project targets 22).
- A **PostgreSQL** database (created from the admin panel).

## 1. Pick the Node version

The default shell Node may be old. List the versions Alwaysdata ships and point your
shell at a 22.x build:

```bash
ls /usr/local/alwaysdata/node/
export PATH=/usr/local/alwaysdata/node/<22.x.x>/bin:$PATH
node --version            # expect v22.x.x
echo 'export PATH=/usr/local/alwaysdata/node/<22.x.x>/bin:$PATH' >> ~/.bashrc
```

> Use **22**, not 24 — the native modules (`better-sqlite3`, `sharp`) have stable
> prebuilt binaries for 22.

## 2. Create the PostgreSQL database

In the admin panel → **Databases → PostgreSQL**:

1. Create a **user** (e.g. `<db_user>`) with a password using **letters and digits only**
   (special characters break the connection URL unless percent-encoded).
2. Create **two databases**, owned by that user:
   - `<account>_sprout_track` (main)
   - `<account>_sprout_track_logs` (logs)

The host is `postgresql-<account>.alwaysdata.net`.

## 3. Clone and install

```bash
cd ~/www
git clone <your-fork-or-upstream-url> sprout-track
cd sprout-track
npm install                # compiles native modules; a few minutes
```

The working directory will be `/home/<account>/www/sprout-track`.

## 4. Configure `.env`

Generate defaults and the secrets (`ENC_HASH`, `NOTIFICATION_CRON_SECRET`):

```bash
npm run env:ensure -- local ./.env
```

Then edit `.env` and set:

```env
NODE_ENV=production
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://<db_user>:<password>@postgresql-<account>.alwaysdata.net:5432/<account>_sprout_track"
LOG_DATABASE_URL="postgresql://<db_user>:<password>@postgresql-<account>.alwaysdata.net:5432/<account>_sprout_track_logs"
COOKIE_SECURE=true          # you will serve over HTTPS
ENABLE_NOTIFICATIONS=false  # see note on cron below
APP_URL=https://<your-address>
```

Leave the auto-generated `ENC_HASH`/`NOTIFICATION_CRON_SECRET` untouched.

## 5. Create the schema and seed

The Prisma scripts read the provider/URLs from the **environment**, so load `.env`
into the shell first:

```bash
set -a; source .env; set +a
echo "$DATABASE_PROVIDER"        # expect: postgresql

npm run prisma:generate
npm run prisma:generate:log
npx prisma db push --accept-data-loss --skip-generate
npx prisma db push --schema=prisma/log-schema.prisma --accept-data-loss --skip-generate
npx prisma db seed
```

> Tip: `source .env` only loads what was in the file at that moment. If you change a
> password or URL, re-run `set -a; source .env; set +a` before retrying, otherwise the
> shell keeps the stale value (a common cause of `P1000: Authentication failed`).

## 6. Build

```bash
npm run build
# If it runs out of memory ("Killed" / JS heap):
# NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

## 7. Create the site

In the admin panel → **Web → Sites → Add a site**:

- **Addresses:** your domain/subdomain.
- **Type:** Node.js
- **Command:** `npm start`
- **Node version:** 22 (must match the build).
- **Working directory:** `/home/<account>/www/sprout-track`
- **Hot restart:** `Unsupported` (Alwaysdata stops/starts the process — fine here).
- **Environment variables:** leave empty — the app reads everything from `.env`.

Alwaysdata injects a `PORT` env var; `next start` binds to it automatically (and a
process-level `PORT` wins over the one in `.env`, so there's no conflict).

## 8. Enable HTTPS

**Web → SSL certificates → Add → Let's Encrypt** for your address. Required because
`COOKIE_SECURE=true` (auth cookies won't be set over plain HTTP). Issuance validates
over HTTP first, so the site must already respond on `http://`.

## 9. First login

Open your address. Defaults from the seed:

- Family PIN: `111222`
- Family Manager admin password: `admin`

**Change both immediately** in Settings / `/family-manager`.

## Notifications cron (optional)

There is no `crond`/systemd here. To enable push notifications, set
`ENABLE_NOTIFICATIONS=true` and add an Alwaysdata **scheduled task** (Advanced → Tasks)
that runs `npm run notification:cron:run` in the project directory on your interval,
instead of the in-container cron daemon. Leave it `false` if you don't need pushes.

## Updating

```bash
cd ~/www/sprout-track
set -a; source .env; set +a
git pull
npm install
npm run prisma:generate && npm run prisma:generate:log
npx prisma db push --accept-data-loss --skip-generate
npm run build
```

Then restart the site from the panel. (The repo's `scripts/deployment.sh` and
`service.sh` assume systemd and do **not** apply on Alwaysdata.)

## What to ignore

Everything Docker-related (`Dockerfile`, `docker-*.yml`, `docker-startup.sh`) and the
systemd service scripts are not used in this setup.

## Migrating existing data (SQLite → PostgreSQL)

To bring data from a previous SQLite instance, use the in-app **Backup** (Family Manager
→ Database Management) to produce a `.zip`, then upload it via the Setup Wizard's
**Import Database** / restore tool. Your PostgreSQL connection settings are preserved;
the backup's `ENC_HASH` travels in the zip so encrypted fields decrypt correctly.

> **Known issue (cross-provider import):** a bug can drop the imported family's
> `Settings` row, leaving it unable to log in ("Invalid credentials") even though
> babies/logs imported. If this happens, verify each family has a `Settings` row and
> back-fill the missing one. See the project `TODO.md` (Bugs conocidos → B1) for the
> root cause and fix.

## Related Documentation

- [Local (Non-Docker) Deployment](local-deployment.md)
- [Environment Variables](environment-variables.md)
- [Upgrades and Backups](upgrades-and-backups.md)
