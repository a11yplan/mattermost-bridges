# Mattermost Bridges

A unified package for converting webhook formats to Mattermost notifications with rich message styling, attachments, and fields. Built with Deno and deployable on Cloudflare Workers.

## Features

- 🔄 **Modular Bridge System**: Support for Discord and Vercel webhooks
- 🎨 **Rich Formatting**: Converts to Mattermost attachments with colors, fields, and actions
- ⚡ **Cloudflare Workers**: Serverless deployment with global edge locations
- 🦕 **Deno Runtime**: Modern TypeScript runtime with built-in security
- 🌐 **CORS Support**: Browser-friendly for client-side integrations
- 📊 **Health Monitoring**: Built-in health check endpoint

## Supported Platforms

### Discord Webhooks
Converts Discord embed messages to Mattermost attachments with:
- Color preservation
- Timestamp formatting
- Emoji cleanup
- Field mapping
- Author and footer information

### Vercel Webhooks
Transforms Vercel deployment notifications with:
- Deployment status indicators
- Project and environment information
- Git commit details
- Action buttons for quick access
- Error handling for failed deployments

## Quick Start

### Local Development

```bash
# Clone and enter directory
cd mattermost-bridges

# Run development server
deno task dev

# Test the endpoints
curl -X POST "http://localhost:8000/vercel?url=YOUR_MATTERMOST_WEBHOOK" \
     -H "Content-Type: application/json" \
     -d '{"project": {"name": "test"}, "deployment": {"url": "test.vercel.app"}}'
```

### Cloudflare Workers Deployment

```bash
# Install Wrangler CLI (if not installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler deploy

# Or use the Deno deploy script
deno task deploy
```

## API Endpoints

### POST /discord
Converts Discord webhook payloads to Mattermost format.

**Query Parameters:**
- `url` (required): Your Mattermost webhook URL

**Example:**
```bash
curl -X POST "https://your-worker.workers.dev/discord?url=MATTERMOST_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Hello from Discord!",
       "username": "Discord Bot",
       "embeds": [{
         "title": "Sample Embed",
         "description": "This is a test embed",
         "color": 5814783
       }]
     }'
```

### POST /vercel
Converts Vercel webhook payloads to Mattermost format.

**Query Parameters:**
- `url` (required): Your Mattermost webhook URL

**Example:**
```bash
curl -X POST "https://your-worker.workers.dev/vercel?url=MATTERMOST_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{
       "user": {"id": "user123"},
       "team": {"id": "team123"},
       "project": {"id": "proj123", "name": "my-app"},
       "deployment": {
         "id": "dpl123",
         "url": "my-app-abc123.vercel.app",
         "target": "production",
         "meta": {
           "githubCommitMessage": "Fix bug in auth",
           "githubCommitAuthorLogin": "developer",
           "githubCommitSha": "abc1234567890"
         }
       },
       "links": {
         "deployment": "https://vercel.com/project/deployment",
         "project": "https://vercel.com/project"
       }
     }'
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "endpoints": ["/discord", "/vercel"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Configuration

### Environment Variables

Set your default Mattermost webhook URL (optional):

```bash
# For local development
export MATTERMOST_WEBHOOK_URL="https://your-mattermost.com/hooks/your-webhook-id"

# For Cloudflare Workers
wrangler secret put MATTERMOST_WEBHOOK_URL
```

### Custom Domain (Optional)

Add to `wrangler.toml`:

```toml
[[env.production.routes]]
pattern = "bridges.yourdomain.com/*"
```

## Example Integration

### With Vercel Projects

1. Go to your Vercel project settings
2. Add a webhook with URL: `https://your-worker.workers.dev/vercel?url=YOUR_MATTERMOST_WEBHOOK`
3. Select events: deployment-ready, deployment-error
4. Save and test

### With Discord Bots

```javascript
// In your Discord bot
const mattermostBridge = 'https://your-worker.workers.dev/discord?url=YOUR_MATTERMOST_WEBHOOK';

await fetch(mattermostBridge, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Hello from Discord!',
    embeds: [{ title: 'Test', description: 'This is a test' }]
  })
});
```

## Development

### Project Structure

```
src/
├── main.ts                 # Main server and routing logic
├── types.ts               # TypeScript type definitions
├── deploy.ts              # Deployment script
└── transformers/
    ├── discord.ts         # Discord to Mattermost transformer
    └── vercel.ts          # Vercel to Mattermost transformer
```

### Adding New Bridges

1. Create a new transformer in `src/transformers/`
2. Add types to `src/types.ts`
3. Add route handler in `src/main.ts`
4. Update README with usage examples

### Testing

```bash
# Test Discord bridge
deno run --allow-net test_discord.ts

# Test Vercel bridge  
deno run --allow-net test_vercel.ts
```

## License

MIT License - see LICENSE file for details.

<!-- Deploy trigger: 2025-07-13 -->