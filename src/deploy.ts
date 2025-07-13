// Cloudflare Workers deployment script using Deno
// This script can be used to deploy the bridge to Cloudflare Workers

interface WranglerConfig {
  name: string;
  compatibility_date: string;
  main: string;
  env?: {
    [key: string]: {
      name: string;
    };
  };
}

async function deployToCloudflare() {
  console.log('🚀 Deploying Mattermost Bridges to Cloudflare Workers...');
  
  try {
    // Check if wrangler is installed
    const wranglerCheck = await new Deno.Command('wrangler', {
      args: ['--version'],
      stdout: 'piped',
      stderr: 'piped',
    }).output();

    if (!wranglerCheck.success) {
      console.error('❌ Wrangler CLI not found. Please install it first:');
      console.error('   npm install -g wrangler');
      Deno.exit(1);
    }

    // Deploy to Cloudflare Workers
    const deployCmd = await new Deno.Command('wrangler', {
      args: ['deploy'],
      stdout: 'inherit',
      stderr: 'inherit',
    }).output();

    if (deployCmd.success) {
      console.log('✅ Deployment successful!');
      console.log('📡 Your bridge endpoints are now available:');
      console.log('   POST https://your-worker-name.your-subdomain.workers.dev/discord');
      console.log('   POST https://your-worker-name.your-subdomain.workers.dev/vercel');
      console.log('   GET  https://your-worker-name.your-subdomain.workers.dev/health');
      console.log('');
      console.log('💡 Usage examples:');
      console.log('   curl -X POST "https://your-worker.workers.dev/vercel?url=YOUR_MATTERMOST_WEBHOOK" \\');
      console.log('        -H "Content-Type: application/json" \\');
      console.log('        -d @vercel-payload.json');
    } else {
      console.error('❌ Deployment failed');
      Deno.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during deployment:', error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await deployToCloudflare();
}