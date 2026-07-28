# Scripture Everyday

A quiet, local-first scripture study app that rotates through the standard works one verse at a time.

## Features

- **Volumes:** Book of Mormon, Holy Bible (KJV + World English Bible), Pearl of Great Price, Doctrine and Covenants
- **Round-robin rotation:** BoM → Bible → PoGP → D&C, with a random unread verse in each volume
- **Three columns:** verse text, study reference links, impressions notebook
- **Tags:** LDS gospel-topic style subjects
- **Local storage:** progress, notes, and stats stay in your browser
- **Export:** download notes as Markdown or JSON

## Scripture sources

Public-domain texts:

- LDS volumes via [bcbooks/scriptures-json](https://github.com/bcbooks/scriptures-json)
- Bible KJV + WEB via [midvash/bible-data](https://github.com/midvash/bible-data)

Rebuild verse data anytime:

```bash
npm run build:scriptures
```

## Develop

```bash
npm install
npm run build:scriptures
npm run dev
```

## Deploy on Cloudflare Pages

### Option A — GitHub integration (recommended)

1. Push this repo to GitHub (already set up if you cloned from the project remote).
2. In the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the `scripture-everyday` repository.
4. Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `20` (set env var `NODE_VERSION=20`) |

5. Save and deploy. Later pushes to `main` redeploy automatically.

### Option B — Wrangler CLI

```bash
npm install
npx wrangler login
npm run deploy
```

That builds the site and uploads `dist/` to the Cloudflare Pages project named `scripture-everyday`.

## Notes

- Marked verses are remembered so you do not repeat until a volume is exhausted (then it continues randomly).
- Reference links include Gospel Library, BYU Scripture Citation Index, and Bible study sites for Bible verses.
- First load downloads the verse corpus (~18MB); Cloudflare caches it via `_headers`.
