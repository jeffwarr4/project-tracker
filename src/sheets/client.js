'use strict';

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let _sheets = null;

async function getSheetsClient() {
  if (_sheets) return _sheets;

  const credPath = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH);
  if (!fs.existsSync(credPath)) {
    throw new Error(
      `Google credentials file not found at: ${credPath}\n` +
      'See README.md for instructions on creating a service account.'
    );
  }

  const auth = new google.auth.GoogleAuth({ keyFile: credPath, scopes: SCOPES });
  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

const SPREADSHEET_ID = () => {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID is not set in .env');
  return id;
};

// Ensure both tabs exist with correct headers on first run
async function initializeSheets() {
  const sheets = await getSheetsClient();
  const id = SPREADSHEET_ID();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const existingTitles = meta.data.sheets.map(s => s.properties.title);

  const requests = [];

  if (!existingTitles.includes('Projects')) {
    requests.push({ addSheet: { properties: { title: 'Projects' } } });
  }
  if (!existingTitles.includes('Time Log')) {
    requests.push({ addSheet: { properties: { title: 'Time Log' } } });
  }
  if (!existingTitles.includes('Activity Log')) {
    requests.push({ addSheet: { properties: { title: 'Activity Log' } } });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests } });
  }

  // Write headers if the sheets were just created or are empty
  await ensureHeaders(sheets, id, 'Projects', [
    'Project ID', 'Project Name', 'Client', 'Status',
    'Description', 'Documents Needed', 'Estimated Hours',
    'Hours Logged', 'Last Updated', 'Created By',
  ]);

  await ensureHeaders(sheets, id, 'Time Log', [
    'Project ID', 'Date', 'Hours', 'Description', 'Logged By',
  ]);

  await ensureHeaders(sheets, id, 'Activity Log', [
    'Project ID', 'Date', 'Update Type', 'Description', 'Updated By',
  ]);
}

async function ensureHeaders(sheets, spreadsheetId, sheetName, headers) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1`,
  });

  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

module.exports = { getSheetsClient, SPREADSHEET_ID, initializeSheets };
