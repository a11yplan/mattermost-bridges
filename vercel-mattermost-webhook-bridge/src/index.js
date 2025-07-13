export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    
    if (url.pathname !== '/webhook') {
      return new Response('Not found', { status: 404 });
    }

    try {
      const vercelPayload = await request.json();
      
      // Get Mattermost webhook URL from query parameter or environment variable
      const mattermostWebhookUrl = url.searchParams.get('webhook_url') || env.MATTERMOST_WEBHOOK_URL;
      if (!mattermostWebhookUrl) {
        console.error('Mattermost webhook URL not provided in query parameter or environment');
        return new Response('Missing webhook_url parameter or MATTERMOST_WEBHOOK_URL configuration', { status: 400 });
      }

      const mattermostPayload = formatVercelToMattermost(vercelPayload);
      
      const response = await fetch(mattermostWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mattermostPayload),
      });

      if (!response.ok) {
        console.error('Failed to send to Mattermost:', response.status, await response.text());
        return new Response('Failed to send notification', { status: 500 });
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Invalid request', { status: 400 });
    }
  },
};

function formatVercelToMattermost(vercelPayload) {
  try {
    const { type, payload, createdAt } = vercelPayload;
    
    let attachment = {
      color: '#0070f3',
      fields: [],
      actions: []
    };
    
    switch (type) {
      case 'deployment':
        attachment = formatDeployment(payload);
        break;
        
      case 'deployment-ready':
        attachment = formatDeploymentReady(payload);
        break;
        
      case 'deployment-error':
        attachment = formatDeploymentError(payload);
        break;
        
      case 'deployment-canceled':
        attachment = formatDeploymentCanceled(payload);
        break;
        
      default:
        attachment = {
          fallback: `Vercel ${type}`,
          color: '#0070f3',
          title: `📢 ${type}`,
          text: '```json\n' + JSON.stringify(payload, null, 2).slice(0, 3000) + '\n```',
          fields: []
        };
    }
    
    // Add timestamp
    const timestamp = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();
    attachment.footer = `Vercel | ${timestamp}`;
    attachment.footer_icon = 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png';
    
    return {
      username: 'Vercel',
      icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
      attachments: [attachment]
    };
  } catch (error) {
    // Failsafe: always send something
    console.error('Error formatting notification:', error);
    return {
      username: 'Vercel',
      icon_url: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
      attachments: [{
        fallback: 'Vercel Notification',
        color: '#0070f3',
        title: 'Vercel Notification',
        text: 'A deployment event occurred. Check Vercel dashboard for details.',
        footer: `Vercel | ${new Date().toISOString()}`
      }]
    };
  }
}

function formatDeployment(payload) {
  try {
    const { deployment, project, team, links } = payload;
    const domain = deployment?.url || deployment?.alias?.[0] || 'Unknown';
    const meta = deployment?.meta || {};
    
    const attachment = {
      fallback: `Deployment started for ${project?.name || 'Unknown project'}`,
      color: '#f5a623',
      title: `🚀 Deployment Started`,
      title_link: links?.deployment || deployment?.inspectorUrl,
      fields: []
    };
    
    // Add fields with failsafe
    if (project?.name) {
      attachment.fields.push({ title: '📁 Project', value: project.name, short: true });
    }
    
    attachment.fields.push({ 
      title: '🌍 Environment', 
      value: deployment?.target || 'production', 
      short: true 
    });
    
    if (domain) {
      attachment.fields.push({ 
        title: '🔗 URL', 
        value: `<https://${domain}|${domain}>`, 
        short: false 
      });
    }
    
    if (meta.githubCommitRef) {
      attachment.fields.push({ 
        title: '🌿 Branch', 
        value: meta.githubCommitRef, 
        short: true 
      });
    }
    
    if (meta.githubCommitAuthorLogin) {
      attachment.fields.push({ 
        title: '👤 Author', 
        value: meta.githubCommitAuthorLogin, 
        short: true 
      });
    }
    
    if (meta.githubCommitSha) {
      attachment.fields.push({ 
        title: '🔖 Commit', 
        value: `\`${meta.githubCommitSha.substring(0, 7)}\``, 
        short: true 
      });
    }
    
    if (meta.githubCommitMessage) {
      attachment.fields.push({ 
        title: '💬 Message', 
        value: meta.githubCommitMessage.substring(0, 100), 
        short: true 
      });
    }
    
    if (team?.name) {
      attachment.fields.push({ 
        title: '👥 Team', 
        value: team.name, 
        short: true 
      });
    }
    
    // Add action buttons for quick access
    attachment.actions = [];
    if (deployment?.inspectorUrl) {
      attachment.actions.push({
        type: 'button',
        text: '🔍 View Deployment',
        url: deployment.inspectorUrl
      });
    }
    if (links?.project) {
      attachment.actions.push({
        type: 'button',
        text: '📊 Project Dashboard',
        url: links.project
      });
    }
    
    return attachment;
  } catch (error) {
    console.error('Error formatting deployment:', error);
    return {
      fallback: 'Deployment started',
      color: '#f5a623',
      title: '🚀 Deployment Started',
      text: 'A deployment has started. Check Vercel for details.'
    };
  }
}

