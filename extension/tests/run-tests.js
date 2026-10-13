/**
 * Spotify Companion - Master Test Runner
 * Executes all automated tests covering Manifest V3, syntax, validation, storage, dashboard, and controller.
 */

import { runManifestTests } from './manifest.test.js';
import { runSyntaxTests } from './syntax.test.js';
import { runValidationTests } from './validation.test.js';
import { runStorageTests } from './storage.test.js';
import { runDashboardTests } from './dashboard.test.js';
import { runControllerTests } from './controller.test.js';
import { runUiContractTests } from './ui-contract.test.js';

const suites = [
  { name: 'Manifest V3 & File Integrity', fn: runManifestTests },
  { name: 'JavaScript Syntax Validation', fn: runSyntaxTests },
  { name: 'Data Validation & Sanitization', fn: runValidationTests },
  { name: 'Storage Persistence & Recovery', fn: runStorageTests },
  { name: 'Dashboard Widget Management', fn: runDashboardTests },
  { name: 'Spotify Controller & Messaging', fn: runControllerTests },
  { name: 'UI Contracts & Security Checks', fn: runUiContractTests }
];

async function main() {
  const startTime = Date.now();
  console.log('====================================================');
  console.log('   SPOTIFY COMPANION - AUTOMATED TEST SUITE        ');
  console.log('====================================================');

  let passedSuites = 0;
  let failedSuites = 0;

  for (const suite of suites) {
    try {
      await suite.fn();
      passedSuites++;
    } catch (err) {
      failedSuites++;
      console.error(`\n✖ [FAILED] ${suite.name}:`, err.message);
      if (err.stack) {
        console.error(err.stack);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedSuites} Passed, ${failedSuites} Failed (${duration}s)`);
  console.log('====================================================');

  if (failedSuites > 0) {
    process.exit(1);
  } else {
    console.log('All automated tests completed successfully! 🎉\n');
    process.exit(0);
  }
}

main();
