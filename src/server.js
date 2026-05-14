'use strict';

require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { handleVerification, handleIncoming } = require('./messaging/whatsapp');
const apiRoutes = require('./api/routes');

function createServer() {
  const app = express();

  // Capture raw body before JSON parsing — required for WhatsApp signature verification
  app.use(express.json({
    verify: (_req, _res, buf) => { _req.rawBody = buf; },
  }));

  // API routes
  app.use('/api', apiRoutes);

  // WhatsApp webhook
  app.get('/whatsapp',  handleVerification);
  app.post('/whatsapp', handleIncoming);

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  // React dashboard — served as static files from the Vite build output
  const distPath = path.join(__dirname, 'dashboard', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA fallback — serve index.html for any route not matched above
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    app.get('/', (_req, res) =>
      res.send(
        '<h2>Dashboard not built yet.</h2>' +
        '<p>Run: <code>npm run build:dashboard</code></p>'
      )
    );
  }

  return app;
}

function startServer(app) {
  const port = parseInt(process.env.PORT || '3000', 10);
  return new Promise(resolve => {
    const server = app.listen(port, () => {
      console.log(`Webhook server listening on port ${port}`);
      if (fs.existsSync(path.join(__dirname, 'dashboard', 'dist'))) {
        console.log(`Dashboard: http://localhost:${port}`);
      }
    });
    resolve(server);
  });
}

module.exports = { createServer, startServer };
