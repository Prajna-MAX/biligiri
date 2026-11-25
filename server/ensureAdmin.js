const User = require('./models/User');
const { isValidPhone, normalizePhone } = require('./utils/phone');

// Makes sure an admin account exists. Uses ADMIN_PHONE / ADMIN_PASSWORD from the environment.
// In production these must be set; locally they fall back to 9999999999 / admin123.
module.exports = async function ensureAdmin() {
  const prod = process.env.NODE_ENV === 'production';
  const existing = await User.findOne({ role: 'admin' });
  if (existing?.phone) return { status: 'exists', phone: existing.phone };

  if (prod && (!process.env.ADMIN_PHONE || !process.env.ADMIN_PASSWORD)) {
    throw new Error('Set ADMIN_PHONE and ADMIN_PASSWORD environment variables to create the admin account');
  }
  const phone = normalizePhone(process.env.ADMIN_PHONE || '9999999999');
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  if (!isValidPhone(phone)) throw new Error(`ADMIN_PHONE "${phone}" is not a valid 10-digit mobile number`);

  if (existing) {
    // Older admin created before phone login existed
    existing.phone = phone;
    await existing.save();
    return { status: 'phone-added', phone };
  }
  await User.create({ name: 'Admin', phone, password, role: 'admin' });
  return { status: 'created', phone };
};
