/**
 * Discord-specific test script for the Discord to Mattermost bridge
 * Tests various Discord webhook payload scenarios
 */

import { transformDiscordToMattermost } from '../src/transformers/discord.ts';
import type { DiscordWebhookPayload } from '../src/types.ts';

interface DiscordTestCase {
  name: string;
  payload: DiscordWebhookPayload;
  description: string;
}

class DiscordBridgeTest {
  private testCases: DiscordTestCase[] = [
    {
      name: 'Simple message',
      description: 'Basic Discord message with content only',
      payload: {
        content: 'Hello from Discord!',
        username: 'TestBot'
      }
    },
    {
      name: 'Message with avatar',
      description: 'Discord message with custom avatar',
      payload: {
        content: 'Message with custom avatar',
        username: 'AvatarBot',
        avatar_url: 'https://example.com/avatar.png'
      }
    },
    {
      name: 'Simple embed',
      description: 'Basic embed with title and description',
      payload: {
        content: 'Check out this embed!',
        embeds: [{
          title: 'Simple Embed Title',
          description: 'This is a basic embed description with **bold** and *italic* text.',
          color: 3447003
        }]
      }
    },
    {
      name: 'Rich embed',
      description: 'Complex embed with all possible fields',
      payload: {
        embeds: [{
          title: 'Rich Embed Example',
          description: 'A comprehensive embed showcasing all features',
          url: 'https://example.com',
          color: 15844367,
          timestamp: '2024-01-15T10:30:00.000Z',
          footer: {
            text: 'Footer text here',
            icon_url: 'https://example.com/footer-icon.png'
          },
          image: {
            url: 'https://example.com/large-image.png'
          },
          thumbnail: {
            url: 'https://example.com/thumbnail.png'
          },
          author: {
            name: 'Author Name',
            url: 'https://example.com/author',
            icon_url: 'https://example.com/author-icon.png'
          },
          fields: [
            { name: 'Inline Field 1', value: 'Value 1', inline: true },
            { name: 'Inline Field 2', value: 'Value 2', inline: true },
            { name: 'Inline Field 3', value: 'Value 3', inline: true },
            { name: 'Non-inline Field', value: 'This field spans the full width', inline: false }
          ]
        }]
      }
    },
    {
      name: 'Multiple embeds',
      description: 'Message with multiple embeds',
      payload: {
        content: 'Here are multiple embeds:',
        embeds: [
          {
            title: 'First Embed',
            description: 'This is the first embed',
            color: 16711680
          },
          {
            title: 'Second Embed',
            description: 'This is the second embed',
            color: 65280
          },
          {
            title: 'Third Embed',
            description: 'This is the third embed',
            color: 255
          }
        ]
      }
    },
    {
      name: 'Timestamp formatting',
      description: 'Discord timestamp tags with various formats',
      payload: {
        content: `Timestamp examples:
- Short time: <t:1640995200:t>
- Long time: <t:1640995200:T>
- Short date: <t:1640995200:d>
- Long date: <t:1640995200:D>
- Short date/time: <t:1640995200:f>
        - Long date/time: <t:1640995200:F>
- Relative time: <t:1640995200:R>`,
        username: 'TimeBot'
      }
    },
    {
      name: 'Emoji handling',
      description: 'Message with various emoji formats',
      payload: {
        content: 'Emoji test: 🎉 :tada: `🚀` :rocket: **🎯** *⚡*',
        embeds: [{
          title: '🎮 Gaming Stats',
          description: 'Player achieved `🏆` victory!',
          fields: [
            { name: '⚔️ Battles Won', value: '42', inline: true },
            { name: '🛡️ Defense', value: '85%', inline: true }
          ]
        }]
      }
    },
    {
      name: 'Empty content',
      description: 'Embed-only message with no content',
      payload: {
        embeds: [{
          title: 'Embed Without Content',
          description: 'This message has no content field, only embeds.'
        }]
      }
    },
    {
      name: 'Minimal payload',
      description: 'Bare minimum Discord payload',
      payload: {
        content: 'Minimal message'
      }
    },
    {
      name: 'Empty payload',
      description: 'Completely empty Discord payload',
      payload: {}
    }
  ];

  async runTransformationTests(): Promise<void> {
    console.log('🎮 Discord Bridge Transformation Tests');
    console.log('═'.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const testCase of this.testCases) {
      try {
        console.log(`🧪 Testing: ${testCase.name}`);
        console.log(`📝 ${testCase.description}`);
        
        const result = transformDiscordToMattermost(testCase.payload);
        
        // Validate the result has required Mattermost structure
        const isValid = this.validateMattermostPayload(result);
        
        if (isValid) {
          console.log('✅ Transformation successful');
          passed++;
        } else {
          console.log('❌ Invalid Mattermost payload structure');
          failed++;
        }

        // Log the transformation result in verbose mode
        if (Deno.args.includes('--verbose') || Deno.args.includes('-v')) {
          console.log('📤 Input:');
          console.log(JSON.stringify(testCase.payload, null, 2));
          console.log('📥 Output:');
          console.log(JSON.stringify(result, null, 2));
        }

        console.log('─'.repeat(40));
        console.log('');
      } catch (error) {
        console.log(`❌ Transformation failed: ${error}`);
        failed++;
        console.log('─'.repeat(40));
        console.log('');
      }
    }

    this.printSummary(passed, failed);
  }

  private validateMattermostPayload(payload: any): boolean {
    // Basic validation for Mattermost webhook payload
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    // Should have at least one of: text, attachments
    const hasText = typeof payload.text === 'string';
    const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;

    return hasText || hasAttachments;
  }

  async runEndpointTests(baseUrl: string, webhookUrl?: string): Promise<void> {
    console.log('\n🌐 Discord Endpoint Integration Tests');
    console.log('═'.repeat(60));
    
    if (!webhookUrl) {
      console.log('⚠️  No webhook URL provided - skipping integration tests');
      console.log('   Use: deno run discord-test.ts <base_url> <webhook_url>');
      return;
    }

    let passed = 0;
    let failed = 0;

    for (const testCase of this.testCases.slice(0, 5)) { // Test first 5 cases
      try {
        const url = `${baseUrl}/discord?url=${encodeURIComponent(webhookUrl)}`;
        
        console.log(`🌐 Testing endpoint: ${testCase.name}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.payload)
        });

        const responseData = await response.json();

        if (response.ok) {
          console.log('✅ Endpoint test successful');
          passed++;
        } else {
          console.log(`❌ Endpoint test failed: ${response.status}`);
          console.log(`   Response: ${JSON.stringify(responseData)}`);
          failed++;
        }

        console.log('─'.repeat(40));
      } catch (error) {
        console.log(`❌ Endpoint test error: ${error}`);
        failed++;
        console.log('─'.repeat(40));
      }
    }

    this.printSummary(passed, failed, 'Endpoint Tests');
  }

  private printSummary(passed: number, failed: number, testType: string = 'Transformation Tests'): void {
    const total = passed + failed;
    console.log(`\n📊 ${testType} Summary`);
    console.log('─'.repeat(40));
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  }
}

// CLI interface
async function main() {
  const args = Deno.args;
  const baseUrl = args[0] || 'https://mattermost-bridges.accounts-411.workers.dev';
  const webhookUrl = args[1] || Deno.env.get('MATTERMOST_WEBHOOK_URL');

  const tester = new DiscordBridgeTest();
  
  // Always run transformation tests
  await tester.runTransformationTests();
  
  // Run endpoint tests if URL is provided
  if (args.length > 0 || webhookUrl) {
    await tester.runEndpointTests(baseUrl, webhookUrl);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}