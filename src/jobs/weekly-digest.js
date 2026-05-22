'use strict';

const { getAllTimeEntries } = require('../sheets/time-log');
const { getAllProjects }    = require('../sheets/projects');
const { sendWeeklyDigest }  = require('../email/mailer');

async function runWeeklyDigest() {
  const [entries, projects] = await Promise.all([
    getAllTimeEntries({ unreportedOnly: true }),
    getAllProjects(),
  ]);

  if (entries.length === 0) {
    console.log('[weekly-digest] No unreported time entries — skipping email.');
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
  const asOf = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  await sendWeeklyDigest(`Previously unreported hours — as of ${asOf}`, groups, totalHours);
  console.log(`[weekly-digest] Sent unreported hours digest — ${totalHours}h across ${groups.length} project(s).`);
}

module.exports = { runWeeklyDigest };
