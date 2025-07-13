import type { VercelWebhookPayload, MattermostWebhookPayload, MattermostAttachment } from '../types';

export function transformVercelToMattermost(payload: VercelWebhookPayload): MattermostWebhookPayload {
  const { deployment, project, links } = payload;
  const meta = deployment?.meta || {};
  
  // Determine deployment status based on the payload
  let status = 'deployment';
  let color = '#0070f3';
  let emoji = '🚀';
  let title = 'Deployment Started';
  
  // Infer status from payload structure and data
  if (deployment.errorMessage) {
    status = 'error';
    color = '#e00';
    emoji = '❌';
    title = 'Deployment Failed';
  } else if (deployment.url && payload.target === 'production') {
    status = 'ready';
    color = '#0f9549';
    emoji = '✅';
    title = 'Deployment Ready';
  }
  
  const attachment: MattermostAttachment = {
    fallback: `${title} for ${project?.name || 'Unknown project'}`,
    color,
    title: `${emoji} ${title}`,
    title_link: links?.deployment || deployment?.inspectorUrl,
    fields: []
  };
  
  // Add project information
  if (project?.name) {
    attachment.fields!.push({
      title: '📁 Project',
      value: project.name,
      short: true
    });
  }
  
  // Add environment
  attachment.fields!.push({
    title: '🌍 Environment',
    value: deployment?.target || payload.target || 'production',
    short: true
  });
  
  // Add URL if deployment is ready
  if (status === 'ready' && deployment.url) {
    attachment.fields!.push({
      title: '🌐 Live URL',
      value: `[${deployment.url}](https://${deployment.url})`,
      short: false
    });
  }
  
  // Add branch information
  if (meta.githubCommitRef) {
    attachment.fields!.push({
      title: '🌿 Branch',
      value: meta.githubCommitRef,
      short: true
    });
  }
  
  // Add author information
  if (meta.githubCommitAuthorLogin) {
    attachment.fields!.push({
      title: '👤 Author',
      value: meta.githubCommitAuthorLogin,
      short: true
    });
  }
  
  // Add commit information
  if (meta.githubCommitSha) {
    attachment.fields!.push({
      title: '🔖 Commit',
      value: `\`${meta.githubCommitSha.substring(0, 7)}\``,
      short: true
    });
  }
  
  // Add commit message
  if (meta.githubCommitMessage) {
    const message = meta.githubCommitMessage.length > 100 
      ? meta.githubCommitMessage.substring(0, 100) + '...'
      : meta.githubCommitMessage;
    attachment.fields!.push({
      title: '💬 Message',
      value: message,
      short: false
    });
  }
  
  // Add error message if deployment failed
  if (deployment.errorMessage) {
    attachment.fields!.push({
      title: '⚠️ Error',
      value: deployment.errorMessage,
      short: false
    });
  }
  
  // Add action buttons
  attachment.actions = [];
  
  if (status === 'ready' && deployment.url) {
    attachment.actions.push({
      type: 'button',
      text: '🚀 Visit Site',
      url: `https://${deployment.url}`,
      style: 'primary'
    });
  }
  
  if (deployment?.inspectorUrl) {
    attachment.actions.push({
      type: 'button',
      text: status === 'error' ? '🔍 View Error Details' : '📊 View Details',
      url: deployment.inspectorUrl,
      style: status === 'error' ? 'danger' : undefined
    });
  }
  
  if (links?.project) {
    attachment.actions.push({
      type: 'button',
      text: '📊 Project Dashboard',
      url: links.project
    });
  }
  
  // Add footer with timestamp
  attachment.footer = `Vercel | ${new Date().toISOString()}`;
  attachment.footer_icon = 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png';
  
  return {
    username: 'Vercel',
    icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
    attachments: [attachment]
  };
}