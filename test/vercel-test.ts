/**
 * Vercel-specific test script for the Vercel to Mattermost bridge
 * Tests various Vercel webhook payload scenarios
 */

import { transformVercelToMattermost } from '../src/transformers/vercel.ts';
import type { VercelWebhookPayload } from '../src/types.ts';

interface VercelTestCase {
  name: string;
  payload: any; // Using any to support both official and legacy formats
  description: string;
  expectedEventType?: string;
}

class VercelBridgeTest {
  private testCases: VercelTestCase[] = [
    {
      name: 'Official API - deployment.created',
      description: 'New deployment started using official webhook API',
      expectedEventType: 'deployment.created',
      payload: {
        type: 'deployment.created',
        id: 'evt_test_created',
        createdAt: 1704067200000, // 2024-01-01 00:00:00
        payload: {
          user: { id: 'user_123', username: 'developer' },
          team: { id: 'team_456', name: 'My Team' },
          project: { id: 'prj_789', name: 'awesome-app' },
          deployment: {
            id: 'dpl_created_123',
            url: 'awesome-app-abc123.vercel.app',
            target: 'production',
            meta: {
              githubCommitMessage: 'Add new landing page',
              githubCommitAuthorLogin: 'developer',
              githubCommitSha: 'a1b2c3d4e5f6789012345',
              githubCommitRef: 'main',
              githubRepo: 'awesome-app',
              githubOrg: 'my-org'
            }
          },
          links: {
            deployment: 'https://vercel.com/my-team/awesome-app/deployments/dpl_created_123',
            project: 'https://vercel.com/my-team/awesome-app'
          }
        }
      }
    },
    {
      name: 'Official API - deployment.succeeded',
      description: 'Deployment completed successfully',
      expectedEventType: 'deployment.succeeded',
      payload: {
        type: 'deployment.succeeded',
        id: 'evt_test_succeeded',
        createdAt: 1704067800000,
        payload: {
          project: { id: 'prj_789', name: 'awesome-app' },
          deployment: {
            id: 'dpl_success_456',
            url: 'awesome-app-xyz789.vercel.app',
            target: 'production'
          },
          links: {
            deployment: 'https://vercel.com/deployments/dpl_success_456',
            project: 'https://vercel.com/projects/awesome-app'
          }
        }
      }
    },
    {
      name: 'Official API - deployment.error',
      description: 'Deployment failed with error',
      expectedEventType: 'deployment.error',
      payload: {
        type: 'deployment.error',
        id: 'evt_test_error',
        createdAt: 1704068400000,
        payload: {
          project: { id: 'prj_789', name: 'broken-app' },
          deployment: {
            id: 'dpl_error_789',
            target: 'production',
            meta: {
              githubCommitMessage: 'This commit breaks things',
              githubCommitAuthorLogin: 'oops-developer',
              githubCommitSha: 'badcommit123456789'
            }
          }
        }
      }
    },
    {
      name: 'Official API - deployment.canceled',
      description: 'Deployment was canceled',
      expectedEventType: 'deployment.canceled',
      payload: {
        type: 'deployment.canceled',
        id: 'evt_test_canceled',
        createdAt: 1704069000000,
        payload: {
          project: { id: 'prj_789', name: 'canceled-app' },
          deployment: {
            id: 'dpl_canceled_012',
            target: 'preview'
          }
        }
      }
    },
    {
      name: 'Official API - project.created',
      description: 'New project was created',
      expectedEventType: 'project.created',
      payload: {
        type: 'project.created',
        id: 'evt_test_project',
        createdAt: 1704069600000,
        payload: {
          project: { id: 'prj_new_123', name: 'brand-new-project' },
          team: { id: 'team_456', name: 'Development Team' }
        }
      }
    },
    {
      name: 'Legacy format - deployment ready',
      description: 'Legacy webhook format (your original sample)',
      expectedEventType: 'deployment.succeeded',
      payload: {
        user: { id: 'a8jPbQUK4PmErjxIlrtvvIRB' },
        team: { id: 'team_EXnb8RdCXjFBUFNDXqdMh5yh' },
        project: { id: 'prj_WGKECis2jp4TLKMpZTXyEcNBux4T', name: 'darkhedgeio' },
        deployment: {
          id: 'dpl_2prfWiWh7v8sX1V6YKBt22zydxQG',
          customEnvironmentId: null,
          meta: {
            githubCommitAuthorName: 'mrvnklm',
            githubCommitAuthorEmail: '24477241+mrvnklm@users.noreply.github.com',
            githubCommitMessage: 'bump',
            githubCommitOrg: 'a11yplan',
            githubCommitRef: 'main',
            githubCommitRepo: 'darkhedgeio',
            githubCommitSha: '5c54a91795358ed8e4e9f70d0656b64117e960b8',
            githubCommitAuthorLogin: 'mrvnklm',
            branchAlias: 'darkhedgeio-git-main-a11yplan.vercel.app'
          },
          name: 'darkhedgeio',
          url: 'darkhedgeio-axe7zpf1j-a11yplan.vercel.app',
          inspectorUrl: 'https://vercel.com/a11yplan/darkhedgeio/2prfWiWh7v8sX1V6YKBt22zydxQG'
        },
        links: {
          deployment: 'https://vercel.com/a11yplan/darkhedgeio/2prfWiWh7v8sX1V6YKBt22zydxQG',
          project: 'https://vercel.com/a11yplan/darkhedgeio'
        },
        name: 'darkhedgeio',
        plan: 'pro',
        regions: ['iad1'],
        target: 'production',
        type: 'LAMBDAS',
        url: 'darkhedgeio-axe7zpf1j-a11yplan.vercel.app'
      }
    },
    {
      name: 'Legacy format - with error',
      description: 'Legacy format indicating deployment failure',
      expectedEventType: 'deployment.error',
      payload: {
        user: { id: 'user123' },
        project: { id: 'prj_error', name: 'failing-project' },
        deployment: {
          id: 'dpl_error_legacy',
          errorMessage: 'Build failed: Module not found',
          target: 'production',
          meta: {
            githubCommitMessage: 'Fix bug but introduce another',
            githubCommitAuthorLogin: 'confused-dev'
          }
        },
        target: 'production'
      }
    },
    {
      name: 'Minimal official payload',
      description: 'Minimal official API payload with required fields only',
      expectedEventType: 'deployment.created',
      payload: {
        type: 'deployment.created',
        id: 'evt_minimal',
        createdAt: Date.now(),
        payload: {}
      }
    },
    {
      name: 'Minimal legacy payload',
      description: 'Minimal legacy payload',
      expectedEventType: 'deployment.created',
      payload: {
        deployment: { id: 'dpl_minimal' }
      }
    },
    {
      name: 'Empty payload',
      description: 'Completely empty payload',
      expectedEventType: 'deployment.created',
      payload: {}
    }
  ];

