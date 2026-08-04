# Scriptday

Daily scripture study at [scriptday.ensign.quest](https://scriptday.ensign.quest).

Rotates through the standard works one verse at a time — Book of Mormon, Holy Bible (KJV + WEB), Pearl of Great Price, and Doctrine and Covenants — with study links, impressions, tags, and local-only progress.

## Develop

```bash
npm install
npm run build:scriptures
npm run dev
```

## Deploy (Cloudflare)

Static assets Worker configured in `wrangler.jsonc` (`dist/` + SPA fallback). Git-connected builds should use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Output directory | `dist` |

Locally:

```bash
npx wrangler login
npm run deploy
```

Add `scriptday.ensign.quest` under **Custom domains** in the Cloudflare project.

## Notes

- Progress and notes stay in the browser (`localStorage`).
- Reference links include Gospel Library and the BYU Scripture Citation Index.
- First load downloads the verse corpus (~18MB); Cloudflare caches it via `_headers`.
- Rebuild verse data with `npm run build:scriptures` when sources change.
