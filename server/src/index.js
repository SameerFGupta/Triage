const express = require('express');
const cors = require('cors');
const { loadEnv } = require('./config/loadEnv');
const db = require('./db/db');

loadEnv();

const app = express();
const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: "ok" });
});

const ticketsRouter = require('./routes/tickets');
app.use('/api/tickets', ticketsRouter);

const analyticsRouter = require('./routes/analytics');
app.use('/api/analytics', analyticsRouter);

const settingsRouter = require('./routes/settings');
app.use('/api/settings', settingsRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const server = app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

server.on('error', (error) => {
  console.error(`Failed to start server on http://${host}:${port}`, error);
  process.exit(1);
});

let isShuttingDown = false;

function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down server...`);

  server.close(() => {
    try {
      db.close();
    } catch (error) {
      console.error('Failed to close database cleanly:', error);
    }

    if (signal === 'SIGUSR2') {
      process.kill(process.pid, 'SIGUSR2');
      return;
    }

    process.exit(exitCode);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGUSR2', () => shutdown('SIGUSR2'));
