# danish.ink

A personal twice-daily curated world-news digest. A scheduled agent fetches headlines from a set of global RSS feeds and uses Claude Sonnet to synthesize them into a single narrative briefing — published morning and evening.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000> in a browser.

Required local environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `ADMIN_KEY` for `/admin?key=...`

For Vercel deployments, set `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, and `ADMIN_KEY`.
`SUPABASE_SECRET_KEY` is server-only and powers admin actions plus the pending
arcs count; do not expose it to client-side code.

## Deployed URL

<https://danish-ink.vercel.app/>

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
