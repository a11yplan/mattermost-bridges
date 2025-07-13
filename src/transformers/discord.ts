import type { DiscordWebhookPayload, MattermostWebhookPayload, DiscordEmbed, MattermostAttachment } from '../types';

// Convert Discord color (decimal) to Mattermost color (hex)
const formatColor = (color?: number): string | undefined => {
  if (color === undefined) return undefined;
  return '#' + color.toString(16).padStart(6, '0');
};

// Format Discord timestamp tags <t:timestamp:format>
const formatTimestamp = (text: string): string => {
  return text.replace(/<t:(\d+):(D|F|t|T|d|f|R)>/g, (match, timestamp, format) => {
    const date = new Date(parseInt(timestamp) * 1000);
    
    switch (format) {
      case 'D':
        return date.toLocaleDateString();
      case 'F':
        return date.toLocaleString();
      case 't':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'T':
        return date.toLocaleTimeString();
      case 'd':
        return date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
      case 'f':
        return date.toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      case 'R':
        return date.toLocaleString();
      default:
        return date.toLocaleString();
    }
  });
};

// Remove backticks around emojis
const cleanupEmojis = (text: string): string => {
  return text.replace(/`([^`]*)`/g, (match, content) => {
    if (/[\p{Emoji}]/u.test(content)) {
      return content;
    }
    return match;
  });
};

// Process any text content to fix formatting issues
const processText = (text?: string): string | undefined => {
  if (!text) return undefined;
  
  let processed = text;
  processed = formatTimestamp(processed);
  processed = cleanupEmojis(processed);
  
  return processed;
};

// Convert Discord embed to Mattermost attachment
const transformEmbed = (embed: DiscordEmbed): MattermostAttachment => {
  const attachment: MattermostAttachment = {
    color: formatColor(embed.color),
    pretext: undefined,
    text: processText(embed.description),
    title: processText(embed.title),
    title_link: embed.url,
    image_url: embed.image?.url,
    thumb_url: embed.thumbnail?.url
  };

  // Handle author
  if (embed.author) {
    attachment.author_name = processText(embed.author.name);
    attachment.author_link = embed.author.url;
    attachment.author_icon = embed.author.icon_url;
  }

  // Handle footer
  if (embed.footer) {
    attachment.footer = processText(embed.footer.text);
    attachment.footer_icon = embed.footer.icon_url;
  }

  // Handle fields
  if (embed.fields && embed.fields.length > 0) {
    attachment.fields = embed.fields.map(field => ({
      title: processText(field.name) || '',
      value: processText(field.value) || '',
      short: field.inline || false
    }));
  }

  return attachment;
};

// Main transform function
export function transformDiscordToMattermost(
  discordPayload: DiscordWebhookPayload
): MattermostWebhookPayload {
  const mattermostPayload: MattermostWebhookPayload = {
    text: processText(discordPayload.content),
    username: processText(discordPayload.username),
    icon_url: discordPayload.avatar_url
  };

  // Transform embeds to attachments
  if (discordPayload.embeds && discordPayload.embeds.length > 0) {
    mattermostPayload.attachments = discordPayload.embeds.map(transformEmbed);
  }

  return mattermostPayload;
}