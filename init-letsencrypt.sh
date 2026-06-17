#!/bin/bash
# Run this ONCE on the server to obtain the initial SSL certificate.
# Requires: Docker installed, port 80 open, DNS pointing to this server.
#
# Usage:
#   chmod +x init-letsencrypt.sh
#   sudo ./init-letsencrypt.sh

set -e

DOMAIN="dashboard.greatwallgardens.estate"
EMAIL="admin@greatwallgardens.estate"
STAGING=0   # Set to 1 to test without hitting Let's Encrypt rate limits

STAGING_FLAG=""
if [ "$STAGING" -eq 1 ]; then
  STAGING_FLAG="--staging"
  echo "  (staging mode — cert will not be browser-trusted)"
fi

echo "==> Requesting certificate for $DOMAIN ..."

docker run --rm \
  -p 80:80 \
  -v certbot-certs:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  certbot/certbot certonly \
  --standalone \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING_FLAG \
  -d "$DOMAIN"

echo ""
echo "==> Certificate obtained. Start the stack with: docker compose up -d"
