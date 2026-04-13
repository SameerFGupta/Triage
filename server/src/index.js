const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({ status: "ok" });
});

const analyticsRouter = require('./routes/analytics');
app.use('/api/analytics', analyticsRouter);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
