'use strict';

require('dotenv').config();
const { parseMessage } = require('../src/ai/message-parser');

// Simulated existing projects for context
const MOCK_PROJECTS = [
  { id: 'PRJ-001', name: 'Acme Website Redesign', client: 'Acme Corp', status: 'active' },
  { id: 'PRJ-002', name: 'Johnson Logo Package', client: 'Johnson & Partners', status: 'active' },
  { id: 'PRJ-003', name: 'Internal Dashboard', client: null, status: 'on-hold' },
];

const TEST_MESSAGES = [
  // --- NEW PROJECT (3 cases) ---
  {
    label: '1. New project — explicit trigger phrase',
    message: 'New project for Sunset Bakery. They need a full brand identity package — logo, business cards, and menu design. Estimated about 20 hours.',
    expectedCategory: 'NEW_PROJECT',
  },
  {
    label: '2. New project — implied by unknown client',
    message: "Starting work for Taylor Roofing. They need a proposal and contract first, then we'll get into the website build.",
    expectedCategory: 'NEW_PROJECT',
  },
  {
    label: '3. New project — internal project',
    message: 'We need to set up a new project for our portfolio refresh. No client, just internal work. Maybe 10 hours.',
    expectedCategory: 'NEW_PROJECT',
  },

  // --- PROJECT UPDATE (3 cases) ---
  {
    label: '4. Project update — status change',
    message: "The Acme website is going on hold. Client is pausing for budget review.",
    expectedCategory: 'PROJECT_UPDATE',
  },
  {
    label: '5. Project update — scope change',
    message: "Johnson logo package just expanded — they now want social media templates too. Revising estimate to 15 hours.",
    expectedCategory: 'PROJECT_UPDATE',
  },
  {
    label: '6. Project update — documents needed',
    message: 'Still waiting on the signed contract from Acme before we can proceed.',
    expectedCategory: 'PROJECT_UPDATE',
  },

  // --- TIME LOG (2 cases) ---
  {
    label: '7. Time log — explicit hours',
    message: 'Logged 3.5 hours on the Acme website today. Did the full homepage layout and started the about page.',
    expectedCategory: 'TIME_LOG',
  },
  {
    label: '8. Time log — natural language hours',
    message: 'Spent half a day on Johnson logos, went through two rounds of revisions with the client.',
    expectedCategory: 'TIME_LOG',
  },

  // --- VOICE NOTE SIMULATION ---
  {
    label: '9. Voice note transcript — casual/informal speech',
    message: "Hey so I just finished up a call with um, Taylor Roofing, and yeah we're gonna do the website for them. They want like a five-page site. I'm thinking maybe fifteen hours? Let's set that up as a new project.",
    expectedCategory: 'NEW_PROJECT',
  },

  // --- CLARIFICATION NEEDED ---
  {
    label: '10. Ambiguous — unclear project reference',
    message: 'Just wrapped up the meeting, took about two hours.',
    expectedCategory: 'CLARIFICATION_NEEDED',
  },
];

async function runTests() {
  console.log('=== Project Tracker — Message Parser Tests ===\n');
  let passed = 0;
  let failed = 0;

  for (const test of TEST_MESSAGES) {
    console.log(`${test.label}`);
    console.log(`  Message: "${test.message.slice(0, 80)}${test.message.length > 80 ? '...' : ''}"`);

    try {
      const result = await parseMessage(test.message, MOCK_PROJECTS);
      const match = result.category === test.expectedCategory;

      if (match) {
        console.log(`  ✓ Category: ${result.category} (confidence: ${result.confidence})`);
        passed++;
      } else {
        console.log(`  ✗ Expected: ${test.expectedCategory} | Got: ${result.category}`);
        failed++;
      }

      // Show key extracted data
      if (result.category === 'NEW_PROJECT') {
        console.log(`    → Project: ${result.data.projectName}, Client: ${result.data.clientName}, Hours: ${result.data.estimatedHours}`);
      } else if (result.category === 'PROJECT_UPDATE') {
        console.log(`    → Project: ${result.data.projectName} (${result.data.projectId})`);
        console.log(`    → Updates: ${JSON.stringify(result.data.updates)}`);
      } else if (result.category === 'TIME_LOG') {
        console.log(`    → Project: ${result.data.projectName}, Hours: ${result.data.hours}`);
        console.log(`    → Work: ${result.data.description}`);
      } else if (result.category === 'CLARIFICATION_NEEDED') {
        console.log(`    → Question: ${result.data.question}`);
      }

      if (result.confirmationMessage) {
        console.log(`    → Reply: "${result.confirmationMessage}"`);
      }
    } catch (err) {
      console.log(`  ✗ ERROR: ${err.message}`);
      failed++;
    }

    console.log();
  }

  console.log(`=== Results: ${passed} passed, ${failed} failed out of ${TEST_MESSAGES.length} tests ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