function formatDeploymentReady(payload) {
  try {
    const { deployment, project, links } = payload;
    const domain = deployment?.url || deployment?.alias?.[0] || 'Unknown';
    const meta = deployment?.meta || {};
    
    const attachment = {
      fallback: `Deployment ready for ${project?.name || 'Unknown project'}`,
      color: '#0f9549',
      title: `✅ Deployment Ready`,
      title_link: links?.deployment || deployment?.inspectorUrl,
      fields: []
    };
    
    if (project?.name) {
      attachment.fields.push({ 
        title: '🎉 Project', 
        value: `**${project.name}** is now live!`, 
        short: false 
      });
    }
    
    if (domain) {
      attachment.fields.push({ 
        title: '🌐 Live URL', 
        value: `<https://${domain}|https://${domain}>`, 
        short: false 
      });
    }
    
    attachment.fields.push({ 
      title: '📦 Environment', 
      value: deployment?.target || 'production', 
      short: true 
    });
    
    if (meta.githubCommitMessage) {
      attachment.fields.push({ 
        title: '💬 Commit Message', 
        value: meta.githubCommitMessage.substring(0, 200), 
        short: false 
      });
    }
    
    if (meta.githubCommitSha) {
      attachment.fields.push({ 
        title: '🔖 Commit SHA', 
        value: `\`${meta.githubCommitSha.substring(0, 7)}\``, 
        short: true 
      });
    }
    
    // Add action buttons
    attachment.actions = [];
    if (domain) {
      attachment.actions.push({
        type: 'button',
        text: '🚀 Visit Site',
        url: `https://${domain}`,
        style: 'primary'
      });
    }
    if (deployment?.inspectorUrl) {
      attachment.actions.push({
        type: 'button',
        text: '📊 View Details',
        url: deployment.inspectorUrl
      });
    }
    
    return attachment;
  } catch (error) {
    console.error('Error formatting deployment ready:', error);
    return {
      fallback: 'Deployment ready',
      color: '#0f9549',
      title: '✅ Deployment Ready',
      text: 'Your deployment is now live!'
    };
  }
}

function formatDeploymentError(payload) {
  try {
    const { deployment, project, links } = payload;
    const meta = deployment?.meta || {};
    
    const attachment = {
      fallback: `Deployment failed for ${project?.name || 'Unknown project'}`,
      color: '#e00',
      title: `❌ Deployment Failed`,
      title_link: links?.deployment || deployment?.inspectorUrl,
      fields: []
    };
    
    if (project?.name) {
      attachment.fields.push({ 
        title: '📁 Project', 
        value: project.name, 
        short: true 
      });
    }
    
    attachment.fields.push({ 
      title: '📦 Environment', 
      value: deployment?.target || 'production', 
      short: true 
    });
    
    if (meta.githubCommitRef) {
      attachment.fields.push({ 
        title: '🌿 Branch', 
        value: meta.githubCommitRef, 
        short: true 
      });
    }
    
    if (meta.githubCommitAuthorLogin) {
      attachment.fields.push({ 
        title: '👤 Author', 
        value: meta.githubCommitAuthorLogin, 
        short: true 
      });
    }
    
    if (deployment?.errorMessage) {
      attachment.fields.push({ 
        title: '⚠️ Error Message', 
        value: deployment.errorMessage, 
        short: false 
      });
    }
    
    if (meta.githubCommitMessage) {
      attachment.fields.push({ 
        title: '💬 Commit Message', 
        value: meta.githubCommitMessage.substring(0, 100), 
        short: false 
      });
    }
    
    // Add action buttons
    attachment.actions = [];
    if (deployment?.inspectorUrl) {
      attachment.actions.push({
        type: 'button',
        text: '🔍 View Error Details',
        url: deployment.inspectorUrl,
        style: 'danger'
      });
    }
    if (links?.project) {
      attachment.actions.push({
        type: 'button',
        text: '📊 Project Dashboard',
        url: links.project
      });
    }
    
    return attachment;
  } catch (error) {
    console.error('Error formatting deployment error:', error);
    return {
      fallback: 'Deployment failed',
      color: '#e00',
      title: '❌ Deployment Failed',
      text: 'The deployment failed. Check Vercel for error details.'
    };
  }
}

function formatDeploymentCanceled(payload) {
  try {
    const { deployment, project, links } = payload;
    const meta = deployment?.meta || {};
    
    const attachment = {
      fallback: `Deployment canceled for ${project?.name || 'Unknown project'}`,
      color: '#666',
      title: `🚫 Deployment Canceled`,
      title_link: links?.deployment || deployment?.inspectorUrl,
      fields: []
    };
    
    if (project?.name) {
      attachment.fields.push({ 
        title: '📁 Project', 
        value: project.name, 
        short: true 
      });
    }
    
    attachment.fields.push({ 
      title: '📦 Environment', 
      value: deployment?.target || 'production', 
      short: true 
    });
    
    if (meta.githubCommitRef) {
      attachment.fields.push({ 
        title: '🌿 Branch', 
        value: meta.githubCommitRef, 
        short: true 
      });
    }
    
    if (meta.githubCommitAuthorLogin) {
      attachment.fields.push({ 
        title: '👤 Author', 
        value: meta.githubCommitAuthorLogin, 
        short: true 
      });
    }
    
    if (meta.githubCommitMessage) {
      attachment.fields.push({ 
        title: '💬 Commit Message', 
        value: meta.githubCommitMessage.substring(0, 100), 
        short: false 
      });
    }
    
    // Add action buttons
    attachment.actions = [];
    if (links?.project) {
      attachment.actions.push({
        type: 'button',
        text: '📊 View Project',
        url: links.project
      });
    }
    
    return attachment;
  } catch (error) {
    console.error('Error formatting deployment canceled:', error);
    return {
      fallback: 'Deployment canceled',
      color: '#666',
      title: '🚫 Deployment Canceled',
      text: 'The deployment was canceled.'
    };
  }
}