const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
