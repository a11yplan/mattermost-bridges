/**
 * General test script for Mattermost bridges
 * Tests all endpoints with various payload scenarios
 */

interface TestConfig {
  baseUrl: string;
  mattermostWebhookUrl?: string;
  verbose?: boolean;
}

interface TestResult {
  endpoint: string;
  testName: string;
  success: boolean;
  status: number;
  response: any;
  error?: string;
  duration: number;
}

class BridgeTestRunner {
  private config: TestConfig;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
  }

  async runTest(
    endpoint: string,
    testName: string,
    payload: any,
    expectedStatus: number = 200
  ): Promise<TestResult> {
    const startTime = Date.now();
    const url = `${this.config.baseUrl}${endpoint}${this.config.mattermostWebhookUrl ? `?url=${encodeURIComponent(this.config.mattermostWebhookUrl)}` : ''}`;
    
    try {
      const response = await fetch(url, {
        method: endpoint === '/health' ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: endpoint === '/health' ? undefined : JSON.stringify(payload),
      });

      const responseData = await response.json();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        endpoint,
        testName,
        success: response.status === expectedStatus,
        status: response.status,
        response: responseData,
        duration
      };

      if (!result.success) {
        result.error = `Expected status ${expectedStatus}, got ${response.status}`;
      }

      this.results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        endpoint,
        testName,
        success: false,
        status: 0,
        response: null,
        error: error instanceof Error ? error.message : String(error),
        duration
      };

      this.results.push(result);
      return result;
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Mattermost Bridges Test Suite');
    console.log(`📡 Testing: ${this.config.baseUrl}`);
    console.log(`🔗 Webhook URL: ${this.config.mattermostWebhookUrl ? 'Configured' : 'Missing (some tests will fail)'}`);
    console.log('');

    // Health check tests
    await this.runHealthTests();
    
    // Discord bridge tests
    await this.runDiscordTests();
    
    // Vercel bridge tests
    await this.runVercelTests();
    
    // Error handling tests
    await this.runErrorTests();

    this.printSummary();
  }

  private async runHealthTests(): Promise<void> {
    console.log('🏥 Health Check Tests');
    console.log('─'.repeat(50));

    await this.runTest('/health', 'Health endpoint', {});
    await this.runTest('/', 'Root endpoint (health alias)', {});
  }

  private async runDiscordTests(): Promise<void> {
    console.log('\n🎮 Discord Bridge Tests');
    console.log('─'.repeat(50));

    // Basic Discord webhook
    await this.runTest('/discord', 'Basic Discord message', {
      content: 'Hello from Discord test!',
      username: 'Test Bot'
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Discord with embeds
    await this.runTest('/discord', 'Discord with embeds', {
      content: 'Check out this embed!',
      username: 'Embed Bot',
      embeds: [{
        title: 'Test Embed',
        description: 'This is a test embed with **bold** and *italic* text',
        color: 3447003,
        fields: [
          { name: 'Field 1', value: 'Value 1', inline: true },
          { name: 'Field 2', value: 'Value 2', inline: true }
        ],
        footer: { text: 'Test Footer' },
        timestamp: new Date().toISOString()
      }]
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Discord with timestamp formatting
    await this.runTest('/discord', 'Discord with timestamp tags', {
      content: 'Event happened <t:1640995200:R> and will happen <t:1672531200:F>',
      username: 'Time Bot'
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Empty Discord payload
    await this.runTest('/discord', 'Empty Discord payload', {}, this.config.mattermostWebhookUrl ? 200 : 400);
  }

  private async runVercelTests(): Promise<void> {
    console.log('\n⚡ Vercel Bridge Tests');
    console.log('─'.repeat(50));

    // Official Vercel API format - deployment.created
    await this.runTest('/vercel', 'Official API - deployment.created', {
      type: 'deployment.created',
      id: 'test-webhook-id',
      createdAt: Date.now(),
      payload: {
        project: { id: 'prj_test', name: 'test-project' },
        deployment: {
          id: 'dpl_test',
          url: 'test-project-abc123.vercel.app',
          target: 'production',
          meta: {
            githubCommitMessage: 'Add new feature',
            githubCommitAuthorLogin: 'testuser',
            githubCommitSha: 'abc1234567890abcdef',
            githubCommitRef: 'main'
          }
        },
        links: {
          deployment: 'https://vercel.com/project/deployment',
          project: 'https://vercel.com/project'
        }
      }
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Official Vercel API format - deployment.succeeded
    await this.runTest('/vercel', 'Official API - deployment.succeeded', {
      type: 'deployment.succeeded',
      id: 'test-webhook-id-2',
      createdAt: Date.now(),
      payload: {
        project: { id: 'prj_test', name: 'my-app' },
        deployment: {
          id: 'dpl_success',
          url: 'my-app-xyz789.vercel.app',
          target: 'production'
        }
      }
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Official Vercel API format - deployment.error
    await this.runTest('/vercel', 'Official API - deployment.error', {
      type: 'deployment.error',
      id: 'test-webhook-id-3',
      createdAt: Date.now(),
      payload: {
        project: { id: 'prj_test', name: 'failing-project' },
        deployment: {
          id: 'dpl_error',
          target: 'production'
        }
      }
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Legacy format (your original sample)
    await this.runTest('/vercel', 'Legacy format', {
      user: { id: 'user123' },
      team: { id: 'team123' },
      project: { id: 'prj_123', name: 'legacy-project' },
      deployment: {
        id: 'dpl_legacy',
        url: 'legacy-project.vercel.app',
        target: 'production',
        meta: {
          githubCommitMessage: 'Legacy deployment test',
          githubCommitAuthorLogin: 'legacyuser',
          githubCommitSha: 'legacy123456789'
        }
      },
      links: {
        deployment: 'https://vercel.com/legacy/deployment',
        project: 'https://vercel.com/legacy/project'
      },
      target: 'production'
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Minimal Vercel payload
    await this.runTest('/vercel', 'Minimal payload', {
      type: 'deployment.created',
      id: 'minimal-test',
      createdAt: Date.now(),
      payload: {}
    }, this.config.mattermostWebhookUrl ? 200 : 400);

    // Empty Vercel payload
    await this.runTest('/vercel', 'Empty payload', {}, this.config.mattermostWebhookUrl ? 200 : 400);
  }

  private async runErrorTests(): Promise<void> {
    console.log('\n❌ Error Handling Tests');
    console.log('─'.repeat(50));

    // Test invalid methods
    const invalidMethodUrl = `${this.config.baseUrl}/discord`;
    try {
      const response = await fetch(invalidMethodUrl, { method: 'GET' });
      const data = await response.json();
      this.results.push({
        endpoint: '/discord',
        testName: 'Invalid method (GET)',
        success: response.status === 405,
        status: response.status,
        response: data,
        duration: 0
      });
    } catch (error) {
      this.results.push({
        endpoint: '/discord',
        testName: 'Invalid method (GET)',
        success: false,
        status: 0,
        response: null,
        error: String(error),
        duration: 0
      });
    }

    // Test invalid endpoint
    await this.runTest('/invalid-endpoint', 'Invalid endpoint', {}, 404);

    // Test malformed JSON (this will be caught by the fetch API)
    console.log('⚠️  Note: Malformed JSON tests require manual testing with curl');
  }

  private printSummary(): void {
    console.log('\n📊 Test Results Summary');
    console.log('═'.repeat(80));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`⏱️  Average Duration: ${Math.round(this.results.reduce((sum, r) => sum + r.duration, 0) / total)}ms`);
    console.log('');

    // Print detailed results
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const statusCode = result.status > 0 ? `[${result.status}]` : '[ERROR]';
      console.log(`${status} ${statusCode} ${result.endpoint} - ${result.testName} (${result.duration}ms)`);
      
      if (!result.success && this.config.verbose) {
        console.log(`   Error: ${result.error || 'Unknown error'}`);
        if (result.response) {
          console.log(`   Response: ${JSON.stringify(result.response)}`);
        }
      }
    });

    if (failed > 0) {
      console.log('\n💡 Tips for failed tests:');
      console.log('   - Make sure MATTERMOST_WEBHOOK_URL is set or use ?url= parameter');
      console.log('   - Check that the bridge service is running and accessible');
      console.log('   - Verify your Mattermost webhook URL is valid');
    }
  }
}

// CLI interface
async function main() {
  const args = Deno.args;
  const baseUrl = args[0] || 'https://mattermost-bridges.accounts-411.workers.dev';
  const mattermostWebhookUrl = args[1] || Deno.env.get('MATTERMOST_WEBHOOK_URL');
  const verbose = args.includes('--verbose') || args.includes('-v');

  const config: TestConfig = {
    baseUrl,
    mattermostWebhookUrl,
    verbose
  };

  const runner = new BridgeTestRunner(config);
  await runner.runAllTests();
}

if (import.meta.main) {
  main().catch(console.error);
}