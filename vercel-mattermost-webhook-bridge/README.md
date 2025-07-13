# Vercel-Mattermost Webhook Bridge

A Cloudflare Worker that bridges Vercel deployment webhooks to Mattermost notifications with rich formatting.

## Features

- 🚀 Real-time deployment notifications
- 📊 Rich formatting with fields and attachments
- 🔗 Quick access buttons to deployment and project dashboards
- 🛡️ Failsafe error handling ensures notifications always go through
- 🔄 Support for multiple Mattermost webhooks via query parameters

## Supported Events

- **Deployment Started** - When a new deployment begins
- **Deployment Ready** - When deployment completes successfully
- **Deployment Failed** - When deployment encounters errors
- **Deployment Canceled** - When deployment is canceled

## Usage

### 1. Deploy to Cloudflare Workers

```bash
npm install
wrangler deploy
```

### 2. Configure Vercel Webhook

Add a webhook in your Vercel project settings pointing to:

```
https://your-worker.workers.dev/webhook?webhook_url=YOUR_MATTERMOST_WEBHOOK_URL
```

Or if you have a default webhook configured:

```
https://your-worker.workers.dev/webhook
```

### 3. Webhook URL Options

You can provide the Mattermost webhook URL in two ways:

1. **Query Parameter** (recommended for multiple webhooks):
   ```
   https://your-worker.workers.dev/webhook?webhook_url=https://mattermost.example.com/hooks/xxx
   ```

2. **Environment Variable** (for single webhook):
   ```bash
   wrangler secret put MATTERMOST_WEBHOOK_URL
   ```

## Notification Format

Each notification includes:

- **Color-coded status** (green for success, red for errors, etc.)
- **Project information** with direct links
- **Deployment details** (environment, branch, commit info)
- **Action buttons** for quick access to:
  - Live deployment URL
  - Deployment inspector
  - Project dashboard
- **Error messages** (when applicable)

## Development

Run locally:

```bash
npm run dev
```

Test webhooks:

```bash
# Using environment variable
node test/test-webhook.js

# Using custom webhook URL
node test/test-webhook.js --webhook-url=https://your-mattermost.com/hooks/xxx
```

## Configuration

Set up your `.dev.vars` file for local development:

```
MATTERMOST_WEBHOOK_URL=https://your-mattermost.com/hooks/xxx
```

## Error Handling

The bridge includes comprehensive error handling:

- Validates incoming webhook data
- Provides fallback formatting if data is missing
- Always attempts to send a notification, even with partial data
- Logs errors for debugging while ensuring delivery