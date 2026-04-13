const express = require('express');
const router = express.Router();

router.get('/provider', (req, res) => {
  res.json({ provider: process.env.AI_PROVIDER || 'anthropic' });
});

router.post('/provider', (req, res) => {
  const { provider } = req.body;

  if (provider !== 'anthropic' && provider !== 'gemini') {
    return res.status(400).json({ error: 'Invalid provider. Must be "anthropic" or "gemini".' });
  }

  process.env.AI_PROVIDER = provider;
  res.json({ success: true, provider: process.env.AI_PROVIDER });
});

module.exports = router;
