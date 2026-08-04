# Scriptday

Daily scripture study at [scriptday.ensign.quest](https://scriptday.ensign.quest).

Rotates through the standard works one verse at a time — Book of Mormon, Holy Bible (KJV + WEB), Pearl of Great Price, and Doctrine and Covenants — with study links, impressions, tags, and local-only progress.

## Develop

```bash
npm install
npm run build:scriptures
npm run dev
```

## Deploy (Cloudflare Pages)

Minimal setup: `wrangler.toml` points at `dist` and names the project `scriptday`.

```bash
npm run cf:login   # once
npm run deploy
```

Then in the Cloudflare dashboard: **Workers & Pages → scriptday → Custom domains → Add** `scriptday.ensign.quest`.

If `ensign.quest` is already on the same Cloudflare account, the DNS record is created for you.

### Optional: Git-connected Pages

Connect this repo in the dashboard. Build settings:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

Set `NODE_VERSION=20` if the dashboard asks for a Node version.

## Notes

- Progress and notes stay in the browser (`localStorage`).
- Reference links include Gospel Library and the BYU Scripture Citation Index.
- First load downloads the verse corpus (~18MB); Cloudflare caches it via `_headers`.
- Rebuild verse data with `npm run build:scriptures` when sources change.
