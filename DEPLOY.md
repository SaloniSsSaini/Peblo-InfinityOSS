# Peblo InfinityOS — seedha deploy (ek command)

Tumhe **sirf Docker** chahiye. Postgres, Redis, API, Web — sab containers me chalega.

---

## Windows / Mac (local test ya server)

1. **Docker Desktop** install karo aur chalu rakho  
   https://www.docker.com/products/docker-desktop/

2. Project folder me terminal:

```powershell
cd "d:\Peblo InfinityOS"
npm run deploy
```

3. Script puchega: **Server IP** — local test ke liye `localhost` likho  
4. 5–15 minute wait (pehli baar build)  
5. Browser: **http://localhost:3000**  
   Demo: `demo@peblo.infinityos.app` / `DemoInfinity2026!`

---

## Linux VPS (DigitalOcean, Hetzner, AWS, etc.)

```bash
# Docker install (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# logout/login, then:

git clone <YOUR_REPO_URL> peblo
cd peblo
chmod +x scripts/deploy.sh
./scripts/deploy.sh
# IP puchhega — apna VPS IP daalo (e.g. 203.0.113.5)
```

Firewall me ports **3000** aur **4000** kholo.

Browser: `http://YOUR_VPS_IP:3000`

---

## Baad me

| Kaam | Command |
|------|---------|
| Logs | `docker compose -f docker-compose.prod.yml --env-file .env.deploy logs -f` |
| Band karo | `docker compose -f docker-compose.prod.yml --env-file .env.deploy down` |
| Dubara build | `npm run deploy` |

---

## Production extras (optional)

`.env.deploy` edit karo:

| Variable | Kyon |
|----------|------|
| `OPENAI_API_KEY` | Asli AI summaries |
| `MAIL_FROM` + `RESEND_API_KEY` | Password reset email |
| `DEMO_PASSWORD` | Demo password badalna |
| `PUBLIC_*` + `WEB_ORIGIN` | HTTPS domain (Nginx/Caddy ke baad) |

HTTPS ke liye domain + reverse proxy (Caddy/Nginx) alag step — bina iske bhi HTTP par chal jayega.

---

## Files

- `docker-compose.prod.yml` — full stack  
- `.env.deploy` — secrets (auto-created, git me mat commit karo)  
- `scripts/deploy.ps1` / `scripts/deploy.sh` — one-click  
