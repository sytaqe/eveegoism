# EVE EGOISM — Application Specification

## Overview

EVE EGOISM is a fully static web application that displays recent killmails for an EVE Online character. It is built with React + Vite and hosted on GitHub Pages. There is no backend server; all data is fetched client-side from ESI and served as static files from `public/data/`.

---

## Authentication

- **Method**: EVE SSO with PKCE (Proof Key for Code Exchange), client-side only
- **Auth URL**: `https://login.eveonline.com/v2/oauth/authorize`
- **Token URL**: `https://login.eveonline.com/v2/oauth/token`
- **Scopes**:
  - `esi-killmails.read_killmails.v1`
  - `esi-killmails.read_corporation_killmails.v1`
- **Redirect URI**: Root URL of the app (e.g. `http://localhost:5173/eveegoism/` in dev)
- **Token storage**: Browser cookies
  - `eve_access_token`: 20 min expiry
  - `eve_refresh_token`: 90 day expiry
  - `eve_character_id`, `eve_character_name`: 90 day expiry
- Access token is automatically refreshed on 401 responses from ESI

---

## Data Fetching

### Killmail refs (character mode)
- `GET /characters/{character_id}/killmails/recent/` — paginated via `?page=N`, all pages fetched until `X-Pages` header is satisfied

### Killmail refs (corp mode)
- `GET /corporations/{corporation_id}/killmails/recent/` — same pagination pattern; requires Director role

### Killmail details
- `GET /killmails/{killmail_id}/{killmail_hash}/` — public, no auth required
- All killmails on the page are fetched in parallel with `Promise.all`

### Solar system names
- `GET /universe/systems/{system_id}/?language=en` — English names enforced via `language=en` parameter
- Results cached in memory for the session

### Victim ship type name
- `GET /universe/types/{type_id}/?language=en`
- Fetched per killmail's victim ship, cached in memory

### Victim character name
- `GET /characters/{character_id}/`
- Fetched per killmail's victim, cached in memory

### Meta group / ship classification
- Loaded from `public/data/ship_meta.json` (built by `scripts/download_sde.py`)
- Single fetch at startup, cached for the session

### Character details (corp mode)
- `GET /characters/{character_id}/` — to retrieve `corporation_id`

### Corporation info (corp mode)
- `GET /corporations/{corporation_id}/` — to retrieve corporation name

---

## Static Data (SDE)

Built at release time by running `python scripts/download_sde.py`. Downloads the official EVE SDE JSONL zip from:
`https://developers.eveonline.com/static-data/eve-online-static-data-latest-jsonl.zip`

Produces three files under `public/data/` (gitignored):

| File | Content |
|---|---|
| `ship_meta.json` | `{ typeId: metaGroupId }` — non-T1 types only (T1 omitted, treated as missing) |
| `ship_groups.json` | `{ typeId: groupId }` — all published types |
| `cloaky_types.json` | `[typeId, ...]` — all typeIds classified as cloaky-capable |

### metaGroupId values
| ID | Tier |
|---|---|
| 1 | Tech I (omitted) |
| 2 | Tech II |
| 3 | Storyline |
| 4 | Faction |
| 5 | Officer |
| 6 | Deadspace |

### Cloaky ship classification (used for Cloaky tag)
Identified at SDE build time by group name or individual ship name:

**Groups** (matched by name from `groups.jsonl`):
- Force Recon Ship (groupID 833)
- Expedition Command Ship (groupID 4902)
- Black Ops (groupID 898)
- Strategic Cruiser (groupID 963)
- Covert Ops (groupID 830)

**Individual ships** (matched by English name from `types.jsonl`):
- Astero, Stratios, Cenotaph, Tholos

### Recon ship classification (used for Recon tag)
Checked at runtime against `ship_groups.json`:
- Force Recon Ship: groupID 833
- Combat Recon Ship: groupID 906

---

## Header Bar

The header bar is sticky (`position: sticky; top: 0`) and always visible while scrolling.

### Left: Title
`EVE EGOISM`

### Center: Filters
A row of sliding toggle switches. Each toggle has its label above and the slider below.

- **zKB unregistered only** — when ON, shows only killmails with `onZkillboard === false`
- **LOSS** (red) — when OFF, hides killmails where the victim is the logged-in character
- **Recon** (green) — when OFF, hides killmails with a Recon attacker
- **Cloaky** (blue-purple) — when OFF, hides killmails with a Cloaky attacker
- **NPC** (grey) — when OFF, hides NPC-only killmails

Multiple filters can be active simultaneously. A killmail is hidden if it matches any hidden tag, or if it is not `onZkillboard === false` when the unregistered-only filter is ON.

### Right: Actions + Identity
Left to right:
1. **Post Selected Killmails** button (yellow background)
   - Label: `Post Selected Killmails` when nothing selected; `Post N Killmail(s)` when N rows are checked
   - Disabled when no checkboxes are selected or posting is in progress
   - A spinning indicator appears to the right of the button while posting
2. **Character portrait** (32×32, circular) — switches to corporation logo (32×32, rounded square) in corp mode
3. **Display name** — character name in character mode; corporation name in corp mode (shows `…` while loading)
4. **Corp toggle** (sliding toggle) — switches between character killmails and corporation killmails
5. **Logout** button

---

## Killmail List Display

Killmails are displayed as a table, sorted newest first. The table column header row is sticky below the app header.

Each row contains the following columns:

### Time (UTC)
Format: `YYYY/MM/DD HH:MM:SS UTC`
Column width: minimum (content-sized).

### zKB
Indicates zKillboard registration status:

