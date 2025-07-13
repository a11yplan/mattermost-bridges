#!/bin/bash

# Install dependencies
npm install

# Check environment
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example"
  cp .env.example .env
  echo "Please edit .env with your configuration and run this script again."
  exit 1
fi

# Install wrangler if not installed
if ! command -v wrangler &> /dev/null; then
  echo "Installing wrangler globally..."
  npm install -g wrangler
fi

# Login to Cloudflare
echo "Logging into Cloudflare..."
wrangler login

# Deploy to Cloudflare Workers
echo "Deploying to Cloudflare Workers..."
npm run deploy

echo "Deployment complete! Your webhook bridge is now available."
echo "Use https://discord-mattermost-webhook-bridge.your-subdomain.workers.dev/?url=your-mattermost-webhook-url to receive Discord webhooks."