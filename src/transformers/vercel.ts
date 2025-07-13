import type { VercelWebhookPayload, VercelEventType, MattermostWebhookPayload, MattermostAttachment, MattermostField } from '../types';

// Event configuration for different Vercel webhook types
interface EventConfig {
  color: string;
  emoji: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
}

const EVENT_CONFIGS: Record<string, EventConfig> = {
  'deployment.created': {
    color: '#0070f3', // Vercel blue
    emoji: '🚀',
    title: 'Deployment Started',
    priority: 'medium'
  },
  'deployment.succeeded': {
    color: '#00c851', // Success green
    emoji: '✅',
    title: 'Deployment Succeeded',
    priority: 'high'
  },
  'deployment.ready': {
    color: '#00c851', // Success green
    emoji: '🎉',
    title: 'Deployment Ready',
    priority: 'high'
  },
  'deployment.error': {
    color: '#ff4444', // Error red
    emoji: '❌',
    title: 'Deployment Failed',
    priority: 'high'
  },
  'deployment.canceled': {
    color: '#ffbb33', // Warning orange
    emoji: '⏹️',
    title: 'Deployment Canceled',
    priority: 'medium'
  },
  'project.created': {
    color: '#0070f3',
    emoji: '📁',
    title: 'Project Created',
    priority: 'low'
  },
  'project.removed': {
    color: '#ff4444',
    emoji: '🗑️',
    title: 'Project Removed',
    priority: 'medium'
  },
  'domain.created': {
    color: '#00c851',
    emoji: '🌐',
    title: 'Domain Created',
    priority: 'medium'
  },
  'domain.certificate-add': {
    color: '#00c851',
    emoji: '🔒',
    title: 'SSL Certificate Added',
    priority: 'low'
  },
  'domain.renewal': {
    color: '#ffbb33',
    emoji: '🔄',
    title: 'Certificate Renewal',
    priority: 'low'
  }
};

