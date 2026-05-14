'use strict';

require('dotenv').config();
const { initializeSheets } = require('../src/sheets/client');
const { getAllProjects, addProject, updateProject, incrementHoursLogged } = require('../src/sheets/projects');
const { addTimeEntry, getTimeEntriesForProject } = require('../src/sheets/time-log');

async function runTests() {
  console.log('=== Project Tracker — Google Sheets Tests ===\n');
  console.log('WARNING: This test writes real data to your Google Sheet.');
  console.log('Use a test sheet ID to avoid polluting production data.\n');

  // Step 1: Initialize sheets
  console.log('1. Initializing sheets...');
  await initializeSheets();
  console.log('   ✓ Sheets initialized\n');

  // Step 2: Read existing projects
  console.log('2. Reading existing projects...');
  const before = await getAllProjects();
  console.log(`   ✓ Found ${before.length} existing projects\n`);

  // Step 3: Add a test project
  console.log('3. Adding a test project...');
  const newProject = await addProject({
    projectName: 'TEST — Delete Me',
    clientName: 'Test Client',
    description: 'This is an automated test entry',
    documentsNeeded: ['brief', 'proposal'],
    estimatedHours: 5,
  });
  console.log(`   ✓ Created project: ${newProject.id}\n`);

  // Step 4: Read projects again and verify
  console.log('4. Verifying project was saved...');
  const after = await getAllProjects();
  const found = after.find(p => p.id === newProject.id);
  if (!found) throw new Error('Test project not found after creation!');
  console.log(`   ✓ Project found: ${found.name} (${found.id})\n`);

  // Step 5: Update the project
  console.log('5. Updating project status...');
  await updateProject(newProject.id, { status: 'on-hold', notes: 'Test update' });
  console.log('   ✓ Project updated\n');

  // Step 6: Log some time
  console.log('6. Logging time for the test project...');
  await addTimeEntry({
    projectId: newProject.id,
    hours: 2.5,
    description: 'Automated test time entry',
    loggedBy: 'Test Runner',
  });
  const newTotal = await incrementHoursLogged(newProject.id, 2.5);
  console.log(`   ✓ Logged 2.5h, total hours: ${newTotal}\n`);

  // Step 7: Read time entries
  console.log('7. Reading time entries for test project...');
  const entries = await getTimeEntriesForProject(newProject.id);
  console.log(`   ✓ Found ${entries.length} time entries\n`);

  console.log('=== All tests passed! ===');
  console.log(`\nNOTE: Clean up the test project "${newProject.id}" from your sheet manually.`);
}

runTests().catch(err => {
  console.error('\n✗ Test failed:', err.message);
  process.exit(1);
});
