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

Static Vite app — no Wrangler required. Connect the repo in **Workers & Pages → Create → Pages → Connect to Git**, then use:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |

Leave **Deploy command** empty (Pages publishes `dist` after the build).

Add the custom domain `scriptday.ensign.quest` under the project’s **Custom domains** tab.

If an older setup still runs `npx wrangler deploy`, clear that deploy command and remove any `wrangler.toml` expectation — this repo is assets-only.

## Notes

- Progress and notes stay in the browser (`localStorage`).
- Reference links include Gospel Library and the BYU Scripture Citation Index.
- First load downloads the verse corpus (~18MB); Cloudflare caches it via `_headers`.
- Rebuild verse data with `npm run build:scriptures` when sources change.
