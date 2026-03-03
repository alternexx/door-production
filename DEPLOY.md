# DOOR — Deployment Guide

## Current Status

**Local Production** (running now):
- App: `http://localhost:4000` (serves frontend + API)
- DB: PostgreSQL `localhost:5432/doordb`
- Public: PM2-managed Cloudflare tunnel

## Services (PM2-managed, auto-restart)

```bash
pm2 status                    # check status
pm2 logs                      # view logs
pm2 restart all               # restart all services
pm2 restart door-api          # restart API only
```

PM2 processes:
- `door-api` — Express API (port 4000) + serves built React frontend
- `door-tunnel` — Cloudflare Quick Tunnel (public URL)

**Note:** Quick tunnel URL changes on restart. Run this to get current URL:
```bash
curl -s http://localhost:20241/metrics | grep -o '"https://[^"]*"' | tr -d '"'
```

## Database Access

```bash
/opt/homebrew/Cellar/postgresql@16/16.13/bin/psql "postgresql://door_user:door_secure_2026@localhost:5432/doordb"
```

Tables: `users`, `qual_profiles`, `listings`, `bookings`, `documents`, `chat_messages`

## Rebuild Frontend

```bash
cd /Users/homefolder/Projects/door-production/frontend
npm run build
pm2 restart door-api  # to serve new build
```

---

## Cloud Deployment (Railway + Vercel + Neon)

### Step 1: Create GitHub Repo

```bash
gh auth login
cd /Users/homefolder/Projects/door-production
gh repo create door-production --private --source=. --push
```

### Step 2: Neon PostgreSQL (cloud DB)

1. Go to https://neon.tech → Create account
2. Create project: `door-production`
3. Copy connection string (starts with `postgres://`)

### Step 3: Deploy Backend to Railway

```bash
railway login
cd /Users/homefolder/Projects/door-production/backend
railway init
railway add --name door-api
railway domain  # get your public URL
```

Set environment variables in Railway dashboard:
```
DATABASE_URL=<neon-connection-string>
JWT_SECRET=door-production-jwt-secret-2026-mark-alternex-secure
NODE_ENV=production
PORT=3737
FRONTEND_URL=https://your-vercel-domain.vercel.app
```

### Step 4: Deploy Frontend to Vercel

```bash
vercel login
cd /Users/homefolder/Projects/door-production/frontend
vercel --prod
```

Set environment variable:
```
VITE_API_URL=https://your-railway-domain.railway.app/api
```

### Step 5: Rebuild + Re-deploy Frontend

After setting VITE_API_URL:
```bash
cd frontend && npm run build
vercel --prod
```

---

## Environment Variables

### Backend (Railway)
| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | `door-production-jwt-secret-2026-mark-alternex-secure` |
| `NODE_ENV` | `production` |
| `PORT` | `3737` |
| `CLOUDINARY_CLOUD_NAME` | (optional) Cloudinary name |
| `CLOUDINARY_API_KEY` | (optional) |
| `CLOUDINARY_API_SECRET` | (optional) |
| `FRONTEND_URL` | Vercel URL |

### Frontend (Vercel)
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-railway-url/api` |

---

## Optional: Cloudinary (Production File Storage)

1. Create account at cloudinary.com
2. Get credentials from dashboard
3. Add to Railway env vars
4. Files auto-route to Cloudinary when env vars are set

Without Cloudinary, files upload to local disk (works fine for demos/testing).

---

*Built by Alternex for Mark.*
