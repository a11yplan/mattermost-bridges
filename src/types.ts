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

// Vercel webhook types based on official API
export interface VercelWebhookPayload {
  type: VercelEventType;
  id: string;
  createdAt: number;
  region?: string;
  payload: VercelPayload;
}

export type VercelEventType = 
  | 'deployment.created'
  | 'deployment.succeeded' 
  | 'deployment.error'
  | 'deployment.canceled'
  | 'deployment.ready'
  | 'project.created'
  | 'project.removed'
  | 'domain.created'
  | 'domain.certificate-add'
  | 'domain.renewal'
  | string; // Allow other event types

export interface VercelPayload {
  user?: VercelUser;
  team?: VercelTeam;
  project?: VercelProject;
  deployment?: VercelDeployment;
  domain?: VercelDomain;
  links?: VercelLinks;
  plan?: string;
  regions?: string[];
  target?: 'production' | 'preview' | string;
}

export interface VercelUser {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export interface VercelTeam {
  id: string;
  slug?: string;
  name?: string;
  avatar?: string;
}

export interface VercelProject {
  id: string;
  name?: string;
  accountId?: string;
  autoExposeSystemEnvs?: boolean;
  buildCommand?: string;
  createdAt?: number;
  devCommand?: string;
  framework?: string;
  gitRepository?: {
    repo: string;
    type: string;
  };
  installCommand?: string;
  outputDirectory?: string;
  publicSource?: boolean;
  rootDirectory?: string;
  serverlessFunctionRegion?: string;
  sourceFilesOutsideRootDirectory?: boolean;
  updatedAt?: number;
}

export interface VercelDeployment {
  id: string;
  url?: string;
  name?: string;
  inspectorUrl?: string;
  target?: 'production' | 'preview' | string;
  source?: 'git' | 'cli' | 'import' | string;
  state?: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  type?: 'LAMBDAS' | 'STATIC';
  creator?: VercelUser;
  createdAt?: number;
  buildingAt?: number;
  ready?: number;
  meta?: VercelDeploymentMeta;
  regions?: string[];
  functions?: Record<string, any>;
  routes?: any[];
  env?: string[];
  build?: {
    env?: string[];
  };
  monorepoManager?: string;
  ownerId?: string;
  projectId?: string;
  readyState?: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readySubstate?: 'STAGED' | 'PROMOTED';
  version?: number;
}

export interface VercelDeploymentMeta {
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
  gitlabCommitAuthorName?: string;
  gitlabCommitAuthorEmail?: string;
  gitlabCommitMessage?: string;
  gitlabCommitRef?: string;
  gitlabCommitSha?: string;
  gitlabDeployment?: string;
  gitlabProjectId?: string;
  gitlabProjectName?: string;
  gitlabProjectNamespace?: string;
  gitlabProjectPath?: string;
  gitlabCommitAuthorLogin?: string;
  bitbucketCommitAuthorName?: string;
  bitbucketCommitMessage?: string;
  bitbucketCommitRef?: string;
  bitbucketCommitSha?: string;
  bitbucketDeployment?: string;
  bitbucketRepo?: string;
  bitbucketRepoOwner?: string;
  bitbucketCommitAuthorLogin?: string;
}

export interface VercelDomain {
  id: string;
  name: string;
  serviceType: string;
  nsVerifiedAt?: number;
  txtVerifiedAt?: number;
  cdnEnabled?: boolean;
  createdAt?: number;
  verificationRecord?: string;
}

export interface VercelLinks {
  deployment?: string;
  project?: string;
  domain?: string;
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