#!/bin/bash
# DOOR Production — Start Script
set -e

cd /Users/homefolder/Projects/door-production

echo "🚪 Starting DOOR Production..."

# Check PostgreSQL
/opt/homebrew/Cellar/postgresql@16/16.13/bin/pg_ctl status -D /opt/homebrew/var/postgresql@16 2>/dev/null || {
  echo "Starting PostgreSQL..."
  /opt/homebrew/Cellar/postgresql@16/16.13/bin/pg_ctl start -D /opt/homebrew/var/postgresql@16 2>/dev/null || true
  sleep 2
}

# Restart PM2 processes
pm2 restart all 2>/dev/null || pm2 start ecosystem.config.js
pm2 save

sleep 5

# Get tunnel URL
TUNNEL_URL=""
for port in 20241 20242 20243 20244 20245; do
  result=$(curl -s --max-time 2 http://localhost:$port/metrics 2>/dev/null | grep "userHostname" | grep -o '"https://[^"]*"' | tr -d '"')
  if [ -n "$result" ]; then
    TUNNEL_URL="$result"
    break
  fi
done

# Wait for tunnel if not ready
if [ -z "$TUNNEL_URL" ]; then
  echo "Waiting for Cloudflare tunnel..."
  sleep 8
  for port in 20241 20242 20243 20244 20245; do
    result=$(curl -s --max-time 2 http://localhost:$port/metrics 2>/dev/null | grep "userHostname" | grep -o '"https://[^"]*"' | tr -d '"')
    if [ -n "$result" ]; then
      TUNNEL_URL="$result"
      break
    fi
  done
fi

echo ""
echo "✅ DOOR is LIVE!"
echo "   Local:  http://localhost:4000"
if [ -n "$TUNNEL_URL" ]; then
  echo "   Public: $TUNNEL_URL"
fi
echo ""
