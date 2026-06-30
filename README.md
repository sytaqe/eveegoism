# EVE EGOISM

EVE Online killmail viewer. Logs in via EVE SSO and displays your recent killmails.

## Setup

### 1. Register an EVE application

Go to https://developers.eveonline.com/applications and create a new application:

- **Connection Type**: Authentication & API Access
- **Permissions**: `esi-killmails.read_killmails.v1`
- **Callback URL** (dev): `http://localhost:5173/eveegoism/`
- **Callback URL** (prod): `https://<your-github-username>.github.io/eveegoism/`

### 2. Configure environment

```sh
cp .env.example .env
# Edit .env and set VITE_EVE_CLIENT_ID to your application's client ID
```

### 3. Install and run

```sh
npm install
npm run dev
```

## Build & deploy

```sh
npm run build   # outputs to dist/
```

Deploy `dist/` to GitHub Pages (see `RELEASE.md`).

## Architecture

- **React + Vite** frontend, fully static — no backend
- **EVE SSO PKCE** (`src/utils/sso.js`): client-side OAuth2 with PKCE; tokens stored in browser cookies
- **ESI client** (`src/utils/esi.js`): fetches killmails and resolves solar system names; auto-refreshes access token on 401
- **`App.jsx`**: handles SSO callback redirect, routes between Login and KillmailList views
- **`useKillmails`** hook: fetches recent killmail refs, then fetches details in parallel (capped at 20), resolves system names, and sorts by time
- Ship icons served from `https://images.evetech.net/types/{typeId}/render?size=64`
- SDE static JSON files live under `public/data/` (gitignored, downloaded at build time via `scripts/download_sde.py`)

## Data flow

```
Login → EVE SSO (PKCE) → access token in cookie
→ GET /characters/{id}/killmails/recent/
→ GET /killmails/{id}/{hash}/  (×N, parallel)
→ GET /universe/systems/{id}/  (unique systems, parallel)
→ render table
```

## References

- ESI API: https://developers.eveonline.com/api-explorer
- SDE: https://developers.eveonline.com/docs/services/static-data/
- EVE image server: `https://images.evetech.net/`
