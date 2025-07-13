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
async function sendToMattermost(webhookUrl: string, payload: object, requestId?: string): Promise<BridgeResponse> {
  const logPrefix = requestId ? `[${requestId}]` : '';
  const mattermostRequestId = `mm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  try {
    const requestBody = JSON.stringify(payload);
    console.log(`${logPrefix} [${mattermostRequestId}] Sending to Mattermost webhook...`);
    console.log(`${logPrefix} [${mattermostRequestId}] Webhook URL: ${webhookUrl.substring(0, 50)}...`);
    console.log(`${logPrefix} [${mattermostRequestId}] Request body (${requestBody.length} chars):`, requestBody);
    
    const startTime = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mattermost-Bridge/1.0'
      },
      body: requestBody,
    });
    
    const duration = Date.now() - startTime;
    console.log(`${logPrefix} [${mattermostRequestId}] Mattermost response received in ${duration}ms`);
    console.log(`${logPrefix} [${mattermostRequestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`${logPrefix} [${mattermostRequestId}] Response headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`${logPrefix} [${mattermostRequestId}] Response body (${responseText.length} chars):`, responseText);

    if (!response.ok) {
      console.error(`${logPrefix} [${mattermostRequestId}] Mattermost webhook failed: ${response.status} ${response.statusText}`);
      console.error(`${logPrefix} [${mattermostRequestId}] Error response body:`, responseText);
      return {
        success: false,
        message: `Failed to send notification: ${response.status} ${response.statusText} - ${responseText}`,
        status: 500
      };
    }

    console.log(`${logPrefix} [${mattermostRequestId}] Mattermost webhook succeeded`);
    return {
      success: true,
      message: 'Notification sent successfully',
      status: 200
    };
  } catch (error) {
    console.error(`${logPrefix} [${mattermostRequestId}] Error sending to Mattermost:`, error);
    console.error(`${logPrefix} [${mattermostRequestId}] Error stack:`, error.stack);
    console.error(`${logPrefix} [${mattermostRequestId}] Error name:`, error.name);
    console.error(`${logPrefix} [${mattermostRequestId}] Error message:`, error.message);
    
    return {
      success: false,
      message: `Error sending notification: ${error.message}`,
      status: 500
    };
  }
}

// Route handlers
async function handleDiscordWebhook(request: Request, url: URL, env?: any): Promise<Response> {
  const requestId = `discord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`[${requestId}] Discord webhook request started`);
  console.log(`[${requestId}] Request URL: ${request.url}`);
  console.log(`[${requestId}] Request headers:`, Object.fromEntries(request.headers.entries()));

  const mattermostUrl = getMattermostWebhookUrl(url, env);
  if (!mattermostUrl) {
    console.error(`[${requestId}] Missing Mattermost webhook URL`);
    return new Response(
      JSON.stringify({ 
        error: 'Missing webhook URL parameter (?url=...) or MATTERMOST_WEBHOOK_URL environment variable',
        requestId 
      }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  console.log(`[${requestId}] Mattermost webhook URL configured: ${mattermostUrl.substring(0, 50)}...`);

  try {
    // Parse the request body
    const rawBody = await request.text();
    console.log(`[${requestId}] Raw request body (${rawBody.length} chars):`, rawBody);

    let discordPayload: DiscordWebhookPayload;
    try {
      discordPayload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parsing failed:`, parseError);
      console.error(`[${requestId}] Raw body causing parse error:`, rawBody);
      throw new Error(`Invalid JSON payload: ${parseError.message}`);
    }

    console.log(`[${requestId}] Parsed Discord webhook payload:`, JSON.stringify(discordPayload, null, 2));
    
    // Transform the payload
    const mattermostPayload = transformDiscordToMattermost(discordPayload);
    console.log(`[${requestId}] Transformed Mattermost payload:`, JSON.stringify(mattermostPayload, null, 2));
    console.log(`[${requestId}] Message text length: ${mattermostPayload.text?.length || 0} chars`);
    console.log(`[${requestId}] Attachments count: ${mattermostPayload.attachments?.length || 0}`);
    
    // Send to Mattermost
    console.log(`[${requestId}] Sending to Mattermost webhook...`);
    const result = await sendToMattermost(mattermostUrl, mattermostPayload, requestId);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed in ${duration}ms with status: ${result.status}`);
    console.log(`[${requestId}] Result:`, result);
    
    return new Response(
      JSON.stringify({ ...result, requestId, duration }),
      { 
        status: result.status, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error processing Discord webhook after ${duration}ms:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    console.error(`[${requestId}] Error name:`, error.name);
    console.error(`[${requestId}] Error message:`, error.message);
    
    // Try to send error notification to Mattermost if URL is available
    if (mattermostUrl) {
      try {
        const errorPayload = {
          text: `⚠️ **Discord Webhook Error**\n\`\`\`\nRequest ID: ${requestId}\nError: ${error.message}\nDuration: ${duration}ms\n\`\`\``,
          username: 'Discord Bridge Error',
          icon_url: 'https://discord.com/assets/f9bb9c4af2b9c32a2c5ee0014661546d.png'
        };
        await sendToMattermost(mattermostUrl, errorPayload, requestId);
        console.log(`[${requestId}] Error notification sent to Mattermost`);
      } catch (notificationError) {
        console.error(`[${requestId}] Failed to send error notification:`, notificationError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Error processing Discord webhook',
        message: error.message,
        requestId,
        duration
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}

async function handleVercelWebhook(request: Request, url: URL, env?: any): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`[${requestId}] Vercel webhook request started`);
  console.log(`[${requestId}] Request URL: ${request.url}`);
  console.log(`[${requestId}] Request headers:`, Object.fromEntries(request.headers.entries()));

  const mattermostUrl = getMattermostWebhookUrl(url, env);
  if (!mattermostUrl) {
    console.error(`[${requestId}] Missing Mattermost webhook URL`);
    return new Response(
      JSON.stringify({ 
        error: 'Missing webhook URL parameter (?url=...) or MATTERMOST_WEBHOOK_URL environment variable',
        requestId 
      }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  console.log(`[${requestId}] Mattermost webhook URL configured: ${mattermostUrl.substring(0, 50)}...`);

  try {
    // Parse the request body
    const rawBody = await request.text();
    console.log(`[${requestId}] Raw request body (${rawBody.length} chars):`, rawBody);

    let vercelPayload: VercelWebhookPayload;
    try {
      vercelPayload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parsing failed:`, parseError);
      console.error(`[${requestId}] Raw body causing parse error:`, rawBody);
      throw new Error(`Invalid JSON payload: ${parseError.message}`);
    }

    console.log(`[${requestId}] Parsed Vercel webhook payload:`, JSON.stringify(vercelPayload, null, 2));
    console.log(`[${requestId}] Webhook event type: ${vercelPayload.type || 'unknown'}`);
    console.log(`[${requestId}] Webhook event ID: ${vercelPayload.id || 'unknown'}`);
    
    // Transform the payload
    const mattermostPayload = transformVercelToMattermost(vercelPayload);
    console.log(`[${requestId}] Transformed Mattermost payload:`, JSON.stringify(mattermostPayload, null, 2));
    console.log(`[${requestId}] Message text length: ${mattermostPayload.text?.length || 0} chars`);
    console.log(`[${requestId}] Attachments count: ${mattermostPayload.attachments?.length || 0}`);
    
    // Send to Mattermost
    console.log(`[${requestId}] Sending to Mattermost webhook...`);
    const result = await sendToMattermost(mattermostUrl, mattermostPayload, requestId);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed in ${duration}ms with status: ${result.status}`);
    console.log(`[${requestId}] Result:`, result);
    
    return new Response(
      JSON.stringify({ ...result, requestId, duration }),
      { 
        status: result.status, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error processing Vercel webhook after ${duration}ms:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    console.error(`[${requestId}] Error name:`, error.name);
    console.error(`[${requestId}] Error message:`, error.message);
    
    // Try to send error notification to Mattermost if URL is available
    if (mattermostUrl) {
      try {
        const errorPayload = {
          text: `⚠️ **Vercel Webhook Error**\n\`\`\`\nRequest ID: ${requestId}\nError: ${error.message}\nDuration: ${duration}ms\n\`\`\``,
          username: 'Vercel Bridge Error',
          icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png'
        };
        await sendToMattermost(mattermostUrl, errorPayload, requestId);
        console.log(`[${requestId}] Error notification sent to Mattermost`);
      } catch (notificationError) {
        console.error(`[${requestId}] Failed to send error notification:`, notificationError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Error processing Vercel webhook',
        message: error.message,
        requestId,
        duration
      }),
      { 
        status: 500, 
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