#!/bin/bash
set -e

APP_DIR="/opt/thanamol-crm"

echo "=== Deploying PropertyFlow CRM ==="

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone or pull
if [ -d "$APP_DIR/.git" ]; then
  echo "Pulling latest..."
  cd $APP_DIR
  git fetch --all
  git checkout main
  git reset --hard origin/main
else
  echo "Cloning repository..."
  cd /opt
  git clone --branch main --single-branch /tmp/thanamol-crm-deploy $APP_DIR
  cd $APP_DIR
fi

# Copy deploy files
cp deploy/.env.prod deploy/.env 2>/dev/null || true

# Build and start
cd deploy
echo "Building containers..."
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod down 2>/dev/null || true
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "Waiting for services..."
sleep 10

# Check health
echo "Checking API health..."
curl -sf http://localhost:3000/api/health || echo "API not ready yet, check logs with: sudo docker compose -f docker-compose.prod.yml logs api"

echo ""
echo "=== Deploy complete ==="
echo "App: https://ecm.thanamol.com"
echo "Admin: admin@thanamol.com / password123"
