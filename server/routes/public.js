// No-login customer feedback page: /f/<token>
const router = require('express').Router();
const Task = require('../models/Task');
const { notify, notifyAdmins } = require('../notify');

const findByToken = (token) =>
  typeof token === 'string' && token.length >= 20
    ? Task.findOne({ feedbackToken: token }).populate('assignedTo', 'name')
    : null;

// Only what the customer needs to see: no internal notes, worker phone numbers, etc.
const publicView = (t) => ({
  title: t.title,
  customerName: t.customerName,
  workerName: t.assignedTo?.name?.split(' ')[0] || null,
  status: t.status,
  dueDate: t.dueDate,
  completedAt: t.completedAt,
  feedback: t.feedback?.rating
    ? { rating: t.feedback.rating, comment: t.feedback.comment, customerName: t.feedback.customerName, source: t.feedback.source }
    : null,
});

router.get('/feedback/:token', async (req, res) => {
  const task = await findByToken(req.params.token);
  if (!task) return res.status(404).json({ message: 'This feedback link is not valid.' });
  res.json(publicView(task));
});

router.post('/feedback/:token', async (req, res) => {
  const task = await findByToken(req.params.token);
  if (!task) return res.status(404).json({ message: 'This feedback link is not valid.' });
  if (task.status !== 'completed') {
    return res.status(400).json({ message: 'You can rate this job once the work is completed.' });
  }
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Please choose a rating from 1 to 5 stars.' });
  }
  const comment = String(req.body?.comment || '').trim().slice(0, 2000);
  const customerName = String(req.body?.customerName || '').trim().slice(0, 100) || task.customerName;
  const isUpdate = task.feedback?.source === 'customer';

  task.feedback = { rating, comment, customerName, source: 'customer', submittedAt: new Date() };
  await task.save();

  const message = {
    title: `${isUpdate ? 'Updated' : 'New'} customer feedback: ${'★'.repeat(rating)}`,
    body: `${customerName || 'Customer'} rated "${task.title}"${comment ? `: "${comment.slice(0, 80)}"` : ''}`,
    task: task._id,
  };
  notifyAdmins(message);
  notify(task.assignedTo?._id, message);

  res.json(publicView(task));
});

module.exports = router;
