import { transformDiscordToMattermost } from './transformers/discord';
import { transformVercelToMattermost } from './transformers/vercel';
import type { DiscordWebhookPayload, VercelWebhookPayload, BridgeResponse } from './types';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight requests
function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  return null;
}

// Extract Mattermost webhook URL from query params or environment
function getMattermostWebhookUrl(url: URL, env?: any): string | null {
  return url.searchParams.get('url') || 
         url.searchParams.get('webhook_url') || 
         (env && env.MATTERMOST_WEBHOOK_URL) ||
         null;
}

// Send payload to Mattermost
async function sendToMattermost(webhookUrl: string, payload: object): Promise<BridgeResponse> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send to Mattermost:', response.status, errorText);
      return {
        success: false,
        message: `Failed to send notification: ${response.status} ${errorText}`,
        status: 500
      };
    }

    return {
      success: true,
      message: 'Notification sent successfully',
      status: 200
    };
  } catch (error) {
    console.error('Error sending to Mattermost:', error);
    return {
      success: false,
      message: `Error sending notification: ${error.message}`,
      status: 500
    };
  }
}

// Route handlers
async function handleDiscordWebhook(request: Request, url: URL, env?: any): Promise<Response> {
  const mattermostUrl = getMattermostWebhookUrl(url, env);
  if (!mattermostUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing webhook URL parameter (?url=...) or MATTERMOST_WEBHOOK_URL environment variable' }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  try {
    const discordPayload: DiscordWebhookPayload = await request.json();
    const mattermostPayload = transformDiscordToMattermost(discordPayload);
    const result = await sendToMattermost(mattermostUrl, mattermostPayload);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: result.status, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  } catch (error) {
    console.error('Error processing Discord webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid Discord webhook payload' }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}

async function handleVercelWebhook(request: Request, url: URL, env?: any): Promise<Response> {
  const mattermostUrl = getMattermostWebhookUrl(url, env);
  if (!mattermostUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing webhook URL parameter (?url=...) or MATTERMOST_WEBHOOK_URL environment variable' }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  try {
    const vercelPayload: VercelWebhookPayload = await request.json();
    console.log('Received Vercel webhook payload:', JSON.stringify(vercelPayload, null, 2));
    
    const mattermostPayload = transformVercelToMattermost(vercelPayload);
    console.log('Transformed Mattermost payload:', JSON.stringify(mattermostPayload, null, 2));
    
    const result = await sendToMattermost(mattermostUrl, mattermostPayload);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: result.status, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  } catch (error) {
    console.error('Error processing Vercel webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid Vercel webhook payload' }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}

function handleHealthCheck(): Response {
  return new Response(
    JSON.stringify({ 
      status: 'healthy', 
      version: '1.0.0',
      endpoints: ['/discord', '/vercel'],
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}

function handleNotFound(): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Not found', 
      available_endpoints: ['/discord?url=<mattermost_webhook_url>', '/vercel?url=<mattermost_webhook_url>', '/health']
    }),
    { 
      status: 404, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}

// Main request handler
async function handleRequest(request: Request, env?: any): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const path = url.pathname;

  // Only allow POST requests for webhook endpoints
  if ((path === '/discord' || path === '/vercel') && request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST for webhook endpoints.' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  // Route requests
  switch (path) {
    case '/discord':
      return handleDiscordWebhook(request, url, env);
    
    case '/vercel':
      return handleVercelWebhook(request, url, env);
    
    case '/health':
    case '/':
      return handleHealthCheck();
    
    default:
      return handleNotFound();
  }
}

// Export for Cloudflare Workers
export default {
  async fetch(request: Request, env?: any): Promise<Response> {
    return handleRequest(request, env);
  }
};