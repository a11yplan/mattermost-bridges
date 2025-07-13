// Configuration for the application
export const config = {
  // Server port, defaulting to 3000 if not specified in env vars
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  
  // Optional default Mattermost webhook URL
  // If set, will be used when no URL query parameter is provided
  defaultMattermostWebhookUrl: process.env.DEFAULT_MATTERMOST_WEBHOOK_URL || '',
  
  // How detailed should logging be? 'debug', 'info', 'warn', 'error'
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Enable/disable detailed payload logging (may contain sensitive data)
  logPayloads: process.env.LOG_PAYLOADS === 'true' || false,
  
  // Optional: Request timeout in milliseconds
  requestTimeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT, 10) : 10000,
};