// Common types for Mattermost webhooks
export interface MattermostWebhookPayload {
  text?: string;
  username?: string;
  icon_url?: string;
  icon_emoji?: string;
  channel?: string;
  attachments?: MattermostAttachment[];
}

export interface MattermostAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: MattermostField[];
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  timestamp?: string;
  actions?: MattermostAction[];
}

export interface MattermostField {
  title: string;
  value: string;
  short: boolean;
}

export interface MattermostAction {
  type: string;
  text: string;
  url?: string;
  style?: string;
}

// Discord webhook types
export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text?: string;
    icon_url?: string;
  };
  image?: {
    url?: string;
  };
  thumbnail?: {
    url?: string;
  };
  author?: {
    name?: string;
    url?: string;
    icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

// Vercel webhook types
export interface VercelWebhookPayload {
  user: {
    id: string;
  };
  team: {
    id: string;
  };
  project: {
    id: string;
    name?: string;
  };
  deployment: {
    id: string;
    customEnvironmentId?: string | null;
    meta: {
      githubCommitAuthorName?: string;
      githubCommitAuthorEmail?: string;
      githubCommitMessage?: string;
      githubCommitOrg?: string;
      githubCommitRef?: string;
      githubCommitRepo?: string;
      githubCommitSha?: string;
      githubDeployment?: string;
      githubOrg?: string;
      githubRepo?: string;
      githubRepoOwnerType?: string;
      githubCommitRepoId?: string;
      githubRepoId?: string;
      githubRepoVisibility?: string;
      githubHost?: string;
      githubCommitAuthorLogin?: string;
      branchAlias?: string;
      action?: string;
      originalDeploymentId?: string;
    };
    name: string;
    url: string;
    inspectorUrl: string;
    target?: string;
    errorMessage?: string;
  };
  links: {
    deployment: string;
    project: string;
  };
  name: string;
  plan: string;
  regions: string[];
  target: string;
  type: string;
  url: string;
}

// Bridge configuration
export interface BridgeConfig {
  mattermostWebhookUrl: string;
  bridgeType: 'discord' | 'vercel';
}

// Response types
export interface BridgeResponse {
  success: boolean;
  message: string;
  status: number;
}