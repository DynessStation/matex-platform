# MATEX Platform

MATEX platform repository.

## Structure

- `frontend/admin` - Administration application
- `frontend/public` - Public/client application
- `backend` - API server
- `docs` - Project documentation

## Local Development

Production runs on Percona Server 8.4, so use a MySQL 8.4 database locally. Run each app from its own folder:

1. `backend`: `npm start` (API on `http://127.0.0.1:3000`, reads `backend/.env`).
2. `frontend/admin`: `npm start` (`http://localhost:4200`).
3. `frontend/public`: `npm start -- --port 4201` (`http://localhost:4201`).

Do not use `npm run build` plus `serve:ssr` for local testing: production builds call the production domains.

During server-side rendering, both frontends reach the API and their own assets through loopback origins:

| Variable | Used by | Production value (`ops/ecosystem.config.cjs`) | Default in development builds |
| --- | --- | --- | --- |
| `MATEX_API_INTERNAL_URL` | admin, public | `http://127.0.0.1:9200` | API origin from the development environment |
| `MATEX_ADMIN_INTERNAL_URL` | admin | `http://127.0.0.1:9202` | admin origin from the development environment |
| `MATEX_PUBLIC_INTERNAL_URL` | public | `http://127.0.0.1:9201` | public origin from the development environment |

Production builds without these variables fall back to the production loopback ports.

## Current Baseline

Phase 4.8 stabilization complete.

## Security

Environment files, credentials, dependencies, build outputs, and local IDE files are excluded from version control.
