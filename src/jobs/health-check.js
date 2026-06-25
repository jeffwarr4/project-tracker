'use strict';

const axios = require('axios');
const { parseMessage } = require('../ai/message-parser');
const { addProject, getAllProjects, deleteProject } = require('../sheets/projects');
const { sendHealthAlert } = require('../email/mailer');

const GRAPH_URL = 'https://graph.facebook.com/v21.0';
const TEST_PROJECT_NAME = 'Health Check (auto-generated — safe to ignore, deleted within seconds)';

async function checkWhatsAppToken() {
  await axios.get(`${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
    params: { fields: 'display_phone_number' },
  });
}

async function checkAiParsing() {
  const result = await parseMessage('Spent 1 hour on the website, fixed a typo.', []);
  if (!result.category || !result.data) throw new Error('AI response missing category/data');
}

// Proves the bot can actually create a project entry (Sheets auth + write),
// then removes the row immediately so nothing fake is left behind.
async function checkSheetsWrite() {
  const project = await addProject({ projectName: TEST_PROJECT_NAME, createdBy: 'health-check' });
  try {
    const projects = await getAllProjects();
    if (!projects.some(p => p.id === project.id)) {
      throw new Error('Test project not found after write');
    }
  } finally {
    const deleted = await deleteProject(project.id).catch(err => {
      console.error(`[health-check] Failed to clean up test project ${project.id}:`, err.message);
      return false;
    });
    if (!deleted) {
      console.error(`[health-check] Test project ${project.id} may still be in the Projects sheet — remove it manually.`);
    }
  }
}

const CHECKS = [
  { name: 'WhatsApp access token',          fn: checkWhatsAppToken },
  { name: 'AI message parsing (Claude)',    fn: checkAiParsing },
  { name: 'Google Sheets write/delete',     fn: checkSheetsWrite },
];

async function runHealthCheck() {
  const failures = [];

  for (const { name, fn } of CHECKS) {
    try {
      await fn();
      console.log(`[health-check] ${name}: OK`);
    } catch (err) {
      console.error(`[health-check] ${name}: FAILED — ${err.message}`);
      failures.push({ name, error: err.message });
    }
  }

  if (failures.length > 0) {
    await sendHealthAlert(failures).catch(err =>
      console.error('[health-check] Failed to send alert email:', err.message)
    );
  }

  return failures;
}

module.exports = { runHealthCheck };
