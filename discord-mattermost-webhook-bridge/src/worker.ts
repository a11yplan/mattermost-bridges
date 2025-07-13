import { transformDiscordToMattermost } from './transformer';
import { DiscordWebhookPayload } from './types';

// Configure environment
const config = {
  logLevel: (typeof ENV !== 'undefined' && ENV?.LOG_LEVEL) || 'info',
  logPayloads: (typeof ENV !== 'undefined' && ENV?.LOG_PAYLOADS === 'true') || false,
  requestTimeout: (typeof ENV !== 'undefined' && ENV?.REQUEST_TIMEOUT) 
    ? parseInt(ENV.REQUEST_TIMEOUT, 10) 
    : 10000,
  defaultMattermostWebhookUrl: (typeof ENV !== 'undefined' && ENV?.DEFAULT_MATTERMOST_WEBHOOK_URL) || ''
};

// Setup logger
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const configuredLevel = (config.logLevel as LogLevel) || 'info';

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
};

const logger = {
  debug: (message: string, ...args: any[]): void => {
    if (shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]): void => {
    if (shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]): void => {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  
  payload: (message: string, payload: any): void => {
    if (shouldLog('debug') && config.logPayloads) {
      console.debug(`[DEBUG] ${message} PAYLOAD:`, payload);
    } else if (shouldLog('debug')) {
      console.debug(`[DEBUG] ${message} (payload logging disabled)`);
    }
  },
};

// Core webhook handler function
async function handleWebhook(request: Request): Promise<Response> {
  logger.info(`Received webhook request`);

  // Get the mattermost webhook URL from the query parameter
  const url = new URL(request.url);
  const mattermostUrl = url.searchParams.get('url') || config.defaultMattermostWebhookUrl;
  
  if (!mattermostUrl) {
    logger.error('Missing Mattermost webhook URL in query parameters');
    return new Response(
      JSON.stringify({ 
        error: 'Missing Mattermost webhook URL. Please provide a ?url= parameter or set DEFAULT_MATTERMOST_WEBHOOK_URL env variable.' 
      }), 
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Parse the Discord webhook payload
    const discordPayload: DiscordWebhookPayload = await request.json();
    logger.info('Received Discord webhook payload');

    // Transform Discord payload to Mattermost format
    const mattermostPayload = transformDiscordToMattermost(discordPayload);

    // Forward to Mattermost webhook
    logger.info(`Forwarding to Mattermost webhook: ${mattermostUrl.substring(0, 30)}...`);
    
    // Create AbortController for timeout
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
        return new Response(
          JSON.stringify({ error: `Error forwarding to Mattermost: ${response.status}` }),
          { 
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      logger.info('Successfully forwarded to Mattermost');
      return new Response(
        JSON.stringify({ status: 'success', message: 'Webhook forwarded to Mattermost successfully' }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    logger.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: `Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Main fetch handler for Cloudflare Workers
export default {
  async fetch(request: Request): Promise<Response> {
    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    const url = new URL(request.url);
    
    // Handle health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok' }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    // Handle root path for webhooks
    if (request.method === 'POST' && url.pathname === '/') {
      const response = await handleWebhook(request);
      
      // Add CORS headers to the response
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }
    
    // Default response for unhandled routes
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
};