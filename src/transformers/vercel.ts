import type { VercelWebhookPayload, MattermostWebhookPayload, MattermostAttachment } from '../types';

export function transformVercelToMattermost(payload: VercelWebhookPayload): MattermostWebhookPayload {
  const { deployment, project, links } = payload;
  const meta = deployment?.meta || {};
  
  // Determine deployment status based on the payload
  let status = 'deployment';
  let color = '#0070f3';
  let emoji = ':rocket:';
  let title = 'Deployment Started';
  
  // Infer status from payload structure and data
  if (deployment.errorMessage) {
    status = 'error';
    color = '#e00';
    emoji = ':x:';
    title = 'Deployment Failed';
  } else if (deployment.url && payload.target === 'production') {
    status = 'ready';
    color = '#0f9549';
    emoji = ':white_check_mark:';
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
      title: ':file_folder: Project',
      value: project.name,
      short: true
    });
  }
  
  // Add environment
  attachment.fields!.push({
    title: ':earth_americas: Environment',
    value: deployment?.target || payload.target || 'production',
    short: true
  });
  
  // Add URL if deployment is ready
  if (status === 'ready' && deployment.url) {
    attachment.fields!.push({
      title: ':globe_with_meridians: Live URL',
      value: `[${deployment.url}](https://${deployment.url})`,
      short: false
    });
  }
  
  // Add branch information
  if (meta.githubCommitRef) {
    attachment.fields!.push({
      title: ':herb: Branch',
      value: meta.githubCommitRef,
      short: true
    });
  }
  
  // Add author information
  if (meta.githubCommitAuthorLogin) {
    attachment.fields!.push({
      title: ':bust_in_silhouette: Author',
      value: meta.githubCommitAuthorLogin,
      short: true
    });
  }
  
  // Add commit information
  if (meta.githubCommitSha) {
    attachment.fields!.push({
      title: ':bookmark: Commit',
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
      title: ':speech_balloon: Message',
      value: message,
      short: false
    });
  }
  
  // Add error message if deployment failed
  if (deployment.errorMessage) {
    attachment.fields!.push({
      title: ':warning: Error',
      value: deployment.errorMessage,
      short: false
    });
  }
  
  // Add action buttons
  attachment.actions = [];
  
  if (status === 'ready' && deployment.url) {
    attachment.actions.push({
      type: 'button',
      text: ':rocket: Visit Site',
      url: `https://${deployment.url}`,
      style: 'primary'
    });
  }
  
  if (deployment?.inspectorUrl) {
    attachment.actions.push({
      type: 'button',
      text: status === 'error' ? ':mag: View Error Details' : ':bar_chart: View Details',
      url: deployment.inspectorUrl,
      style: status === 'error' ? 'danger' : undefined
    });
  }
  
  if (links?.project) {
    attachment.actions.push({
      type: 'button',
      text: ':bar_chart: Project Dashboard',
      url: links.project
    });
  }
  
  // Add footer with formatted timestamp
  const now = new Date();
  attachment.footer = `Vercel | ${now.toLocaleString()}`;
  attachment.footer_icon = 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png';
  
  return {
    username: 'Vercel',
    icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
    attachments: [attachment]
  };
}