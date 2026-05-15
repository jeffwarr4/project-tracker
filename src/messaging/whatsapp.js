'use strict';

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const OpenAI = require('openai');
const { processMessage } = require('../core/processor');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

// --- User identification -------------------------------------------------

function normalizePhone(raw) {
  // WhatsApp sends numbers without +, e.g. "12125551234"
  // .env stores them with +, e.g. "+12125551234"
  return raw.replace(/^\+/, '');
}

function getDisplayName(waId) {
  const jeff    = normalizePhone(process.env.PHONE_JEFF    || '');
  const partner = normalizePhone(process.env.PHONE_PARTNER || '');

  if (jeff    && waId === jeff)    return process.env.NAME_JEFF    || 'Jeff';
  if (partner && waId === partner) return process.env.NAME_PARTNER || 'Partner';
  return null; // not authorized
}

// --- Deduplication -------------------------------------------------------

const _seen = new Set();
function isDuplicate(messageId) {
  if (_seen.has(messageId)) return true;
  _seen.add(messageId);
  if (_seen.size > 1000) _seen.delete(_seen.values().next().value);
  return false;
}

// --- Webhook signature verification --------------------------------------

function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // skip if not configured (dev only)

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader || '')
    );
  } catch {
    return false;
  }
}

// --- Outgoing messages ---------------------------------------------------

async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

async function sendWhatsAppTemplate(to, { senderName, projectName, message }) {
  await axios.post(
    `${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'project_collaboration',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: senderName },
              { type: 'text', text: projectName || 'Unknown project' },
              { type: 'text', text: message },
            ],
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

async function markAsRead(messageId) {
  await axios.post(
    `${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).catch(() => {}); // non-fatal
}

// --- Voice note transcription --------------------------------------------

async function transcribeWhatsAppAudio(mediaId) {
  // Step 1: Get the download URL from Meta's media API
  const metaRes = await axios.get(`${GRAPH_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });
  const downloadUrl = metaRes.data.url;

  // Step 2: Download the audio file (must include auth header)
  const audioRes = await axios.get(downloadUrl, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
    responseType: 'arraybuffer',
  });
  const audioBuffer = Buffer.from(audioRes.data);

  // Step 3: Transcribe with Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: new File([audioBuffer], 'voice.ogg', { type: 'audio/ogg' }),
    model: 'whisper-1',
    language: 'en',
  });

  return transcription.text;
}

// --- Webhook handlers (attached to Express app in server.js) -------------

function handleVerification(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified.');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

async function handleIncoming(req, res) {
  // Verify signature
  if (!verifySignature(req.rawBody, req.headers['x-hub-signature-256'])) {
    console.warn('WhatsApp: invalid signature — request rejected');
    return res.sendStatus(401);
  }

  // Acknowledge immediately — Meta requires a 200 within 20 s
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value    = change.value;
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          if (isDuplicate(msg.id)) continue;

          const waId        = msg.from;
          const senderName  = getDisplayName(waId)
            || contacts.find(c => c.wa_id === waId)?.profile?.name
            || null;

          if (!senderName) {
            await sendWhatsAppMessage(waId, 'Sorry, this bot is private.');
            continue;
          }

          markAsRead(msg.id);

          let messageText;

          if (msg.type === 'text') {
            messageText = msg.text?.body;
          } else if (msg.type === 'audio') {
            await sendWhatsAppMessage(waId, 'Got your voice note, transcribing...');
            try {
              messageText = await transcribeWhatsAppAudio(msg.audio.id);
              await sendWhatsAppMessage(waId, `Transcript: "${messageText}"\n\nProcessing...`);
            } catch (err) {
              console.error('WhatsApp voice transcription error:', err);
              await sendWhatsAppMessage(waId, 'Sorry, I could not transcribe your voice note. Please send a text message.');
              continue;
            }
          } else {
            // Status updates, reactions, etc. — ignore
            continue;
          }

          if (!messageText?.trim()) continue;

          await processMessage({
            messageText,
            senderName,
            replyFn: text => sendWhatsAppMessage(waId, text),
          });
        }
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err);
  }
}

module.exports = { handleVerification, handleIncoming, sendWhatsAppMessage, sendWhatsAppTemplate };
