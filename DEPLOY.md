# DOOR — Production Deployment Guide

## Current Status: ✅ RUNNING LOCALLY

- **API:** http://localhost:4000 (publicly via Cloudflare tunnel)
- **Frontend:** http://localhost:4001 (publicly via Cloudflare tunnel)
- **Database:** PostgreSQL @ localhost:5432/doordb
- **DB Credentials:** door_user / door_secure_2026

## Public URLs (Cloudflare Quick Tunnels — refresh on restart)
These are temporary. For permanent URLs, deploy to Railway/Vercel below.

## To Deploy to Cloud (ONE-TIME SETUP — ~10 minutes)

### Step 1: Create Free Accounts
1. **Railway** (backend) → https://railway.app — Sign up with GitHub
2. **Vercel** (frontend) → https://vercel.com — Sign up with GitHub
3. **Neon** (Postgres) → https://neon.tech — Sign up with GitHub
4. **Cloudinary** (file uploads) → https://cloudinary.com — Free account

### Step 2: Get Neon DB URL
After signup, create project "door-production" → copy the connection string

### Step 3: Deploy Backend to Railway
```bash
cd /Users/homefolder/Projects/door-production/backend
railway login
railway init
railway up

# Set env vars in Railway dashboard:
DATABASE_URL=<your-neon-connection-string>
JWT_SECRET=door-production-jwt-secret-2026-mark-alternex-secure
CLOUDINARY_CLOUD_NAME=<from-cloudinary>
CLOUDINARY_API_KEY=<from-cloudinary>
CLOUDINARY_API_SECRET=<from-cloudinary>
FRONTEND_URL=<your-vercel-url>
NODE_ENV=production
```

### Step 4: Run DB Migrations
```bash
DATABASE_URL=<neon-url> node migrate.js
```

### Step 5: Deploy Frontend to Vercel
```bash
cd /Users/homefolder/Projects/door-production/frontend
vercel login
# Set VITE_API_URL=https://<your-railway-url>/api
vercel --prod
```

## API Endpoints Reference

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in → get JWT token
- `GET /api/auth/me` — Get current user

### Qualification
- `POST /api/qual/submit` — Run ID + income + credit verification
- `GET /api/qual/profile` — Get qual profile

### Listings
- `GET /api/listings` — All listings with AI match scores
- `GET /api/listings/:id` — Single listing
- `POST /api/listings` — Create listing (owner/broker role)

### Bookings
- `POST /api/bookings` — 1-tap book with QR key generation
- `GET /api/bookings/mine` — My bookings
- `DELETE /api/bookings/:id` — Cancel booking

### Documents
- `POST /api/uploads/document` — Upload file (multipart)
- `GET /api/uploads/my-documents` — My documents
- `DELETE /api/uploads/document/:id` — Delete document

## Database Access (Dev)
```bash
psql "postgresql://door_user:door_secure_2026@localhost:5432/doordb"

# Useful queries:
SELECT * FROM users;
SELECT * FROM qual_profiles;
SELECT * FROM listings WHERE active = true;
SELECT * FROM bookings;
SELECT * FROM documents;
```

## Restart Services (if machine restarts)
```bash
# Start PostgreSQL
brew services start postgresql@16

# Start API
cd /Users/homefolder/Projects/door-production/backend
PORT=4000 nohup node server.js > /tmp/door-api.log 2>&1 &

# Start Frontend
cd /Users/homefolder/Projects/door-production/frontend/dist
nohup npx serve -s . -p 4001 > /tmp/door-frontend.log 2>&1 &

# Create tunnels (generates new URLs each time)
cloudflared tunnel --url http://localhost:4000 > /tmp/tunnel-api.log 2>&1 &
cloudflared tunnel --url http://localhost:4001 > /tmp/tunnel-frontend.log 2>&1 &
sleep 5
grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/tunnel-api.log | head -1
grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/tunnel-frontend.log | head -1
```
