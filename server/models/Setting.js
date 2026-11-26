const mongoose = require('mongoose');

// Small key/value store for app-wide settings generated at runtime (e.g. push keys)
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model('Setting', settingSchema);
