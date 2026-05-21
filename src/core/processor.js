'use strict';

const { parseMessage } = require('../ai/message-parser');
const { getAllProjects, addProject, updateProject, incrementHoursLogged } = require('../sheets/projects');
const { addTimeEntry } = require('../sheets/time-log');
const { addActivityEntry, resolveUpdateType } = require('../sheets/activity-log');
const { notifyNewProject, notifyProjectUpdate } = require('../email/mailer');

const silentEmail = promise =>
  promise.catch(err => console.warn('[email] notification failed:', err.message));

/**
 * Core message processing pipeline — shared by all channels.
 *
 * @param {object} opts
 * @param {string}   opts.messageText  — plain text to process (already transcribed if voice)
 * @param {string}   opts.senderName   — display name for sheet records
 * @param {function} opts.replyFn      — async (text) => void, channel-specific send
 */
async function processMessage({ messageText, senderName, replyFn }) {
  let existingProjects = [];
  try {
    existingProjects = await getAllProjects();
  } catch (err) {
    console.warn('Could not fetch projects from sheets:', err.message);
  }

  const result = await parseMessage(messageText, existingProjects);
  const { category, data, confirmationMessage } = result;

  switch (category) {
    case 'NEW_PROJECT': {
      const project = await addProject({ ...data, createdBy: senderName });

      await addActivityEntry({
        projectId: project.id,
        updateType: 'project created',
        description: `${data.projectName}${data.clientName ? ` for ${data.clientName}` : ''}`,
        updatedBy: senderName,
      });

      silentEmail(notifyNewProject({ ...data, id: project.id }, senderName));

      await replyFn(
        `New project created!\n\n` +
        `ID: ${project.id}\n` +
        `Name: ${data.projectName}\n` +
        `Client: ${data.clientName || 'N/A'}\n` +
        (data.estimatedHours ? `Estimated: ${data.estimatedHours}h\n` : '') +
        (confirmationMessage ? `\n${confirmationMessage}` : '')
      );
      break;
    }

    case 'PROJECT_UPDATE': {
      const updates = data.updates || data;
      await updateProject(data.projectId, updates);

      await addActivityEntry({
        projectId: data.projectId,
        updateType: resolveUpdateType(category, data),
        description: updates.notes || updates.scopeChange || updates.description ||
          (updates.status ? `Status changed to ${updates.status}` : '') ||
          (updates.projectName ? `Renamed to ${updates.projectName}` : '') || '',
        updatedBy: senderName,
      });

      silentEmail(notifyProjectUpdate(data.projectId, data.projectName, updates, senderName));

      await replyFn(
        `Project updated!\n\n` +
        `Project: ${data.projectName} (${data.projectId})\n` +
        (updates.status ? `Status: ${updates.status}\n` : '') +
        (updates.notes ? `Notes: ${updates.notes}\n` : '') +
        (confirmationMessage ? `\n${confirmationMessage}` : '')
      );
      break;
    }

    case 'TIME_LOG': {
      const [newTotal] = await Promise.all([
        incrementHoursLogged(data.projectId, data.hours),
        addTimeEntry({
          projectId: data.projectId,
          hours: data.hours,
          description: data.description,
          loggedBy: senderName,
        }),
      ]);

      await replyFn(
        `Time logged!\n\n` +
        `Project: ${data.projectName} (${data.projectId})\n` +
        `Hours: ${data.hours}h\n` +
        `Total logged: ${newTotal}h\n` +
        (data.description ? `Work done: ${data.description}\n` : '') +
        (confirmationMessage ? `\n${confirmationMessage}` : '')
      );
      break;
    }

    case 'CLARIFICATION_NEEDED': {
      let reply = `I need a bit more info:\n\n${data.question}`;
      if (data.possibleProjects?.length) {
        reply += `\n\nDid you mean one of these?\n${data.possibleProjects.map(p => `• ${p}`).join('\n')}`;
      }
      await replyFn(reply);
      break;
    }

    default:
      await replyFn("I couldn't understand that message. Could you rephrase it?");
  }
}

module.exports = { processMessage };
