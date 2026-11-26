require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const ensureAdmin = require('./ensureAdmin');
const { initPush } = require('./notify');
const Task = require('./models/Task');

const PROD = process.env.NODE_ENV === 'production';
for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable ${key}`);
    process.exit(1);
  }
}
if (PROD && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // behind Render/Railway proxy: use the real client IP for rate limiting
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Slow down password guessing: 10 login attempts per 15 minutes per IP
app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Try again in 15 minutes.' },
  })
);

// The customer feedback page needs no login, so limit how hard anyone can hit it
app.use(
  '/api/public',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again in a few minutes.' },
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/public', require('./routes/public'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));

// Serve the built React app (after `npm run build` in /client)
const dist = path.join(__dirname, '../client/dist');
app.use(express.static(dist));
app.get(/^\/(?!api).*/, (_req, res, next) =>
  res.sendFile(path.join(dist, 'index.html'), (err) => err && next())
);

// Express 5 forwards errors thrown in async handlers here
app.use((err, _req, res, _next) => {
  const status = err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 && PROD ? 'Server error' : err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => require('./models/User').syncIndexes()) // keep DB indexes in line with the schema
  .then(() => Task.syncIndexes())
  .then(() => Task.backfillFeedbackTokens())
  .then(() => initPush())
  .then(ensureAdmin)
  .then(({ status, phone }) => {
    if (status !== 'exists') console.log(`Admin account ready (phone ${phone})`);
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