function getEventConfig(eventType: string): EventConfig {
  return EVENT_CONFIGS[eventType] || {
    color: '#0070f3',
    emoji: '📡',
    title: eventType.split('.').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    priority: 'medium'
  };
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function createDeploymentFields(payload: VercelWebhookPayload): MattermostField[] {
  const fields: MattermostField[] = [];
  const { deployment, project, user, team, target, links } = payload.payload;

  // Project information
  if (project?.name) {
    fields.push({
      title: '📁 Project',
      value: project.name,
      short: true
    });
  }

  // Environment/Target
  const environment = deployment?.target || target;
  if (environment) {
    const envEmoji = environment === 'production' ? '🏭' : environment === 'preview' ? '🔍' : '🛠️';
    fields.push({
      title: `${envEmoji} Environment`,
      value: environment.charAt(0).toUpperCase() + environment.slice(1),
      short: true
    });
  }

  // Deployment URL (for successful deployments)
  if (deployment?.url && (payload.type === 'deployment.succeeded' || payload.type === 'deployment.ready')) {
    fields.push({
      title: '🌐 Live URL',
      value: `[${deployment.url}](https://${deployment.url})`,
      short: false
    });
  }

  // Git information from meta
  const meta = deployment?.meta;
  if (meta) {
    // Branch
    if (meta.githubCommitRef) {
      fields.push({
        title: '🌿 Branch',
        value: meta.githubCommitRef,
        short: true
      });
    }

    // Author
    const author = meta.githubCommitAuthorLogin || meta.githubCommitAuthorName || 
                   meta.gitlabCommitAuthorLogin || meta.gitlabCommitAuthorName ||
                   meta.bitbucketCommitAuthorLogin || meta.bitbucketCommitAuthorName;
    if (author) {
      fields.push({
        title: '👤 Author',
        value: author,
        short: true
      });
    }

    // Commit SHA
    const commitSha = meta.githubCommitSha || meta.gitlabCommitSha || meta.bitbucketCommitSha;
    if (commitSha) {
      const shortSha = commitSha.substring(0, 7);
      const repoUrl = meta.githubRepo ? `https://github.com/${meta.githubOrg}/${meta.githubRepo}` : '';
      const commitUrl = repoUrl ? `${repoUrl}/commit/${commitSha}` : '';
      
      fields.push({
        title: '🔖 Commit',
        value: commitUrl ? `[\`${shortSha}\`](${commitUrl})` : `\`${shortSha}\``,
        short: true
      });
    }

    // Commit message
    const commitMessage = meta.githubCommitMessage || meta.gitlabCommitMessage || meta.bitbucketCommitMessage;
    if (commitMessage) {
      fields.push({
        title: '💬 Message',
        value: truncateText(commitMessage, 200),
        short: false
      });
    }

    // Repository
    const repo = meta.githubRepo || meta.gitlabProjectName || meta.bitbucketRepo;
    const org = meta.githubOrg || meta.gitlabProjectNamespace || meta.bitbucketRepoOwner;
    if (repo && org) {
      fields.push({
        title: '📦 Repository',
        value: `${org}/${repo}`,
        short: true
      });
    }
  }

  // Deployment type and source
  if (deployment?.source) {
    const sourceEmoji = deployment.source === 'git' ? '📡' : 
                       deployment.source === 'cli' ? '💻' : '📥';
    fields.push({
      title: `${sourceEmoji} Source`,
      value: deployment.source.toUpperCase(),
      short: true
    });
  }

  // Team information
  if (team?.name || team?.slug) {
    fields.push({
      title: '🏢 Team',
      value: team.name || team.slug || 'Unknown',
      short: true
    });
  }

  // User information (if no team)
  if (!team && (user?.username || user?.name)) {
    fields.push({
      title: '👤 User',
      value: user.username || user.name || 'Unknown',
      short: true
    });
  }

  // Deployment timing information
  if (deployment?.createdAt) {
    const createdDate = new Date(deployment.createdAt);
    fields.push({
      title: '⏰ Created',
      value: createdDate.toLocaleString(),
      short: true
    });
  }

  // Build duration (if available)
  if (deployment?.buildingAt && deployment?.ready) {
    const duration = deployment.ready - deployment.buildingAt;
    fields.push({
      title: '⏱️ Build Time',
      value: formatDuration(duration),
      short: true
    });
  }

  // Regions
  if (deployment?.regions && deployment.regions.length > 0) {
    fields.push({
      title: '🌍 Regions',
      value: deployment.regions.join(', ').toUpperCase(),
      short: true
    });
  }

  // Event metadata
  fields.push({
    title: '📋 Event',
    value: payload.type,
    short: true
  });

  if (payload.region) {
    fields.push({
      title: '🌐 Region',
      value: payload.region.toUpperCase(),
      short: true
    });
  }

  return fields;
}

function createActions(payload: VercelWebhookPayload): any[] {
  const actions: any[] = [];
  const { deployment, links } = payload.payload;

  // Visit site button (for successful deployments)
  if (deployment?.url && (payload.type === 'deployment.succeeded' || payload.type === 'deployment.ready')) {
    actions.push({
      type: 'button',
      text: '🚀 Visit Site',
      url: `https://${deployment.url}`,
      style: 'primary'
    });
  }

  // View deployment details
  if (links?.deployment || deployment?.inspectorUrl) {
    const detailsUrl = links?.deployment || deployment?.inspectorUrl;
    const isError = payload.type === 'deployment.error';
    
    actions.push({
      type: 'button',
      text: isError ? '🔍 View Error Details' : '📊 View Details',
      url: detailsUrl,
      style: isError ? 'danger' : undefined
    });
  }

  // Project dashboard
  if (links?.project) {
    actions.push({
      type: 'button',
      text: '📋 Project Dashboard',
      url: links.project
    });
  }

  // GitHub/GitLab repository link
  const meta = deployment?.meta;
  if (meta) {
    let repoUrl = '';
    if (meta.githubOrg && meta.githubRepo) {
      repoUrl = `https://github.com/${meta.githubOrg}/${meta.githubRepo}`;
    } else if (meta.gitlabProjectPath) {
      repoUrl = `https://gitlab.com/${meta.gitlabProjectPath}`;
    }
    
    if (repoUrl) {
      actions.push({
        type: 'button',
        text: '📦 View Repository',
        url: repoUrl
      });
    }
  }

  return actions;
}

export function transformVercelToMattermost(webhook: VercelWebhookPayload | any): MattermostWebhookPayload {
  try {
    // Handle both new official API format and legacy format
    let normalizedPayload: VercelWebhookPayload;
    
    if (webhook.type && webhook.payload) {
      // Official Vercel webhook format
      normalizedPayload = webhook as VercelWebhookPayload;
    } else {
      // Legacy format - convert to new structure
      normalizedPayload = {
        type: 'deployment.created', // Default
        id: webhook.deployment?.id || `legacy_${Date.now()}`,
        createdAt: Date.now(),
        payload: {
          deployment: webhook.deployment,
          project: webhook.project,
          links: webhook.links,
          user: webhook.user,
          team: webhook.team,
          target: webhook.target,
          plan: webhook.plan,
          regions: webhook.regions
        }
      };
      
      // Try to infer the event type from legacy data
      if (webhook.deployment?.state === 'ERROR' || webhook.deployment?.errorMessage) {
        normalizedPayload.type = 'deployment.error';
      } else if (webhook.deployment?.url && webhook.target === 'production') {
        normalizedPayload.type = 'deployment.succeeded';
      }
    }

    const config = getEventConfig(normalizedPayload.type);
    const fields = createDeploymentFields(normalizedPayload);
    const actions = createActions(normalizedPayload);
    
    // Create simple text fallback
    const { project, deployment, target } = normalizedPayload.payload;
    let simpleText = `${config.emoji} **${config.title}**`;
    
    if (project?.name) {
      simpleText += ` for **${project.name}**`;
    }
    
    const environment = deployment?.target || target;
    if (environment) {
      simpleText += ` (${environment})`;
    }
    
    if (deployment?.url && (normalizedPayload.type === 'deployment.succeeded' || normalizedPayload.type === 'deployment.ready')) {
      simpleText += `\n🌐 ${deployment.url}`;
    }
    
    const meta = deployment?.meta;
    if (meta?.githubCommitMessage) {
      simpleText += `\n💬 ${truncateText(meta.githubCommitMessage, 100)}`;
    }
    
    if (meta?.githubCommitAuthorLogin) {
      simpleText += `\n👤 ${meta.githubCommitAuthorLogin}`;
    }

    // Ensure we always have fallback text
    if (!simpleText || simpleText.trim() === '') {
      simpleText = `${config.emoji} Vercel ${config.title}: ${normalizedPayload.type}`;
    }

    // Create rich attachment
    const attachment: MattermostAttachment = {
      fallback: `${config.title}${project?.name ? ` for ${project.name}` : ''}`,
      color: config.color,
      title: `${config.emoji} ${config.title}`,
      title_link: normalizedPayload.payload.links?.deployment || deployment?.inspectorUrl,
      fields,
      actions,
      footer: 'Vercel',
      footer_icon: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
      timestamp: new Date(normalizedPayload.createdAt).toISOString()
    };

    return {
      text: simpleText,
      username: 'Vercel',
      icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
      attachments: [attachment]
    };

  } catch (error) {
    // Fallback for any transformation errors
    console.error('Error transforming Vercel webhook:', error);
    
    return {
      text: `⚠️ **Vercel Event** (transformation error)\n\`\`\`\n${JSON.stringify(webhook, null, 2)}\`\`\``,
      username: 'Vercel',
      icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
      attachments: [{
        fallback: 'Vercel webhook transformation error',
        color: '#ff4444',
        title: '⚠️ Webhook Processing Error',
        text: `Failed to process webhook: ${error.message}`,
        footer: 'Vercel Bridge',
        timestamp: new Date().toISOString()
      }]
    };
  }
}