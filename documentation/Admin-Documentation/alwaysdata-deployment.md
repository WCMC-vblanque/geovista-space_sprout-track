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

## Building locally and transferring the build (low-resource server)

If the server doesn't have enough RAM/CPU for `npm run build`, you can build
locally and ship `.next`, `node_modules`, `public`, `prisma`, `package.json`,
and `package-lock.json` (e.g. as a single tar.gz, to avoid FTP choking on
`node_modules`'s tens of thousands of files). **Never include a build's
`prisma/schema.prisma` or generated Prisma Client without regenerating them
against the server's own `.env` first.**

Why: `npm run prisma:generate` runs `prisma:prepare` (`scripts/prisma-provider.js`),
which rewrites `schema.prisma`'s datasource block to match whatever
`DATABASE_PROVIDER`/`DATABASE_URL` is in the **currently sourced `.env`** at
generate time. If you build locally against your local dev `.env` (typically
SQLite) and ship that `schema.prisma` + client to a PostgreSQL server, the
app starts without error but every database query fails at runtime
(`Error validating datasource`: URL must start with `file:`) — easy to miss
since there's no crash, just a broken site.

**After transferring a locally-built archive, always regenerate on the server
itself before restarting:**

```bash
cd ~/www/sprout-track
set -a; source .env; set +a
npm run prisma:generate && npm run prisma:generate:log
```

This is lightweight (Prisma codegen only, not a full build) and safe to run
even on constrained resources.

### Standalone output (much smaller transfer)

`next.config.js` supports Next.js's `output: 'standalone'` mode, gated behind
`NEXT_OUTPUT_MODE=standalone` (set this in the site's own `.env` - currently
only staging's, not prod's, until it's proven out). A standalone build ships
its own pruned `node_modules` (only what's actually imported at runtime)
instead of the full tree, cutting a locally-built transfer archive from
~580MB down to ~110MB.

Build locally with the provider matching the target site (only the
`DATABASE_PROVIDER` matters for `prisma generate` - the actual `DATABASE_URL`
is read from the environment at runtime, not baked in, so no secrets are
needed to build):

```bash
DATABASE_PROVIDER=postgresql npm run prisma:generate
DATABASE_PROVIDER=postgresql npm run prisma:generate:log
NEXT_OUTPUT_MODE=standalone NODE_ENV=production npm run build
```

The `postbuild` script (`scripts/copy-standalone-assets.js`) automatically
copies `public/` and `.next/static/` into `.next/standalone/` - Next
deliberately omits both from the standalone output otherwise.

Package and ship the *contents* of `.next/standalone/` (not the folder
itself) as the deploy archive, so it extracts directly into the site's
existing root - this preserves the site's own `.env` and its `Files`
symlink, which aren't part of the standalone output:

```bash
tar -czf sprout-track-standalone.tar.gz -C .next/standalone .
```

On the server, extract into the site's directory as usual
(`tar -xzf ... `), then run the same Prisma-regenerate step above against
the site's real `.env` (same reasoning as the non-standalone case - never
trust a locally-built Prisma client without regenerating it against the
target's own environment).

**Run it with `node server.js`, not `npm start`.** The pruned
`node_modules` doesn't necessarily include the full `next` CLI, so
`next start` (what `npm start` invokes) may not work - Next's own
convention for standalone deploys is running the generated `server.js`
directly. Update the Alwaysdata site's **Command** field accordingly
(`node server.js` instead of `npm start`); the working directory stays
the same.

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

## Running staging alongside prod (shared DB + shared uploaded files)

This project runs two sites on the same Alwaysdata account: prod
(`~/www/geovista-space_sprout-track`) and staging
(`~/www/geovista-space_sprout-track-staging`, a feature-branch build for testing
before merging to `main`). Staging shares prod's **PostgreSQL database** and
**`ENC_HASH`** (copy prod's `.env`, only change `APP_URL`) — see the note at the
top of this doc. Safe to share the DB only for branches that don't change
`prisma/schema.prisma` in a way prod can't tolerate; purely additive columns/
tables (new nullable fields, new models) are fine, since prod's older Prisma
client simply never selects them.

**Uploaded files (`Files/photos`, `Files/diapers`, `Files/notes`, etc.) must be
shared too, for the same reason as the DB.** Encrypted photo/attachment
filenames are stored as DB rows; since that DB is shared, a photo uploaded via
staging has a row that prod's database also sees — but if each site kept its
own separate `Files/` folder, prod would fail to find (and decrypt) a file
that was only ever written to staging's disk, and vice versa. Symlinking both
sites' `Files/` directory to one shared folder keeps every row's file
reachable from either site.

### One-time migration to a shared `Files/` folder

Run once, from SSH, after backing up both existing `Files/` directories:

```bash
# 1. Create the shared location (outside both app directories, so it survives
#    either one being wiped/redeployed)
mkdir -p ~/www/sprout-track-shared-files

# 2. Back up both existing Files/ dirs first (safety net)
tar -czf ~/files-backup-prod-$(date +%Y%m%d).tar.gz -C ~/www/geovista-space_sprout-track Files
tar -czf ~/files-backup-staging-$(date +%Y%m%d).tar.gz -C ~/www/geovista-space_sprout-track-staging Files

# 3. Merge both into the shared folder (filenames are UUIDs, so no collision risk)
rsync -a ~/www/geovista-space_sprout-track/Files/ ~/www/sprout-track-shared-files/
rsync -a ~/www/geovista-space_sprout-track-staging/Files/ ~/www/sprout-track-shared-files/

# 4. Remove the old separate folders, replace with symlinks
rm -rf ~/www/geovista-space_sprout-track/Files
rm -rf ~/www/geovista-space_sprout-track-staging/Files
ln -s ~/www/sprout-track-shared-files ~/www/geovista-space_sprout-track/Files
ln -s ~/www/sprout-track-shared-files ~/www/geovista-space_sprout-track-staging/Files

# 5. Verify both are symlinks pointing at the shared folder
ls -la ~/www/geovista-space_sprout-track/Files
ls -la ~/www/geovista-space_sprout-track-staging/Files
```

Restart both sites afterward. No code change or redeploy is needed — the app
already resolves `Files/` relative to its working directory at runtime
(`process.cwd()/Files` in `src/lib/file-encryption.ts`), and a symlink is
transparent to that. Only delete the two `.tar.gz` backups once you've
confirmed photos load correctly on both sites.

## Related Documentation

- [Local (Non-Docker) Deployment](local-deployment.md)
- [Environment Variables](environment-variables.md)
- [Upgrades and Backups](upgrades-and-backups.md)
