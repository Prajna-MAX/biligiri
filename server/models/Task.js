const mongoose = require('mongoose');

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
    comment: { type: String, trim: true },
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
    location: { type: String, trim: true },
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

module.exports = mongoose.model('Task', taskSchema);
