'use strict';

require('dotenv').config();
const express = require('express');
const { handleVerification, handleIncoming } = require('./messaging/whatsapp');

function createServer() {
  const app = express();

  // Capture raw body before JSON parsing — needed for webhook signature verification
  app.use(express.json({
    verify: (req, _res, buf) => { req.rawBody = buf; },
  }));

  // WhatsApp webhook — verification challenge (GET) and incoming messages (POST)
  app.get('/whatsapp',  handleVerification);
  app.post('/whatsapp', handleIncoming);

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}

function startServer(app) {
  const port = parseInt(process.env.PORT || '3000', 10);
  return new Promise(resolve => {
    const server = app.listen(port, () => {
      console.log(`Webhook server listening on port ${port}`);
      console.log(`WhatsApp webhook URL: http://YOUR_DOMAIN:${port}/whatsapp`);
      resolve(server);
    });
  });
}

module.exports = { createServer, startServer };