  async runTransformationTests(): Promise<void> {
    console.log('⚡ Vercel Bridge Transformation Tests');
    console.log('═'.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const testCase of this.testCases) {
      try {
        console.log(`🧪 Testing: ${testCase.name}`);
        console.log(`📝 ${testCase.description}`);
        
        const result = transformVercelToMattermost(testCase.payload);
        
        // Validate the result has required Mattermost structure
        const isValid = this.validateMattermostPayload(result);
        
        if (isValid) {
          console.log('✅ Transformation successful');
          
          // Validate specific aspects
          this.validateSpecificFields(result, testCase);
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

    // Should have username and icon_url for branding
    if (payload.username !== 'Vercel') {
      return false;
    }

    // Should have at least one attachment
    const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;
    if (!hasAttachments) {
      return false;
    }

    // Check attachment structure
    const attachment = payload.attachments[0];
    return attachment.title && attachment.color && attachment.footer;
  }

  private validateSpecificFields(result: any, testCase: VercelTestCase): void {
    const attachment = result.attachments[0];
    
    // Check if event type field exists and has correct value
    const eventTypeField = attachment.fields?.find((f: any) => f.title.includes('Event Type'));
    if (eventTypeField && testCase.expectedEventType) {
      if (eventTypeField.value === testCase.expectedEventType) {
        console.log(`  ✅ Event type correctly set to: ${testCase.expectedEventType}`);
      } else {
        console.log(`  ⚠️  Event type mismatch: expected ${testCase.expectedEventType}, got ${eventTypeField.value}`);
      }
    }

    // Check for appropriate emoji in title
    const hasEmoji = attachment.title.includes(':');
    if (hasEmoji) {
      console.log('  ✅ Title includes emoji');
    }

    // Check for action buttons if URL is available
    const hasActions = Array.isArray(attachment.actions) && attachment.actions.length > 0;
    if (hasActions) {
      console.log(`  ✅ ${attachment.actions.length} action button(s) added`);
    }
  }

  async runEndpointTests(baseUrl: string, webhookUrl?: string): Promise<void> {
    console.log('\n🌐 Vercel Endpoint Integration Tests');
    console.log('═'.repeat(60));
    
    if (!webhookUrl) {
      console.log('⚠️  No webhook URL provided - skipping integration tests');
      console.log('   Use: deno run vercel-test.ts <base_url> <webhook_url>');
      return;
    }

    let passed = 0;
    let failed = 0;

    // Test first 6 cases (mix of official and legacy)
    for (const testCase of this.testCases.slice(0, 6)) {
      try {
        const url = `${baseUrl}/vercel?url=${encodeURIComponent(webhookUrl)}`;
        
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
        
        // Add small delay to avoid overwhelming the endpoint
        await new Promise(resolve => setTimeout(resolve, 500));
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

  const tester = new VercelBridgeTest();
  
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