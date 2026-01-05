/**
 * Runtime Error Checker
 *
 * Starts the dev server, makes a request to verify no runtime errors,
 * and exits with appropriate code for CI/testing.
 */

const { spawn } = require('child_process');
const http = require('http');

const DEV_PORT = 3000;
const MAX_WAIT_TIME = 60000; // 60 seconds
const POLL_INTERVAL = 500; // 500ms

let devServer = null;
let hasError = false;
let errorMessage = '';

/**
 * Start the Next.js dev server
 */
function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting dev server...');

    devServer = spawn('pnpm', ['dev'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';

    devServer.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;

      // Look for "Ready" message
      if (text.includes('Ready in')) {
        console.log('✅ Dev server ready');
        resolve();
      }

      // Log interesting output
      if (text.includes('Compiled') || text.includes('Error') || text.includes('Warning')) {
        process.stdout.write(text);
      }
    });

    devServer.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);

      // Check for critical errors
      if (text.includes('Error:') || text.includes('TypeError:') || text.includes('SyntaxError:')) {
        hasError = true;
        errorMessage = text;
      }
    });

    devServer.on('error', (error) => {
      reject(new Error(`Failed to start dev server: ${error.message}`));
    });

    devServer.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      if (devServer && !devServer.killed) {
        reject(new Error('Dev server startup timeout'));
      }
    }, MAX_WAIT_TIME);
  });
}

/**
 * Make HTTP request to check if page loads
 */
function checkPage() {
  return new Promise((resolve, reject) => {
    console.log('📡 Requesting http://localhost:' + DEV_PORT + '...');

    const req = http.get(`http://localhost:${DEV_PORT}`, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk.toString();
      });

      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`);

        if (res.statusCode !== 200) {
          reject(new Error(`Page returned status ${res.statusCode}`));
          return;
        }

        // Check for error indicators in HTML
        if (
          body.includes('Unhandled Runtime Error') ||
          body.includes('Error:') ||
          body.includes('next-dev-error-overlay')
        ) {
          // Try to extract error message
          const errorMatch = body.match(/<h2[^>]*>([^<]*Error[^<]*)<\/h2>/);
          const error = errorMatch ? errorMatch[1] : 'Runtime error detected in page';

          reject(new Error(error));
          return;
        }

        console.log('✅ Page loaded successfully without runtime errors');
        resolve();
      });
    });

    req.on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });
  });
}

/**
 * Wait for server to be ready and page to compile
 */
async function waitForCompilation() {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    try {
      await checkPage();
      return true;
    } catch (error) {
      if (error.message.includes('ECONNREFUSED')) {
        // Server not ready yet, wait and retry
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Timeout waiting for page compilation');
}

/**
 * Stop the dev server
 */
function stopDevServer() {
  if (devServer && !devServer.killed) {
    console.log('🛑 Stopping dev server...');

    if (process.platform === 'win32') {
      // Windows: use taskkill to ensure all child processes are killed
      spawn('taskkill', ['/pid', devServer.pid, '/f', '/t'], { shell: true });
    } else {
      devServer.kill('SIGTERM');
    }

    devServer = null;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Start server
    await startDevServer();

    // Wait a bit for initial compilation
    console.log('⏳ Waiting for initial compilation...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if page loads without errors
    await waitForCompilation();

    // Check if any errors were logged during startup
    if (hasError) {
      throw new Error(`Runtime errors detected:\n${errorMessage}`);
    }

    console.log('\n✅ SUCCESS: No runtime errors detected!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED: Runtime error check failed');
    console.error(error.message);
    process.exit(1);
  } finally {
    stopDevServer();
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⚠️  Interrupted by user');
  stopDevServer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopDevServer();
  process.exit(143);
});

// Run
main();