| Value | Display |
|---|---|
| Checking (`pending`) | Spinning indicator |
| Registered (`true`) | Green ✔ |
| Unregistered (`false`) | Checkbox (selectable for posting) |
| Error (`null`) | Red `error` text |

zKillboard status is checked in parallel at load time via `https://zkillboard.com/api/killID/{id}/`.
- Confirmed registered IDs are cached in `localStorage` (key: `zkb_registered_ids`) to avoid redundant API calls.
- `cache: 'no-store'` is used to prevent browser HTTP caching from returning stale `[]` responses.

### Solar System
English system name from ESI.
Column width: minimum (content-sized).

### Victim
Displays (left to right):
1. **Ship icon** (64×64) — EVE image server render, with meta group overlay (see below)
2. **Pilot portrait** (64×64) — EVE image server portrait (omitted for NPC victims)
3. **Text block** (right of images, top-to-bottom):
   - Ship type name (light blue)
   - Pilot name (grey), linked to `https://zkillboard.com/character/{character_id}/` in a new tab

Column width: minimum (content-sized).

### Tags
Zero or more colored badge labels displayed in a horizontal row with 4px gap.
See [Tag Labels](#tag-labels) below.

### Attackers
All attackers with a `ship_type_id` are displayed as 40×40 ship icons.
Duplicate ship types are merged into one icon with an `x{count}` badge at the bottom-right.
The final-blow attacker's icon has an orange border.

---

## Ship Icons

Ship icons are fetched from the EVE image server:
- `https://images.evetech.net/types/{typeId}/render?size=64`

Character portraits:
- `https://images.evetech.net/characters/{characterId}/portrait?size=64`

Corporation logos:
- `https://images.evetech.net/corporations/{corporationId}/logo?size=64`

### Meta Group Overlay
A small triangle in the top-left corner of the icon indicates tech tier. Colors are defined in `src/index.css`:

| metaGroupId | Tier | Color |
|---|---|---|
| 2 | Tech II | (blue) |
| 3 | Storyline | (purple) |
| 4 | Faction | (gold) |
| 5 | Officer | (bright yellow) |
| 6 | Deadspace | (teal) |

Size: `max(2, round(iconSize × 0.11))` px per side.

---

## Row Background Colors

| Condition | Background |
|---|---|
| Victim is the logged-in character (loss) | Red tint |
| Victim is someone else (kill) | Green tint |

Hover state uses a slightly more opaque version of the same color.

---

## Tag Labels

Tags are displayed as rounded rectangles with white text (`border-radius: 4px`). Colors are defined in `src/index.css` (`.tag-loss`, `.tag-recon`, `.tag-cloaky`, `.tag-npc`).

| Tag | Color | Condition |
|---|---|---|
| **LOSS** | Red (`#941616`) | Victim's `character_id` matches the logged-in character |
| **Recon** | Green (`#0c8225`) | Any attacker's ship belongs to groupID 833 (Force Recon) or 906 (Combat Recon) |
| **Cloaky** | Blue-purple (`#5060c8`) | Any attacker's ship is in `cloaky_types.json` |
| **NPC** | Grey (`#606070`) | All attackers have no `character_id` (NPC-only engagement) |

---

## zKillboard Integration

### Registration check
`GET https://zkillboard.com/api/killID/{killmail_id}/`
- Returns `[]` if not registered; returns an array with killmail data if registered.
- Checked in parallel for all killmails at load time.
- Results cached in `localStorage` under key `zkb_registered_ids` (JSON array of IDs).
- `cache: 'no-store'` prevents browser HTTP caching.

### Posting
`POST https://zkillboard.com/post/`
- Body (form-encoded): `killmailurl=https://esi.evetech.net/killmails/{id}/{hash}/`
- Uses `mode: 'no-cors'` because zKillboard does not send CORS headers; any non-exception response is treated as success.
- Triggered by the **Post Selected Killmails** button for all checked killmails.
- On success, the row's zKB status updates to ✔.
- On error (fetch exception), the row's zKB status updates to `null` (error).

---

## Corp Mode

Toggled by the **Corp** switch in the header.

When ON:
- Fetches `GET /characters/{character_id}/` to obtain `corporation_id`
- Fetches `GET /corporations/{corporation_id}/` to obtain corporation name
- Fetches `GET /corporations/{corporation_id}/killmails/recent/` instead of character killmails (requires Director role in the corporation)
- Displays corporation name and logo in the header instead of character name and portrait
- If the ESI call returns 403, displays `Error: ESI error: 403` followed by `You need Director role!`

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_EVE_CLIENT_ID` | EVE application client ID (required) |
| `VITE_REDIRECT_URI` | OAuth redirect URI (optional, defaults to app root URL) |

---

## Key Source Files

| File | Role |
|---|---|
| `src/utils/sso.js` | EVE SSO PKCE flow, token storage/refresh |
| `src/utils/esi.js` | ESI API client with auto token refresh |
| `src/utils/shipMeta.js` | Loads SDE static JSON, provides meta/recon/cloaky lookups |
| `src/utils/zkillboard.js` | zKillboard registration check and killmail posting |
| `src/hooks/useKillmails.js` | Fetches and enriches all killmail data; manages selection and posting state |
| `src/components/ShipIcon.jsx` | Ship icon with meta group overlay |
| `src/components/KillmailRow.jsx` | Single killmail table row |
| `src/components/KillmailList.jsx` | Table wrapper, header bar, filters, corp mode toggle |
| `src/App.jsx` | SSO callback handler, Login/KillmailList routing |
| `scripts/download_sde.py` | SDE download and static JSON generation |
