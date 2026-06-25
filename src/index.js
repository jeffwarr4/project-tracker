'use strict';

require('dotenv').config();
const { initializeSheets } = require('./sheets/client');

const platform = (process.env.MESSAGING_PLATFORM || 'telegram').toLowerCase();

const useTelegram  = platform === 'telegram'  || platform === 'telegram+whatsapp' || platform === 'all';
const useWhatsApp  = platform === 'whatsapp'  || platform === 'telegram+whatsapp' || platform === 'all';
const useWebhooks  = useWhatsApp; // extend here if SMS is added later

// Required env vars per active channel
const required = ['ANTHROPIC_API_KEY', 'GOOGLE_SHEETS_ID'];
if (useTelegram) required.push('TELEGRAM_BOT_TOKEN');
if (useWhatsApp) required.push('WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN');

async function main() {
  const cron = require('node-cron');
  const { runWeeklyDigest } = require('./jobs/weekly-digest');
  const { runHealthCheck }  = require('./jobs/health-check');

  // Weekly time log digest — Saturday 1 AM server time
  cron.schedule('0 1 * * 6', () => {
    runWeeklyDigest().catch(err => console.error('[weekly-digest] Error:', err.message));
  });
  console.log('Weekly digest scheduled (Saturday 1 AM server time).');

  // Pipeline health check — every 6 hours
  cron.schedule('0 */6 * * *', () => {
    runHealthCheck().catch(err => console.error('[health-check] Error:', err.message));
  });
  console.log('Health check scheduled (every 6 hours).');
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  console.log(`Starting in "${platform}" mode...`);

  console.log('Initializing Google Sheets...');
  await initializeSheets();
  console.log('Google Sheets ready.');

  const shutdownHandlers = [];

  if (useTelegram) {
    const { createBot } = require('./telegram/bot');
    const bot = createBot();

    process.once('SIGINT',  () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    shutdownHandlers.push(() => bot.stop());

    console.log('Starting Telegram bot...');
    bot.launch().catch(err => console.error('Telegram bot error:', err));
    console.log('Telegram bot running.');
  }

  if (useWebhooks) {
    const { createServer, startServer } = require('./server');
    const app    = createServer();
    const server = await startServer(app);

    shutdownHandlers.push(() => server.close());
  }

  if (useWhatsApp) {
    console.log('WhatsApp webhook handler active.');
  }

  if (shutdownHandlers.length === 0) {
    console.error(`Unknown MESSAGING_PLATFORM value: "${platform}"`);
    console.error('Valid values: telegram, whatsapp, telegram+whatsapp, all');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
