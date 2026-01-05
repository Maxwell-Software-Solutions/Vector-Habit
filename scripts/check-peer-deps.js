#!/usr/bin/env node

/**
 * Peer Dependency Checker
 *
 * Validates that all installed packages have compatible peer dependencies.
 * Run this script in CI and pre-commit hooks to catch version mismatches early.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPeerDependencies() {
  log('\n🔍 Checking peer dependencies...', 'cyan');

  try {
    // Run pnpm install --dry-run to check for peer dependency issues
    // This shows warnings even if packages are already installed
    let output;
    try {
      output = execSync('pnpm install --dry-run 2>&1', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (error) {
      // pnpm may exit with non-zero even for warnings, capture output anyway
      output = error.stdout || error.stderr || '';
    }

    // Check if there are peer dependency warnings
    if (output.includes('Issues with peer dependencies found') || output.includes('unmet peer')) {
      log('\n⚠️  Peer dependency issues detected!\n', 'yellow');

      // Extract and display the warnings
      const lines = output.split('\n');
      let inWarningSection = false;
      const warnings = [];

      for (const line of lines) {
        if (line.includes('Issues with peer dependencies found')) {
          inWarningSection = true;
          continue;
        }
        if (line.includes('Done in')) {
          inWarningSection = false;
        }
        if (
          inWarningSection &&
          (line.trim().startsWith('✕') ||
            line.trim().startsWith('└') ||
            line.trim().startsWith('├') ||
            line.trim().includes('unmet peer'))
        ) {
          warnings.push(line);
        }
      }

      if (warnings.length > 0) {
        warnings.forEach((warning) => log(warning, 'yellow'));
      } else {
        // Fallback: show relevant lines with 'unmet peer'
        lines.filter((l) => l.includes('unmet peer')).forEach((l) => log(l, 'yellow'));
      }

      log('\n⚠️  WARNING: Peer dependency mismatches detected!', 'yellow');
      log('These may cause runtime errors. Please resolve before deploying.\n', 'yellow');

      // Exit with code 1 if running in CI
      if (process.env.CI === 'true') {
        log('❌ Failing CI due to peer dependency issues\n', 'red');
        process.exit(1);
      } else {
        log('💡 Tip: Review docs/DEPENDENCY-MANAGEMENT.md for known issues\n', 'cyan');
        log('💡 To see details, run: pnpm install --dry-run\n', 'cyan');
        // Exit with 0 in local dev to not block workflow, but warn loudly
        process.exit(0);
      }
    } else {
      log('✅ All peer dependencies are satisfied!\n', 'green');
      process.exit(0);
    }
  } catch (error) {
    log(`\n❌ Error checking dependencies: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

// Main execution
checkPeerDependencies();
