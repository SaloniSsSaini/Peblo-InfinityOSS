# Deploy API to Render (PostgreSQL + Docker)

**Frontend (Vercel):** https://peblo-infinity-oss-web.vercel.app  
**API (Render):** set `NEXT_PUBLIC_API_URL` on Vercel to your Render service URL (e.g. `https://peblo-infinityos-api.onrender.com`).

---

## Option A — One-click Blueprint (recommended)

1. Push this repo to GitHub.
2. Open [Render Blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance**.
3. Connect the repo — Render reads `render.yaml` and creates:
   - **PostgreSQL** `peblo-infinityos-db`
   - **Web Service** `peblo-infinityos-api` (Docker, port 10000)
4. Render injects `DATABASE_URL` automatically from the database.
5. After deploy, open **Environment** and optionally set:
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (or keep auto-generated)
   - `OPENAI_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM` for full features
6. Copy the service URL → Vercel `NEXT_PUBLIC_API_URL`.

Health check: `https://<your-api>.onrender.com/api/health`

---

## Option B — Neon (free tier, Vercel/Render compatible)

1. Create a project at [neon.tech](https://neon.tech).
2. Create database `peblo_infinityos`.
3. Copy **connection string** (use **pooled** for `DATABASE_URL` in production).
4. For `prisma migrate deploy`, use the **direct** (non-pooler) URL once, or run migrations from Render shell.

```env
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

---

## Option C — Supabase

1. New project → **Settings → Database**.
2. Copy **URI** connection string (Session mode for migrations, Transaction pooler for serverless optional).

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

---

## Local production `.env` (apps/api/.env)

```powershell
cd "d:\Peblo InfinityOS"
copy apps\api\.env.production.example apps\api\.env
# Edit DATABASE_URL with your real External URL from Render/Neon/Supabase
notepad apps\api\.env
```

Then verify:

```powershell
cd apps\api
npm install --ignore-scripts
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ..\..
npm run build:api
```

---

## Render manual env (if not using Blueprint)

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `WEB_ORIGIN` | `https://peblo-infinity-oss-web.vercel.app` |
| `DATABASE_URL` | From Render Postgres **Internal** URL (service) or **External** (local CLI) |
| `JWT_ACCESS_SECRET` | Long random string |
| `JWT_REFRESH_SECRET` | Long random string |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Can't reach database` | Use **External** URL locally; **Internal** URL only from Render services |
| Prisma migrate fails on Neon pooler | Run migrate with **direct** connection string |
| CORS blocked | `WEB_ORIGIN` must match Vercel URL exactly (no trailing slash) |
| Placeholder DB host | Replace `your-db-host.render.com` with real URL from dashboard |
