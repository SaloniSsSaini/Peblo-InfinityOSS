# Frontend-only portfolio demo (Vercel)

Deploy **only** `apps/web` to Vercel — no Render API or PostgreSQL.

## Vercel environment

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_DEMO_MODE` | `1` (default if unset) |

Set `NEXT_PUBLIC_DEMO_MODE=0` only if you connect a real API (`NEXT_PUBLIC_API_URL`).

## Demo login

- Email: `demo@peblo.infinityos.app`
- Password: `DemoInfinity2026!`

Data persists in **localStorage** (`peblo-infinityos-auth`, `peblo-infinityos-demo-data`).

## Local dev

```bash
cp apps/web/.env.local.example apps/web/.env.local
npm run dev:web
```
