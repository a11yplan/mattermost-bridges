const testPayloads = {
  deployment: {
    type: "deployment",
    payload: {
      deployment: {
        id: "dpl_3bvdNVGny8Ery4B6aFouPHNPrzmk",
        url: "darkhedgeio-hn09d97ho-a11yplan.vercel.app",
        name: "darkhedgeio",
        target: "production",
        ready: false,
        inspectorUrl: "https://vercel.com/a11yplan/darkhedgeio/3bvdNVGny8Ery4B6aFouPHNPrzmk",
        meta: {
          githubCommitRef: "main",
          githubCommitMessage: "bump",
          githubCommitAuthorLogin: "mrvnklm",
          githubCommitAuthorEmail: "24477241+mrvnklm@users.noreply.github.com",
          githubCommitSha: "5c54a91795358ed8e4e9f70d0656b64117e960b8",
          githubCommitOrg: "a11yplan",
          githubCommitRepo: "darkhedgeio",
          githubDeployment: "1",
          githubOrg: "a11yplan",
          githubRepo: "darkhedgeio",
          githubRepoOwnerType: "Organization",
          githubCommitRepoId: "1001500868",
          githubRepoId: "1001500868",
          githubRepoVisibility: "private",
          githubHost: "github.com",
          branchAlias: "darkhedgeio-git-main-a11yplan.vercel.app",
          action: "redeploy",
          originalDeploymentId: "dpl_28uVQrejbH9EYUYjrg3B8DshSAQm"
        }
      },
      project: {
        id: "prj_WGKECis2jp4TLKMpZTXyEcNBux4T",
        name: "darkhedgeio"
      },
      team: {
        id: "team_EXnb8RdCXjFBUFNDXqdMh5yh",
        name: "a11yplan"
      },
      links: {
        deployment: "https://vercel.com/a11yplan/darkhedgeio/3bvdNVGny8Ery4B6aFouPHNPrzmk",
        project: "https://vercel.com/a11yplan/darkhedgeio"
      },
      user: {
        id: "a8jPbQUK4PmErjxIlrtvvIRB"
      },
      plan: "pro",
      regions: ["iad1"],
      type: "LAMBDAS"
    },
    createdAt: new Date().toISOString()
  },
  deploymentReady: {
    type: "deployment-ready",
    payload: {
      deployment: {
        id: "dpl_test456",
        url: "my-app-xyz789.vercel.app",
        name: "my-app",
        target: "production",
        ready: true,
        meta: {
          githubCommitMessage: "Fix bug in user authentication"
        }
      },
      project: {
        id: "prj_test456",
        name: "my-awesome-app"
      }
    },
    createdAt: new Date().toISOString()
  },
  deploymentError: {
    type: "deployment-error",
    payload: {
      deployment: {
        id: "dpl_test789",
        name: "my-app",
        target: "production",
        errorMessage: "Build failed: Module not found",
        meta: {
          githubCommitRef: "feature/new-ui"
        }
      },
      project: {
        id: "prj_test789",
        name: "my-awesome-app"
      }
    },
    createdAt: new Date().toISOString()
  }
};

async function testWebhook(payload, webhookUrl = null) {
  console.log('Testing webhook with payload type:', payload.type);
  
  let url = 'http://localhost:8787/webhook';
  if (webhookUrl) {
    url += `?webhook_url=${encodeURIComponent(webhookUrl)}`;
  }
  console.log('Sending to:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
    console.log('---');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Vercel webhook conversions...\n');
  console.log('Make sure to run "npm run dev" in another terminal first!\n');
  
  const args = process.argv.slice(2);
  const customWebhookUrl = args.find(arg => arg.startsWith('--webhook-url='))?.split('=')[1];
  
  if (customWebhookUrl) {
    console.log(`Using custom webhook URL: ${customWebhookUrl}\n`);
  } else {
    console.log('Using MATTERMOST_WEBHOOK_URL from .dev.vars\n');
    console.log('Tip: You can also pass a webhook URL as a query parameter:\n');
    console.log('     node test/test-webhook.js --webhook-url=https://your-mattermost.com/hooks/xxx\n');
  }
  
  for (const [name, payload] of Object.entries(testPayloads)) {
    await testWebhook(payload, customWebhookUrl);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✅ Tests completed!');
}

runTests();