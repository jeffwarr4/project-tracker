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

async function getAllTimeEntries(filters = {}) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET}!A2:E`,
  });

  if (!res.data.values) return [];

  let entries = res.data.values.map(row => ({
    projectId: row[0] || '',
    date: row[1] || '',
    hours: parseFloat(row[2]) || 0,
    description: row[3] || '',
    loggedBy: row[4] || '',
  }));

  if (filters.projectId) entries = entries.filter(e => e.projectId === filters.projectId);
  if (filters.startDate)  entries = entries.filter(e => e.date >= filters.startDate);
  if (filters.endDate)    entries = entries.filter(e => e.date <= filters.endDate);

  return entries;
}

module.exports = { addTimeEntry, getTimeEntriesForProject, getAllTimeEntries };
