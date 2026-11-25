require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const ensureAdmin = require('./ensureAdmin');

// Creates the admin account if missing. The server also does this on startup.
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.syncIndexes();
  const { status, phone } = await ensureAdmin();
  console.log({ exists: `Admin already exists (phone ${phone})`, 'phone-added': `Added phone ${phone} to existing admin`, created: `Created admin with phone ${phone}` }[status]);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
