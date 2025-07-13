import type { VercelWebhookPayload, MattermostWebhookPayload, MattermostAttachment } from '../types';

export function transformVercelToMattermost(webhook: VercelWebhookPayload | any): MattermostWebhookPayload {
  // Handle both new official API format and legacy format
  let type: string;
  let createdAt: number;
  let payload: any;
  
  // Check if this is the new official webhook format (has type and payload structure)
  if (webhook.type && webhook.payload) {
    ({ type, createdAt, payload } = webhook);
  } else {
    // Legacy format - convert to new structure for processing
    type = 'deployment.created'; // Default for legacy
    createdAt = Date.now();
    payload = {
      deployment: webhook.deployment,
      project: webhook.project,
      links: webhook.links,
      user: webhook.user,
      team: webhook.team,
      target: webhook.target
    };
    
    // Try to infer the event type from legacy data
    if (webhook.deployment?.errorMessage) {
      type = 'deployment.error';
    } else if (webhook.deployment?.url && webhook.target === 'production') {
      type = 'deployment.succeeded';
    }
  }
  
  // Safely extract properties with fallbacks
  const deployment = payload?.deployment || {};
  const project = payload?.project || {};
  const links = payload?.links || {};
  const meta = deployment?.meta || {};
  
  // Determine deployment status and appearance based on event type
  let color = '#0070f3';
  let emoji = ':rocket:';
  let title = 'Vercel Event';
  
  // Map event types to status and appearance
  switch (type) {
    case 'deployment.created':
      color = '#0070f3';
      emoji = ':rocket:';
      title = 'Deployment Started';
      break;
    case 'deployment.succeeded':
      color = '#0f9549';
      emoji = ':white_check_mark:';
      title = 'Deployment Succeeded';
      break;
    case 'deployment.ready':
      color = '#0f9549';
      emoji = ':white_check_mark:';
      title = 'Deployment Ready';
      break;
    case 'deployment.error':
      color = '#e00';
      emoji = ':x:';
      title = 'Deployment Failed';
      break;
    case 'deployment.canceled':
      color = '#666';
      emoji = ':no_entry_sign:';
      title = 'Deployment Canceled';
      break;
    case 'project.created':
      color = '#0070f3';
      emoji = ':file_folder:';
      title = 'Project Created';
      break;
    default:
      // Handle other event types
      title = type.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      break;
  }
  
  const attachment: MattermostAttachment = {
    fallback: `${title} for ${project?.name || 'Unknown project'}`,
    color,
    title: `${emoji} ${title}`,
    title_link: links?.deployment || deployment?.inspectorUrl || undefined,
    fields: []
  };
  
  // Add project information - only if project name exists
  if (project?.name) {
    attachment.fields!.push({
      title: ':file_folder: Project',
      value: project.name,
      short: true
    });
  }
  
  // Add environment - only if target is available
  const environment = deployment?.target || payload?.target;
  if (environment) {
    attachment.fields!.push({
      title: ':earth_americas: Environment',
      value: environment,
      short: true
    });
  }
  
  // Add URL if deployment URL exists (for succeeded/ready deployments)
  if (deployment?.url && (type === 'deployment.succeeded' || type === 'deployment.ready')) {
    attachment.fields!.push({
      title: ':globe_with_meridians: Live URL',
      value: `[${deployment.url}](https://${deployment.url})`,
      short: false
    });
  }
  
  // Add branch information - only if available
  if (meta?.githubCommitRef) {
    attachment.fields!.push({
      title: ':herb: Branch',
      value: meta.githubCommitRef,
      short: true
    });
  }
  
  // Add author information - only if available
  if (meta?.githubCommitAuthorLogin) {
    attachment.fields!.push({
      title: ':bust_in_silhouette: Author',
      value: meta.githubCommitAuthorLogin,
      short: true
    });
  }
  
  // Add commit information - only if available
  if (meta?.githubCommitSha) {
    attachment.fields!.push({
      title: ':bookmark: Commit',
      value: `\`${meta.githubCommitSha.substring(0, 7)}\``,
      short: true
    });
  }
  
  // Add commit message - only if available
  if (meta?.githubCommitMessage) {
    const message = meta.githubCommitMessage.length > 100 
      ? meta.githubCommitMessage.substring(0, 100) + '...'
      : meta.githubCommitMessage;
    attachment.fields!.push({
      title: ':speech_balloon: Message',
      value: message,
      short: false
    });
  }
  
  // Add event type information
  attachment.fields!.push({
    title: ':information_source: Event Type',
    value: type,
    short: true
  });
  
  // Add timestamp
  if (createdAt) {
    const timestamp = new Date(createdAt).toLocaleString();
    attachment.fields!.push({
      title: ':clock1: Time',
      value: timestamp,
      short: true
    });
  }
  
  // Add action buttons - only if URLs are available
  attachment.actions = [];
  
  // Add visit site button only if deployment URL exists and deployment succeeded
  if (deployment?.url && (type === 'deployment.succeeded' || type === 'deployment.ready')) {
    attachment.actions.push({
      type: 'button',
      text: ':rocket: Visit Site',
      url: `https://${deployment.url}`,
      style: 'primary'
    });
  }
  
  // Add deployment details button only if available
  if (links?.deployment) {
    attachment.actions.push({
      type: 'button',
      text: type === 'deployment.error' ? ':mag: View Error Details' : ':bar_chart: View Details',
      url: links.deployment,
      style: type === 'deployment.error' ? 'danger' : undefined
    });
  }
  
  // Add project dashboard button only if available
  if (links?.project) {
    attachment.actions.push({
      type: 'button',
      text: ':bar_chart: Project Dashboard',
      url: links.project
    });
  }
  
  // Add footer with Vercel branding
  attachment.footer = 'Vercel';
  attachment.footer_icon = 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png';
  
  return {
    username: 'Vercel',
    icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
    attachments: [attachment]
  };
}