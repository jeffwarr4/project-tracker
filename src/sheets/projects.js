'use strict';

const { getSheetsClient, SPREADSHEET_ID } = require('./client');

const SHEET = 'Projects';
// Column indices (0-based) matching header order
const COL = {
  ID: 0, NAME: 1, CLIENT: 2, STATUS: 3, DESCRIPTION: 4,
  DOCS: 5, EST_HOURS: 6, HOURS_LOGGED: 7, UPDATED: 8, CREATED_BY: 9,
};

async function getAllProjects() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET}!A2:J`,
  });

  if (!res.data.values) return [];

  return res.data.values.map(row => ({
    id: row[COL.ID] || '',
    name: row[COL.NAME] || '',
    client: row[COL.CLIENT] || '',
    status: row[COL.STATUS] || 'active',
    description: row[COL.DESCRIPTION] || '',
    documentsNeeded: row[COL.DOCS] ? row[COL.DOCS].split(',').map(d => d.trim()) : [],
    estimatedHours: parseFloat(row[COL.EST_HOURS]) || null,
    hoursLogged: parseFloat(row[COL.HOURS_LOGGED]) || 0,
    lastUpdated: row[COL.UPDATED] || '',
  }));
}

async function addProject(data) {
  const sheets = await getSheetsClient();
  const id = SPREADSHEET_ID();

  const projects = await getAllProjects();
  const nextNum = projects.length + 1;
  const projectId = `PRJ-${String(nextNum).padStart(3, '0')}`;
  const now = new Date().toISOString().split('T')[0];

  const row = [
    projectId,
    data.projectName || '',
    data.clientName || '',
    'active',
    data.description || '',
    Array.isArray(data.documentsNeeded) ? data.documentsNeeded.join(', ') : '',
    data.estimatedHours != null ? data.estimatedHours : '',
    0,
    now,
    data.createdBy || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${SHEET}!A:J`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { ...data, id: projectId, hoursLogged: 0, lastUpdated: now };
}

async function updateProject(projectId, updates) {
  const sheets = await getSheetsClient();
  const id = SPREADSHEET_ID();

  // Only read the ID column to locate the row — avoids fetching stale data we'd write back
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SHEET}!A:A`,
  });

  if (!res.data.values) throw new Error('Projects sheet is empty');

  const rowIndex = res.data.values.findIndex((row, i) => i > 0 && row[0] === projectId);
  if (rowIndex === -1) throw new Error(`Project ${projectId} not found`);

  const sheetRowNumber = rowIndex + 1; // 1-based, includes header row
  const now = new Date().toISOString().split('T')[0];

  // Only write cells that are explicitly changing — never touch the rest
  const colLetter = ['A','B','C','D','E','F','G','H','I','J'];
  const changes = [];

  if (updates.projectName || updates.name)
    changes.push({ col: COL.NAME, value: updates.projectName || updates.name });
  if (updates.clientName || updates.client)
    changes.push({ col: COL.CLIENT, value: updates.clientName || updates.client });
  if (updates.status)
    changes.push({ col: COL.STATUS, value: updates.status });
  if (updates.description)
    changes.push({ col: COL.DESCRIPTION, value: updates.description });
  if (updates.documentsNeeded)
    changes.push({ col: COL.DOCS, value: updates.documentsNeeded.join(', ') });
  if (updates.estimatedHours != null)
    changes.push({ col: COL.EST_HOURS, value: updates.estimatedHours });
  if (updates.notes)
    changes.push({ col: COL.DESCRIPTION, value: updates.notes });

  changes.push({ col: COL.UPDATED, value: now });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      valueInputOption: 'RAW',
      data: changes.map(({ col, value }) => ({
        range: `${SHEET}!${colLetter[col]}${sheetRowNumber}`,
        values: [[value]],
      })),
    },
  });

  return { id: projectId, ...updates, lastUpdated: now };
}

async function incrementHoursLogged(projectId, additionalHours) {
  const sheets = await getSheetsClient();
  const id = SPREADSHEET_ID();

  // Only read the ID and Hours Logged columns to avoid touching manually-edited cells
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SHEET}!A:H`,
  });

  if (!res.data.values) throw new Error('Projects sheet is empty');

  const rowIndex = res.data.values.findIndex((row, i) => i > 0 && row[COL.ID] === projectId);
  if (rowIndex === -1) throw new Error(`Project ${projectId} not found in sheet`);

  const currentHours = parseFloat(res.data.values[rowIndex][COL.HOURS_LOGGED]) || 0;
  const newTotal = currentHours + additionalHours;
  const now = new Date().toISOString().split('T')[0];

  // Only write the two cells that changed — leaves all other columns untouched
  const sheetRowNumber = rowIndex + 1;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${SHEET}!H${sheetRowNumber}`, values: [[newTotal]] },
        { range: `${SHEET}!I${sheetRowNumber}`, values: [[now]] },
      ],
    },
  });

  return newTotal;
}

module.exports = { getAllProjects, addProject, updateProject, incrementHoursLogged };
