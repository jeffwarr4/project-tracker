'use strict';

const { getAllTimeEntries } = require('../sheets/time-log');
const { getAllProjects }    = require('../sheets/projects');
const { sendWeeklyDigest }  = require('../email/mailer');

function getWeekRange() {
  const now = new Date();
  const dow = now.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd:   now.toISOString().split('T')[0],
    monday,
  };
}

function formatWeekLabel(monday) {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const opts = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${friday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

async function runWeeklyDigest() {
  const { weekStart, weekEnd, monday } = getWeekRange();

  const [entries, projects] = await Promise.all([
    getAllTimeEntries({ startDate: weekStart, endDate: weekEnd }),
    getAllProjects(),
  ]);

  if (entries.length === 0) {
    console.log('[weekly-digest] No time entries this week — skipping email.');
    return;
  }

  const projectNames = Object.fromEntries(projects.map(p => [p.id, p.name]));

  const groupMap = {};
  for (const entry of entries) {
    if (!groupMap[entry.projectId]) {
      groupMap[entry.projectId] = {
        name:       projectNames[entry.projectId] || entry.projectId,
        totalHours: 0,
        entries:    [],
      };
    }
    groupMap[entry.projectId].totalHours += entry.hours;
    groupMap[entry.projectId].entries.push(entry);
  }

  const groups     = Object.values(groupMap);
  const totalHours = Math.round(groups.reduce((s, g) => s + g.totalHours, 0) * 10) / 10;
  const weekLabel  = formatWeekLabel(monday);

  await sendWeeklyDigest(weekLabel, groups, totalHours);
  console.log(`[weekly-digest] Sent for ${weekLabel} — ${totalHours}h across ${groups.length} project(s).`);
}

module.exports = { runWeeklyDigest };
