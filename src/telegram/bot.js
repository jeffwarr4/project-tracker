'use strict';

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { transcribeVoice } = require('./voice-handler');
const { processMessage } = require('../core/processor');

function createBot() {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  const allowedIds = (process.env.ALLOWED_USER_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(Number);

  bot.use(async (ctx, next) => {
    if (allowedIds.length > 0 && !allowedIds.includes(ctx.from?.id)) {
      return ctx.reply('Sorry, you are not authorized to use this bot.');
    }
    return next();
  });

  bot.start(ctx => ctx.reply(
    'Project Tracker Bot ready!\n\n' +
    'Send me a message about:\n' +
    '• A new project ("New project for Acme Corp — website redesign")\n' +
    '• A project update ("Acme website is now on hold")\n' +
    '• Time logged ("Spent 2 hours on Acme website, finished homepage mockup")\n\n' +
    'Voice notes work too — just send one!'
  ));

  bot.help(ctx => ctx.reply(
    'Just describe what you worked on or what project to track.\n' +
    'I\'ll figure out the rest and save it to Google Sheets.'
  ));

  bot.on('text', async ctx => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    await handleTelegramMessage(bot, ctx, text);
  });

  bot.on('voice', async ctx => {
    await ctx.reply('Got your voice note, transcribing...');
    try {
      const transcript = await transcribeVoice(bot, ctx.message.voice.file_id);
      await ctx.reply(`Transcript: "${transcript}"\n\nProcessing...`);
      await handleTelegramMessage(bot, ctx, transcript);
    } catch (err) {
      console.error('Voice transcription error:', err);
      await ctx.reply('Sorry, I could not transcribe your voice note. Please try again or send a text message.');
    }
  });

  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('Something went wrong. Please try again.').catch(() => {});
  });

  return bot;
}

async function handleTelegramMessage(bot, ctx, messageText) {
  const senderName = ctx.from?.first_name || 'Unknown';
  await ctx.sendChatAction('typing');
  try {
    await processMessage({
      messageText,
      senderName,
      replyFn: text => ctx.reply(text),
    });
  } catch (err) {
    console.error('Error processing message:', err);
    await ctx.reply(`Sorry, something went wrong.\nError: ${err.message}`);
  }
}

module.exports = { createBot };
