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

# 1. Confirm the working tree is actually clean before touching it.
#    A dirty/drifted tree here means `git checkout <branch>` will abort
#    later with "local changes would be overwritten" - see lesson below.
git status

git fetch origin
git checkout <branch>              # if switching branches
git reset --hard origin/<branch>   # only if step 1 showed drift you're OK discarding

set -a; source .env; set +a
npm install --include=dev          # --include=dev: see NODE_ENV lesson below
npm run prisma:generate && npm run prisma:generate:log
npx prisma db push --accept-data-loss --skip-generate

mv Files Files.symlink-backup      # Turbopack can't handle the Files symlink mid-build
npm run build; echo BUILD_EXIT=$?
mv Files.symlink-backup Files      # always restore, even if the build failed
```

Then restart the site from the panel. (The repo's `scripts/deployment.sh` and
`service.sh` assume systemd and do **not** apply on Alwaysdata.)

### Lessons learned (from a rough staging deploy)

- **A dirty working tree makes `git checkout` fail silently into the old
  code.** `git checkout <branch>` aborts with "local changes would be
  overwritten" and does **not** switch branches - but the script kept
  going, so `npm install`/`npm run build` ran against the *old* tree and
  produced confusing, unrelated-looking errors (missing modules that had
  nothing to do with the actual change). Always check the checkout/pull
  actually succeeded (`git log -1 --oneline`, `git status` shows clean)
  before running anything after it. If a previous deploy ever extracted a
  build archive directly onto a site directory instead of going through
  git (see "Building locally and transferring the build" above), the next
  `git checkout` on that directory will hit exactly this - every file
  looks locally modified, including binaries.
- **`NODE_ENV=production` (from `.env`) makes `npm install` skip
  devDependencies**, but Next.js needs build-time-only devDependencies
  like `@tailwindcss/postcss` even for a production build. Always install
  with `npm install --include=dev` on this project, not plain
  `npm install`, whenever `.env` is sourced first.
- **Don't rely on npm hoisting a transitive dependency for a module you
  `import` directly.** `app/api/baby/create/route.ts` imported `zod`
  without it ever being declared in `package.json` - it only worked
  because some other package's dependency on `zod` happened to hoist it
  to the top of `node_modules` locally. A clean install on another
  machine hoisted differently and broke the build. If a file directly
  imports a package, that package must be a direct dependency in
  `package.json`, full stop - grep `package.json` for anything a new
  route/component imports before assuming it's covered transitively.
- **The `Files` symlink + Turbopack build panic (see Troubleshooting
  below) isn't a rare edge case - it happens on every direct-on-server
  build**, so it's now a default step in the update flow above, not just
  a troubleshooting note to remember under pressure.

## Building locally and transferring the build (low-resource server)

If the server doesn't have enough RAM/CPU for `npm run build` (or the `Files`
symlink panic in Troubleshooting keeps hitting), build locally and only ship
`.next` — **not** `node_modules`. Everything else (`package.json`,
`prisma/schema.prisma`, migrations) already reaches the server via `git pull`,
and installing a couple of new/changed npm packages there is fast and cheap;
it's only `next build` itself that's expensive. Shipping the full
`node_modules` tree (500MB+, tens of thousands of files) is almost never
actually needed — reserve it for the rare case where a native module
(`sharp`, Prisma engines) needs an architecture the server's own `npm install`
can't resolve on its own.

**Before archiving, exclude `.next/dev` and `.next/cache`** — `.next/dev` is
leftover `next dev` state if that same `.next` directory was ever used to run
the dev server (can be 500MB+ on its own) and is irrelevant to `next start`;
`.next/cache` only speeds up future local builds. Excluding both typically
takes a several-hundred-MB `.next` down to ~10-20MB:

```bash
tar -czf sprout-track-next-build.tar.gz --exclude='.next/dev' --exclude='.next/cache' .next
```

On the server: `git pull`, `npm install --include=dev`, regenerate Prisma
(below), then extract the archive on top of the site directory (it only
touches `.next/`, nothing else) and restart.

**Never include a build's `prisma/schema.prisma` or generated Prisma Client
without regenerating them against the server's own `.env` first** — this
doesn't apply when you only ship `.next` (schema comes from `git pull`), but
still applies if you ever do ship a full `node_modules` per the fallback
below.

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

## Troubleshooting "Connection to upstream failed"

This means Apache can't reach the Node process at all (crashed, never
started, or listening on the wrong address) - not an app-level error page.
Debugging this got confused in practice by several Alwaysdata-specific
gotchas; check these **before** assuming it's an app bug:

- **Never leave a manual `node server.js` debug run in the background.**
  It binds the exact same port/address the real Alwaysdata-managed process
  needs, so a stray one causes the *real* process to fail to bind and
  crash-loop - which looks exactly like an app bug but is self-inflicted.
  Always run manual tests in the foreground (or explicitly `kill` the PID
  when done) before restarting the site from the panel.
- **`ps`/`pkill -f` won't match on `server.js` or `node`.** Next renames the
  process title to `next-server (v...)` at runtime, so `pkill -f
  "server.js"` silently matches nothing even though the process is very
  much alive. Find it with `ps aux | grep next-server` and kill by PID.
- **`localhost`/`127.0.0.1` is not the address Apache actually proxies to.**
  Each Alwaysdata account gets its own private loopback IP (e.g.
  `127.3.182.47`, visible via `ss -tlnp` on the real listening socket).
  Testing against `localhost` will show "connection refused" even when the
  app is perfectly healthy - always read the actual bound address from `ss`
  first, don't assume.
- **A single `SIGTERM` sent by Alwaysdata around "idle" is normal**
  (auto-sleep after inactivity, wakes on next request). Two `SIGTERM`s ~50s
  apart followed by "exited spontaneously with return code N/A" is not
  normal and is the actual symptom to chase (but rule out the stray-process
  port collision above first - it produces this exact pattern).
- **A `PORT=` line hardcoded in `.env`** (leftover from a pre-standalone
  setup using `next start`, which reads it) can override/conflict with the
  port Alwaysdata injects at spawn time. Don't hardcode `PORT` - let
  Alwaysdata assign it.
- **Prisma's SQLite `file:` URLs resolve relative to `prisma/schema.prisma`,
  not the process's working directory at runtime.** `file:../db/x.db`
  means `<project-root>/db/x.db`, not one level above wherever the process
  happens to be started from.
- **This Alwaysdata account shares one limited pool of concurrent
  "upstream" (Node/custom-command) processes across *every* site on the
  account** - not just the two sprout-track sites. Other apps here
  (`listmonk`, a `filebrowser` under `store`, `metabase`) compete for the
  same pool. When one of them gets a request and needs a slot, Alwaysdata
  evicts whichever other site's process has been idle longest - which
  produces the exact "two SIGTERMs, exited spontaneously" pattern above,
  with **no app-level bug involved at all**. This affects prod too (it
  also just runs plain `npm start`, same pool) - it isn't specific to
  staging or to standalone builds. If "connection to upstream failed"
  recurs, check `grep "Upstream starting" ~/admin/logs/sites/2026/sites-<date>.log`
  for *other* apps starting right around the failure time before assuming
  it's this project's problem.
- **Deleting a site in the Alwaysdata panel does not necessarily stop it
  from being spawned immediately.** A deleted `store`/`filebrowser` site
  was observed starting again *after* being deleted in the panel - likely
  because its address was still resolving and something (a bot, a stray
  tab, a crawler) still reached it. If you stop using an app on this
  account, also remove/park its domain, not just delete the site entry,
  and verify the domain stops responding before assuming it's gone.
- **Building directly on a site with a real `Files` symlink can crash
  Turbopack.** `Files/` is a symlink pointing *outside* the project
  directory (to the shared uploads folder - see "Running staging alongside
  prod" above). Turbopack's build-time asset scanner can panic
  ("Symlink ... is invalid, it points out of the filesystem root") when it
  encounters this while running `npm run build` **on the server** (this
  doesn't happen building locally, where `Files/` isn't a real symlink to
  actual data). Work around it by moving the symlink aside for the
  duration of the build and restoring it after, success or failure:
  ```bash
  mv Files Files.symlink-backup
  npm run build; echo BUILD_EXIT=$?
  mv Files.symlink-backup Files
  ```
- **`NODE_ENV=production` needs verifying per-site, every time** - not just
  once on prod. Staging independently had `NODE_ENV` set to a non-production
  value too, causing the identical `/_global-error` prerender crash
  (`Cannot read properties of null (reading 'useContext')`) the first time a
  full build was run there. Check `grep "^NODE_ENV" .env` on *whichever*
  site you're building on before running `npm run build` directly on a
  server.
- **A site's `.env` can silently drift from what the docs say it should
  be.** Staging was found to be running its own disconnected local SQLite
  database (`DATABASE_PROVIDER=sqlite`) instead of sharing prod's
  PostgreSQL DB as documented below - nobody had changed it during any of
  this debugging, it had simply drifted at some earlier point and gone
  unnoticed. If prod/staging data ever looks unexpectedly different (or
  unexpectedly *identical* in a way that doesn't add up), diff the two
  `.env` files' `DATABASE_PROVIDER`/`DATABASE_URL`/`ENC_HASH` before
  investigating anything else:
  ```bash
  diff <(grep -E "^(DATABASE_PROVIDER|DATABASE_URL|LOG_DATABASE_URL|ENC_HASH)=" \
    ~/www/geovista-space_sprout-track/.env) \
    <(grep -E "^(DATABASE_PROVIDER|DATABASE_URL|LOG_DATABASE_URL|ENC_HASH)=" \
    ~/www/geovista-space_sprout-track-staging/.env)
  ```

### Pre-flight checklist before any deploy/build on either site

Run through this *every time*, not just when something's already broken -
most of the incidents above were each individually easy to fix once found,
but expensive to find because they weren't checked proactively:

1. `grep "^NODE_ENV" .env` → must be `production`.
2. `grep "^PORT" .env` → must be **absent** (let Alwaysdata inject it).
3. `grep -E "^(DATABASE_PROVIDER|DATABASE_URL)" .env` → matches what this
   site is actually supposed to use (compare against the other site's
   `.env` if they're meant to share a DB).
4. `ps aux | grep next-server` and `ss -tlnp | grep node` → clean, nothing
   of yours left over from a previous debugging session.
5. If building directly on the server: move `Files` aside first (see
   above), and check `grep "Upstream starting" ~/admin/logs/sites/2026/sites-<today>.log`
   to see whether other account apps are currently active/competing.
6. After any locally-built transfer: regenerate the Prisma client against
   *this* site's own `.env` before restarting - never trust a client
   generated against a different environment.
7. After `git checkout`/`git pull`: verify it actually landed —
   `git log -1 --oneline` shows the commit you expect and `git status`
   is clean. A failed checkout doesn't stop the script; it just leaves
   you building the old code with confusing errors.
8. Always `npm install --include=dev`, never plain `npm install`, once
   `.env` (`NODE_ENV=production`) is sourced — otherwise build-time
   devDependencies silently don't get installed.

### ⚠️ Never paste real `.env` values into chat/logs/tickets

During this debugging, a real database password ended up pasted into a
chat session verbatim while comparing prod/staging `.env` files. Prefer
`diff <(...) <(...)` (as shown above) or grep for just the *keys* you need
to compare, not commands that print full connection strings. If a secret
does leak, rotate it (Alwaysdata admin panel → PostgreSQL → change
password) and update `DATABASE_URL`/`LOG_DATABASE_URL` in both sites'
`.env` files afterward.

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
