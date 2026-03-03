**Prereqs**
1. Create free accounts: Neon.tech, Cloudinary, Railway, Vercel.

**Backend (Railway + Neon + Cloudinary)**
1. Create a Neon project and database named `doordb`. Copy the connection string.
2. Create a Cloudinary account and get `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. In Railway, create a new project from this repo and set the root to `backend/`.
4. Generate a JWT secret (run locally): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. In Railway, add these environment variables:
6. `PORT=3737`
7. `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/doordb` (use Neon string)
8. `JWT_SECRET=` (use the command output)
9. `CLOUDINARY_CLOUD_NAME=`
10. `CLOUDINARY_API_KEY=`
11. `CLOUDINARY_API_SECRET=`
12. `FRONTEND_URL=https://your-vercel-app.vercel.app`
13. `NODE_ENV=production`
14. `BASE_URL=https://your-railway-app.railway.app`
15. Deploy. Wait for the build to finish.
16. Verify health (run locally): `curl -s https://your-railway-app.railway.app/health`.

**Frontend (Vercel)**
1. In Vercel, import this repo and set the root to `frontend/`.
2. In Vercel, add the environment variable:
3. `VITE_API_URL=https://your-railway-app.railway.app`
4. Deploy. Wait for the build to finish.
5. Open `https://your-vercel-app.vercel.app` and load the app.

**Local Commands (optional sanity checks)**
1. `cd /Users/homefolder/Projects/door-production`
2. `git status`

**Verify It Works**
1. Backend health: `https://your-railway-app.railway.app/health`.
2. API list: `https://your-railway-app.railway.app/api/listings` should return JSON.
3. Frontend loads and can fetch listings.

**Expected URL Formats**
1. Backend: `https://<railway-service>.railway.app`
2. Frontend: `https://<vercel-project>.vercel.app`
