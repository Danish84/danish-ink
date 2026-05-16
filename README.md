# danish.ink

A personal twice-daily curated world-news digest. A scheduled agent fetches headlines from a set of global RSS feeds and uses Claude Sonnet to synthesize them into a single narrative briefing — published morning and evening.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000> in a browser.

## Deployed URL

Not yet deployed. This README will be updated with the live URL once Vercel is wired up.

## Stack

- **Framework:** Next.js (App Router, TypeScript, Turbopack)
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (`base-nova` style, `neutral` palette)
- **Hosting:** Vercel
- **Persistence:** Supabase (planned)
- **Scheduled agent:** GitHub Actions cron (planned)

## Scripts

| Script          | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the local dev server on `:3000` |
| `npm run build` | Production build                      |
| `npm run start` | Run the production build locally      |
| `npm run lint`  | Run ESLint                            |
