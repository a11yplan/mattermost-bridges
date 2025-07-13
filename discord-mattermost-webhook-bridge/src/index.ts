import { Serve } from 'bun';
import { transformDiscordToMattermost } from './transformer';
import { DiscordWebhookPayload } from './types';
import { config } from './config';
import { logger } from './logger';

const server = Bun.serve({
  port: config.port,
  
  // Health check endpoint
  fetch(req) {
    const url = new URL(req.url);
    
    // Handle health check requests
    if (req.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle OPTIONS requests (for CORS)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Main webhook handler
    return this.handleWebhook(req);
  },
  
  // Handle the webhook request
  async handleWebhook(req: Request) {
    const url = new URL(req.url);
    logger.info(`Received request: ${req.method} ${url.pathname}`);

    // Only handle POST requests to the root path
    if (req.method !== 'POST' || url.pathname !== '/') {
      logger.warn('Invalid request method or path');
      return new Response('Invalid request', { status: 404 });
    }

    // Get the mattermost webhook URL from the query parameter
    const mattermostUrl = url.searchParams.get('url') || config.defaultMattermostWebhookUrl;
    if (!mattermostUrl) {
      logger.error('Missing Mattermost webhook URL in query parameters');
      return new Response('Missing Mattermost webhook URL. Please provide a ?url= parameter or set DEFAULT_MATTERMOST_WEBHOOK_URL env variable.', {
        status: 400,
      });
    }

    try {
      // Parse the Discord webhook payload
      const discordPayload: DiscordWebhookPayload = await req.json();
      logger.info('Received Discord webhook payload');

      // Transform Discord payload to Mattermost format
      const mattermostPayload = transformDiscordToMattermost(discordPayload);

      // Forward to Mattermost webhook
      logger.info(`Forwarding to Mattermost webhook: ${mattermostUrl.substring(0, 30)}...`);
      
      // Set up timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);
      
      try {
        const response = await fetch(mattermostUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mattermostPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const responseText = await response.text();
          logger.error(`Error sending to Mattermost: ${response.status}`, responseText);
          return new Response(`Error forwarding to Mattermost: ${response.status}`, {
            status: 502,
          });
        }

        logger.info('Successfully forwarded to Mattermost');
        return new Response('Webhook forwarded to Mattermost successfully', {
          status: 200,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      logger.error('Error processing webhook:', error);
      return new Response(`Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        status: 500,
      });
    }
  }
});

logger.info(`Discord to Mattermost webhook bridge running on http://localhost:${config.port}`);
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info('Usage: POST to this server with Discord webhook payload');
logger.info('Make sure to include the Mattermost webhook URL as a query parameter: ?url=https://your-mattermost-webhook-url');