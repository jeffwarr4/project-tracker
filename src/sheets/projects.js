'use strict';

const { getSheetsClient, SPREADSHEET_ID } = require('./client');

const SHEET = 'Projects';
const COL = {
  ID: 0, NAME: 1, CLIENT: 2, STATUS: 3, DESCRIPTION: 4,
  LINKS: 5, EST_HOURS: 6, HOURS_LOGGED: 7, UPDATED: 8, CREATED_BY: 9,
};

function parseLinks(raw) {
  if (!raw) return [];
  return raw.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const idx = line.indexOf('|');
      if (idx === -1) return null;
      return { label: line.slice(0, idx).trim(), url: line.slice(idx + 1).trim() };
    })
    .filter(Boolean);
}

function serializeLinks(links) {
  return (links || []).map(l => `${l.label}|${l.url}`).join('\n');
}

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
    links: parseLinks(row[COL.LINKS]),
    estimatedHours: parseFloat(row[COL.EST_HOURS]) || null,
    hoursLogged: parseFloat(row[COL.HOURS_LOGGED]) || 0,
    lastUpdated: row[COL.UPDATED] || '',
    createdBy: row[COL.CREATED_BY] || '',
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
    '',
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
  if (updates.links !== undefined)
    changes.push({ col: COL.LINKS, value: serializeLinks(updates.links) });
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
