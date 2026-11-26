const express = require('express');
const os = require('os');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const notesRouter = require('./routes/notes');
const authRouter = require('./routes/auth');

mongoose.set('sanitizeFilter', true);

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({
    service: 'notes-api',
    host: os.hostname(),
    cpus: os.cpus().length,
    memoryGB: +(os.totalmem() / 1e9).toFixed(2)
  });
});

app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }), authRouter);
app.use('/notes', notesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const clientError = ['ValidationError', 'CastError'].includes(err.name)
    || err.code === 'LIMIT_FILE_SIZE';
  res.status(clientError ? 400 : 500).json({ error: err.message });
});

module.exports = app;
