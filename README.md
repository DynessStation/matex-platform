# MATEX Platform

MATEX platform repository.

## Structure

- `frontend/admin` - Administration application
- `frontend/public` - Public/client application
- `backend` - API server
- `docs` - Project documentation

## Project Docs

- `docs/peta-jalan.md`: where the project stands, what comes next, and the current milestone.
- `docs/standar-kode.md`: code standards, the standard module pattern, and the refactoring workflow.
- `docs/audit-awal-claude-2026-10-18.md`: audit findings and their fix history.
- `docs/cloudpanel-production-runbook.md`: production server operations.

## Local Development

Production runs on Percona Server 8.4, so use a MySQL 8.4 database locally. Run each app from its own folder:

1. `backend`: `npm start` (API on `http://127.0.0.1:3000`, reads `backend/.env`).
2. `frontend/admin`: `npm start` (`http://localhost:4200`).
3. `frontend/public`: `npm start -- --port 4201` (`http://localhost:4201`).

Do not use `npm run build` plus `serve:ssr` for local testing: production builds call the production domains.

Non-production builds (`npm start`, the e2e stack) show a striped bar on top, a `DEV <api host>` label in the bottom-left corner, and a `[DEV]` prefix on the browser tab title, so a local tab is not mistaken for production. Production builds render none of it.

The admin dev server runs without server-side rendering (`"ssr": false` in its `development` configuration): admin pages sit behind a login and do not need SSR, and the dev server cannot pass the login cookie to SSR. Production and the e2e stack still render admin pages on the server.

To build an empty database from the repository (for example a new local or staging database), run from `backend`:

1. `npm run db:migrate` creates every table and the full admin permission catalog.
2. `npm run admin:create-first -- --name "Full Name" --alias Alias --email you@example.com --phone +628123456789` creates the first all-access admin. The password is prompted for, never passed as a flag, and the command refuses to run once any admin exists.

When step 2 creates the company, it also copies the default website content (pages, page images, navigation, contact channels and topics, FAQs) from `backend/database/seeds/company-defaults/`, so the public site works immediately. Images go to `FILE_STORAGE_ROOT`. Contact-form recipient emails are deliberately not included; set them in the admin panel. Skip this with `--no-defaults`, or run it later with `npm run db:seed:company-defaults -- --company-id <id>` (it refuses to overwrite a company that already has pages).

The defaults are a snapshot of the live matexindo.com content. To refresh them after editing the site, run `npm run db:export:company-defaults -- --company-id 1 --out database/seeds/company-defaults` on the server (read-only) and commit the result.

During server-side rendering, both frontends reach the API and their own assets through loopback origins:

| Variable | Used by | Production value (`ops/ecosystem.config.cjs`) | Default in development builds |
| --- | --- | --- | --- |
| `MATEX_API_INTERNAL_URL` | admin, public | `http://127.0.0.1:9200` | API origin from the development environment |
| `MATEX_ADMIN_INTERNAL_URL` | admin | `http://127.0.0.1:9202` | admin origin from the development environment |
| `MATEX_PUBLIC_INTERNAL_URL` | public | `http://127.0.0.1:9201` | public origin from the development environment |

Production builds without these variables fall back to the production loopback ports.

## Kartify Design Reference

Both frontends started from the purchased Kartify template. Kartify modules that MATEX v1 does not use (orders, cart, coupons, shipping, wallet, stores, themes, and so on) were removed from the code to keep it maintainable, and are archived in the git tag `kartify-reference-v1`.

**Before building a new module, check that tag for a Kartify design or component that fits, and adapt it instead of starting from scratch.** For example:

```bash
git ls-tree -r --name-only kartify-reference-v1 -- frontend/admin/src/app/components
git show kartify-reference-v1:frontend/admin/src/app/components/order/order.html
git checkout kartify-reference-v1 -- frontend/admin/src/app/components/coupon
```

Kartify is a visual reference; its demo data and fixtures are not MATEX business logic.

## Code Formatting

Both frontends are formatted with Prettier. Run `npm run format` in `frontend/admin` or `frontend/public` before committing; it formats `src` only, so the vendor Kartify styles under `public/assets` stay as shipped. Keep formatting-only changes in their own commit.

The one-time formatting commit is listed in `.git-blame-ignore-revs`. GitHub skips it automatically; for local `git blame`, run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once.

## Browser Tests

`ops/e2e` has two Playwright suites:

- `npm test`: read-only release checks against a deployed stack (defaults to the production loopback ports).
- `npm run test:write`: admin write flows (login, media upload, publishing a product and an article and checking them on the public site) plus the API contracts in `write/*-api.spec.ts` (admin session and accounts, offices, access profiles, website navigation), on an isolated local stack. It rebuilds the `matex_e2e` database from migrations, starts the API on 3100 and production-style SSR builds of admin (4300) and public (4301), runs the tests, then removes the temporary uploads. Your dev database, storage, and dev servers are not touched, and it refuses to run against a non-local address or a database whose name does not end in `_e2e`.

One-time local setup for the write suite: the database user in `backend/.env` needs `ALL PRIVILEGES ON matex_e2e.*`.

While writing tests, start the stack once and rerun against it with `MATEX_E2E_REUSE=1 npx playwright test -c playwright.write.config.ts`.

`npm run test:api` runs only the API contract specs (`write/*-api.spec.ts`) against the e2e API, without building the frontends, so it finishes in seconds. With `MATEX_E2E_RECORD=recordings/<name>` it also writes every checked response and the rows of the tables each spec names to `recordings/<name>/<spec>.json` (git-ignored), with timestamps, uuids, and tokens masked. Record before and after a refactor and compare the files to prove the API behaves the same. The full workflow is in `docs/standar-kode.md`.

## Current Status

See `docs/peta-jalan.md` for the current production commit, completed phases, and the next milestone.

## Security

Environment files, credentials, dependencies, build outputs, and local IDE files are excluded from version control.
