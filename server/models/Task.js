const crypto = require('crypto');
const mongoose = require('mongoose');
const { normalizePhone, isValidPhone } = require('../utils/phone');

const newFeedbackToken = () => crypto.randomBytes(18).toString('base64url');

const updateSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    status: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const feedbackSchema = new mongoose.Schema(
  {
    customerName: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 2000 },
    // 'customer' = submitted through the feedback link, 'worker' = recorded by the worker
    source: { type: String, enum: ['customer', 'worker'], default: 'worker' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    customerName: { type: String, trim: true },
    customerPhone: {
      type: String,
      trim: true,
      set: (v) => normalizePhone(v) || undefined,
      validate: { validator: (v) => !v || isValidPhone(v), message: 'Enter a valid 10-digit customer mobile number' },
    },
    location: { type: String, trim: true },
    // Secret for the customer's no-login feedback page (/f/<token>)
    feedbackToken: { type: String, default: newFeedbackToken },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    dueDate: Date,
    completedAt: Date,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updates: [updateSchema],
    feedback: feedbackSchema,
  },
  { timestamps: true }
);

taskSchema.index({ feedbackToken: 1 }, { unique: true, sparse: true });

const Task = mongoose.model('Task', taskSchema);

// Tasks created before feedback links existed need a stored token
Task.backfillFeedbackTokens = async () => {
  const missing = await Task.collection.find({ feedbackToken: { $exists: false } }, { projection: { _id: 1 } }).toArray();
  for (const { _id } of missing) {
    await Task.collection.updateOne({ _id }, { $set: { feedbackToken: newFeedbackToken() } });
  }
  return missing.length;
};

module.exports = Task;
