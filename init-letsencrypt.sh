#!/bin/bash
# Run this ONCE on the server before starting the full stack.
# It obtains the initial Let's Encrypt certificate for nginx.
#
# Usage:
#   chmod +x init-letsencrypt.sh
#   ./init-letsencrypt.sh

set -e

DOMAIN="dashboard.greatwallgardens.estate"
EMAIL="admin@greatwallgardens.estate"   # Change to your real admin email
STAGING=0                               # Set to 1 to test without hitting LE rate limits

echo "==> Starting nginx on HTTP only to serve ACME challenge..."

# Temporarily use an HTTP-only nginx config so nginx can start before certs exist
docker compose run --rm --entrypoint "" nginx \
  nginx -g "daemon off;" &
NGINX_PID=$!
sleep 3

echo "==> Requesting certificate from Let's Encrypt..."

STAGING_FLAG=""
if [ "$STAGING" -eq 1 ]; then
  STAGING_FLAG="--staging"
  echo "    (staging mode — cert will not be trusted by browsers)"
fi

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING_FLAG \
  -d "$DOMAIN"

kill $NGINX_PID 2>/dev/null || true

echo ""
echo "==> Certificate obtained. Now start the full stack:"
echo "    docker compose up -d --build"
