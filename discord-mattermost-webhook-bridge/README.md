# Discord to Mattermost Webhook Bridge

A serverless bridge that transforms Discord webhook payloads to Mattermost webhook format, allowing Discord notifications to be seamlessly displayed in Mattermost.

## Features

- Accepts Discord webhook payloads and forwards them to Mattermost
- Transforms Discord message formatting to Mattermost format
- Converts Discord embeds to Mattermost attachments
- Preserves usernames, avatars, and formatting
- Fixes timestamp formatting from Discord's `<t:timestamp:format>` to human-readable dates
- Handles emoji formatting to display correctly in Mattermost
- Includes health check endpoint for monitoring
- Ready for deployment on Cloudflare Workers or as a standalone service

## Quick Start

### Deploy to Cloudflare Workers (Recommended)

The easiest way to deploy is using our installation script:

```bash
# Clone the repository
git clone https://github.com/yourusername/discord-mattermost-webhook-bridge.git
cd discord-mattermost-webhook-bridge

# Run the installation and deployment script
./install-and-deploy.sh
```

After deployment, your webhook will be available at:
```
https://discord-mattermost-webhook-bridge.your-subdomain.workers.dev/?url=your-mattermost-webhook-url
```

### Manual Setup

1. Make sure you have [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/) installed
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. For Cloudflare Workers deployment:
   ```bash
   npx wrangler deploy
   ```

## Usage

To use this webhook bridge:

1. Set up a Mattermost Incoming Webhook in your Mattermost server settings
2. Copy the Mattermost webhook URL
3. Configure your Discord app/bot to send webhooks to:
   ```
   https://your-worker.workers.dev/?url=https://your-mattermost-webhook-url
   ```
   (Make sure to URL-encode the Mattermost webhook URL parameter)

4. You can also set a default Mattermost webhook URL in your Cloudflare Workers settings

## Configuration

### Cloudflare Workers Environment Variables

Configure these in Cloudflare Workers settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_MATTERMOST_WEBHOOK_URL` | Default Mattermost webhook URL (optional) | - |
| `LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` |
| `LOG_PAYLOADS` | Enable detailed payload logging (may contain sensitive data) | `false` |
| `REQUEST_TIMEOUT` | Timeout for Mattermost webhook requests (ms) | `10000` |

## Testing Your Deployment

1. Check the health endpoint:
   ```
   curl https://your-worker.workers.dev/health
   ```
   
   Should return: `{"status":"ok"}`

2. Send a test Discord webhook payload:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Test message from Discord",
       "username": "Test Bot",
       "avatar_url": "https://example.com/avatar.png"
     }' \
     "https://your-worker.workers.dev/?url=your-mattermost-webhook-url"
   ```

## Local Development

For local development and testing:

```bash
# Test with Cloudflare Workers locally
npm run dev:worker

# Or run the standalone server with Bun
bun run dev
```

## Troubleshooting

If you see "Not found" errors, ensure you're:

1. Using the root path `/` for webhook POSTs
2. Properly including the `url` query parameter with the Mattermost webhook URL
3. Making a POST request (not GET)

## License

MIT