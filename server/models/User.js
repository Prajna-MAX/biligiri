const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizePhone, isValidPhone } = require('../utils/phone');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Optional; sparse so many users can have no email
    email: { type: String, lowercase: true, trim: true, set: (v) => v || undefined },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['admin', 'worker'], default: 'worker' },
    // Login identifier
    phone: {
      type: String,
      required: true,
      trim: true,
      set: normalizePhone,
      validate: {
        validator: (v) => !v || isValidPhone(v),
        message: 'Enter a valid 10-digit mobile number',
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
