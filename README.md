# Scriptday

Daily scripture study at [scriptday.ensign.quest](https://scriptday.ensign.quest).

Rotates through the standard works one verse at a time — Book of Mormon, Holy Bible (KJV + WEB), Pearl of Great Price, and Doctrine and Covenants — with study links, impressions, tags, local progress, and optional Google/Microsoft cloud sync.

## Develop

```bash
npm install
npm run build:scriptures
npm run build          # needed once before wrangler serves assets
npm run dev:cf         # Worker + assets (OAuth + API)
```

UI-only Vite (no `/api`):

```bash
npm run dev
```

## Deploy (Cloudflare)

Static assets + Worker API (`wrangler.jsonc`).

```bash
npm run deploy
```

### KV namespace

Create once, then put the id into `wrangler.jsonc` under `kv_namespaces[0].id` (and `preview_id` for local):

```bash
npx wrangler kv namespace create PROGRESS
npx wrangler kv namespace create PROGRESS --preview
```

### OAuth secrets

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put MICROSOFT_CLIENT_ID
npx wrangler secret put MICROSOFT_CLIENT_SECRET
```

For local `wrangler dev`, put the same values in `.dev.vars` (gitignored):

```
SESSION_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

### Google Cloud OAuth client

1. Create an OAuth 2.0 Web client in Google Cloud Console.
2. Authorized redirect URIs:
   - `https://scriptday.ensign.quest/api/auth/google/callback`
   - `http://localhost:8787/api/auth/google/callback` (wrangler default)

### Microsoft Entra app

1. Register a web app in Azure Portal (Entra ID).
2. Redirect URIs (Web):
   - `https://scriptday.ensign.quest/api/auth/microsoft/callback`
   - `http://localhost:8787/api/auth/microsoft/callback`
3. Create a client secret; enable ID tokens / openid profile email.

### Custom domain

Add `scriptday.ensign.quest` under the project’s **Custom domains** tab.

## Notes

- Progress stays in the browser when signed out; connecting Google or Microsoft merges and syncs to Cloudflare KV.
- **View marked** lists every marked verse with notes/tags and reopens one on click.
- Reference links include Gospel Library, Come, Follow Me + FAIR + followHIM weekly matches (when indexed), Church.org / FAIR / followHIM / Scripture Central / Church History Matters / MormonR searches, the BYU Scripture Citation Index, and for Bible verses Bible Project book guides plus Bible Gateway (KJV/WEB).
- Rebuild CFM lesson index with `npm run build:cfm` (current curriculum year via Open Scripture `?year=`, plus FAIR weekly pages + followhim.co episodes when available). Override with `CFM_YEAR=2026`. `npm run deploy` rebuilds the index first so the shipped year stays current. FAIR/followHIM scrapers are OT-oriented today — core CFM week/year selection still works when the manual changes; those extra weekly links may need scraper updates for NT/BoM/D&C years.
- First load downloads the verse corpus (~18MB); Cloudflare caches it via `_headers`.
- Rebuild verse data with `npm run build:scriptures` when sources change.
