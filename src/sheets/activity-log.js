'use strict';

const { getSheetsClient, SPREADSHEET_ID } = require('./client');

const SHEET = 'Activity Log';

// Derive a human-readable update type from the AI result
function resolveUpdateType(category, data) {
  if (category === 'NEW_PROJECT') return 'project created';

  if (category === 'PROJECT_UPDATE') {
    const u = data.updates || data;
    if (u.status) return 'status change';
    if (u.documentsNeeded) return 'new document added';
    if (u.estimatedHours != null) return 'hours adjusted';
    if (u.projectName || u.name) return 'scope change';
    if (u.description || u.notes || u.scopeChange) return 'scope change';
    return 'note';
  }

  return 'note';
}

async function addActivityEntry({ projectId, updateType, description, updatedBy }) {
  const sheets = await getSheetsClient();
  const date = new Date().toISOString().split('T')[0];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET}!A:E`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[projectId, date, updateType, description || '', updatedBy || '']],
    },
  });
}

async function getActivityForProject(projectId) {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET}!A2:E`,
  });

  if (!res.data.values) return [];

  return res.data.values
    .filter(row => row[0] === projectId)
    .map(row => ({
      projectId: row[0],
      date: row[1],
      updateType: row[2],
      description: row[3] || '',
      updatedBy: row[4] || '',
    }));
}

async function getAllActivity(filters = {}) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET}!A2:E`,
  });

  if (!res.data.values) return [];

  let entries = res.data.values.map(row => ({
    projectId: row[0] || '',
    date: row[1] || '',
    updateType: row[2] || '',
    description: row[3] || '',
    updatedBy: row[4] || '',
  }));

  if (filters.projectId) entries = entries.filter(e => e.projectId === filters.projectId);

  return entries.reverse(); // most recent first
}

module.exports = { addActivityEntry, getActivityForProject, resolveUpdateType, getAllActivity };
