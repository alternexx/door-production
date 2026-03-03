#!/bin/bash
# DOOR Production Startup Script
set -e

echo "🚪 Starting DOOR Production Stack..."

# Start PostgreSQL
echo "📦 Starting PostgreSQL..."
brew services start postgresql@16 2>/dev/null || true
sleep 2

# Start API via PM2
echo "⚡ Starting DOOR API..."
cd /Users/homefolder/Projects/door-production
pm2 start ecosystem.config.js --update-env 2>/dev/null || pm2 restart door-api 2>/dev/null

sleep 2

# Verify API is up
curl -s http://localhost:4000/api/health > /dev/null && echo "✅ API running on :4000" || echo "❌ API failed"

# Start frontend server
echo "🌐 Starting frontend..."
pkill -f "serve.*4001" 2>/dev/null || true
sleep 1
cd /Users/homefolder/Projects/door-production/frontend/dist
nohup npx serve -s . -p 4001 > /tmp/door-frontend.log 2>&1 &
sleep 2
curl -s http://localhost:4001 -o /dev/null && echo "✅ Frontend running on :4001" || echo "❌ Frontend failed"

# Create public tunnels
echo "🌍 Creating Cloudflare tunnels..."
pkill -f "cloudflared.*4000" 2>/dev/null || true
pkill -f "cloudflared.*4001" 2>/dev/null || true
sleep 1

nohup cloudflared tunnel --url http://localhost:4000 --no-autoupdate > /tmp/tunnel-api.log 2>&1 &
nohup cloudflared tunnel --url http://localhost:4001 --no-autoupdate > /tmp/tunnel-frontend.log 2>&1 &

echo "⏳ Waiting for tunnels..."
sleep 6

API_URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/tunnel-api.log 2>/dev/null | head -1)
FRONTEND_URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/tunnel-frontend.log 2>/dev/null | head -1)

echo ""
echo "======================================================"
echo "🚪 DOOR is LIVE!"
echo ""
echo "  Frontend: $FRONTEND_URL"
echo "  API:      $API_URL"
echo ""
echo "  Local Frontend: http://localhost:4001"
echo "  Local API:      http://localhost:4000"
echo "======================================================"
echo ""
echo "📊 DB: psql \"postgresql://door_user:door_secure_2026@localhost:5432/doordb\""
