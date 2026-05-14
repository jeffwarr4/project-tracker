'use strict';

const { getSheetsClient, SPREADSHEET_ID } = require('./client');

const SHEET = 'Time Log';

async function addTimeEntry({ projectId, hours, description, loggedBy }) {
  const sheets = await getSheetsClient();
  const date = new Date().toISOString().split('T')[0];

  const row = [projectId, date, hours, description || '', loggedBy || ''];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET}!A:E`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { projectId, date, hours, description, loggedBy };
}

async function getTimeEntriesForProject(projectId) {
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
      hours: parseFloat(row[2]) || 0,
      description: row[3] || '',
      loggedBy: row[4] || '',
    }));
}

module.exports = { addTimeEntry, getTimeEntriesForProject };
