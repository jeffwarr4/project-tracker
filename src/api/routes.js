'use strict';

const express = require('express');
const { getAllProjects } = require('../sheets/projects');
const { getAllTimeEntries } = require('../sheets/time-log');
const { getAllActivity, addActivityEntry } = require('../sheets/activity-log');
const { sendWhatsAppTemplate } = require('../messaging/whatsapp');

const router = express.Router();

// --- Auth ----------------------------------------------------------------

router.post('/auth', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const norm = p => (p || '').replace(/[\s\-().+]/g, '');
  const input = norm(phone);

  const jeff    = norm(process.env.PHONE_JEFF);
  const partner = norm(process.env.PHONE_PARTNER);

  if (jeff    && input === jeff)    return res.json({ name: process.env.NAME_JEFF    || 'Jeff',    phone: process.env.PHONE_JEFF });
  if (partner && input === partner) return res.json({ name: process.env.NAME_PARTNER || 'Partner', phone: process.env.PHONE_PARTNER });

  return res.status(401).json({ error: 'Phone number not recognized' });
});

// --- Projects ------------------------------------------------------------

router.get('/projects', async (_req, res) => {
  try {
    const projects = await getAllProjects();
    res.json({ projects });
  } catch (err) {
    console.error('GET /api/projects:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Stats ---------------------------------------------------------------

router.get('/stats', async (_req, res) => {
  try {
    const [projects, timeEntries] = await Promise.all([getAllProjects(), getAllTimeEntries()]);

    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().split('T')[0];

    const hoursThisWeek = timeEntries
      .filter(e => e.date >= weekStart)
      .reduce((s, e) => s + e.hours, 0);

    const active    = projects.filter(p => p.status === 'active');
    const completed = projects.filter(p => ['completed', 'cancelled', 'archived'].includes(p.status));
    const hoursRemaining = active
      .filter(p => p.estimatedHours)
      .reduce((s, p) => s + Math.max(0, p.estimatedHours - p.hoursLogged), 0);

    res.json({
      activeProjects:  active.length,
      completedCount:  completed.length,
      hoursThisWeek:   Math.round(hoursThisWeek * 10) / 10,
      hoursRemaining:  Math.round(hoursRemaining * 10) / 10,
    });
  } catch (err) {
    console.error('GET /api/stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Time Log ------------------------------------------------------------

router.get('/timelog', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const filters = {};
    if (projectId) filters.projectId = projectId;
    if (startDate) filters.startDate = startDate;
    if (endDate)   filters.endDate   = endDate;
    const entries = await getAllTimeEntries(filters);
    res.json({ entries });
  } catch (err) {
    console.error('GET /api/timelog:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Activity Feed (Activity Log + Time Log merged) ----------------------

router.get('/activity', async (req, res) => {
  try {
    const { projectId, limit = '100' } = req.query;
    const f = projectId ? { projectId } : {};

    const [actEntries, timeEntries] = await Promise.all([
      getAllActivity(f),
      getAllTimeEntries(f),
    ]);

    const timeAsActivity = timeEntries.map(e => ({
      projectId:  e.projectId,
      date:       e.date,
      updateType: 'time logged',
      description: `${e.hours}h${e.description ? ` — ${e.description}` : ''}`,
      updatedBy:  e.loggedBy,
    }));

    const merged = [...actEntries, ...timeAsActivity]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, parseInt(limit, 10));

    res.json({ entries: merged });
  } catch (err) {
    console.error('GET /api/activity:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Collaboration Message -----------------------------------------------

router.post('/message', async (req, res) => {
  try {
    const { projectId, projectName, message, fromPhone } = req.body || {};
    if (!message || !fromPhone) {
      return res.status(400).json({ error: 'message and fromPhone are required' });
    }

    const strip = p => (p || '').replace(/\+/g, '');
    const jeffId    = strip(process.env.PHONE_JEFF);
    const partnerId = strip(process.env.PHONE_PARTNER);
    const fromId    = strip(fromPhone);

    let recipientWaId, senderName;
    if (fromId === jeffId) {
      recipientWaId = partnerId;
      senderName    = process.env.NAME_JEFF    || 'Jeff';
    } else if (fromId === partnerId) {
      recipientWaId = jeffId;
      senderName    = process.env.NAME_PARTNER || 'Partner';
    } else {
      return res.status(403).json({ error: 'Sender not recognized' });
    }

    if (!recipientWaId) {
      return res.status(400).json({ error: 'Recipient phone not configured in .env' });
    }

    try {
      await sendWhatsAppTemplate(recipientWaId, {
        senderName,
        projectName: projectName || 'Unknown project',
        message,
      });
    } catch (waErr) {
      // Parse Meta's error response for a user-friendly message
      const metaError = waErr.response?.data?.error;
      const code = metaError?.code;
      let friendly;
      if (code === 132001 || metaError?.message?.toLowerCase().includes('template')) {
        friendly = 'WhatsApp template "project_collaboration" not found or not approved. Check Meta WhatsApp Manager.';
      } else if (code === 131047) {
        friendly = 'Message failed: recipient is outside the 24-hour window and the template was rejected.';
      } else {
        friendly = metaError?.message || waErr.message;
      }
      console.error('POST /api/message WhatsApp error:', metaError || waErr.message);
      return res.status(502).json({ error: friendly });
    }

    if (projectId) {
      await addActivityEntry({
        projectId,
        updateType:  'collaboration message',
        description: `${senderName}: ${message.slice(0, 180)}`,
        updatedBy:   senderName,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/message:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
