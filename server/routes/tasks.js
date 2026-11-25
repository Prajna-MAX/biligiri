const router = require('express').Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

const populate = (q) =>
  q
    .populate('assignedTo', 'name phone')
    .populate('createdBy', 'name')
    .populate('updates.by', 'name')
    .populate('feedback.submittedBy', 'name');

// Workers can only touch tasks assigned to them
async function loadTask(req, res, next) {
  const filter = { _id: req.params.id };
  if (req.user.role === 'worker') filter.assignedTo = req.user._id;
  const task = await Task.findOne(filter);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  req.task = task;
  next();
}

const STATUSES = ['pending', 'in_progress', 'completed'];

const setStatus = (task, status) => {
  task.status = status;
  task.completedAt = status === 'completed' ? new Date() : undefined;
};

// Admin: all tasks (filterable). Worker: only their own.
router.get('/', async (req, res) => {
  const { status, worker } = req.query;
  const filter = {};
  if (req.user.role === 'worker') filter.assignedTo = req.user._id;
  else if (worker) filter.assignedTo = worker;
  if (status) filter.status = status;
  res.json(await populate(Task.find(filter).sort({ createdAt: -1 })));
});

router.get('/stats', adminOnly, async (_req, res) => {
  const [byStatus, fb, workers] = await Promise.all([
    Task.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Task.aggregate([
      { $match: { 'feedback.rating': { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$feedback.rating' }, n: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: 'worker' }),
  ]);
  const counts = { pending: 0, in_progress: 0, completed: 0 };
  byStatus.forEach(({ _id, n }) => (counts[_id] = n));
  res.json({
    ...counts,
    total: counts.pending + counts.in_progress + counts.completed,
    workers,
    feedbackCount: fb[0]?.n || 0,
    avgRating: fb[0] ? Number(fb[0].avg.toFixed(2)) : null,
  });
});

router.get('/feedback', adminOnly, async (_req, res) => {
  const tasks = await populate(
    Task.find({ 'feedback.rating': { $exists: true } }).sort({ 'feedback.submittedAt': -1 })
  );
  res.json(tasks);
});

router.get('/:id', loadTask, async (req, res) => {
  res.json(await populate(Task.findById(req.task._id)));
});

router.post('/', adminOnly, async (req, res) => {
  const { title, description, customerName, location, priority, dueDate, assignedTo } = req.body;
  if (!title || !assignedTo) return res.status(400).json({ message: 'Title and worker are required' });
  if (!(await User.exists({ _id: assignedTo, role: 'worker' }))) {
    return res.status(400).json({ message: 'Assigned worker not found' });
  }
  const task = await Task.create({
    title, description, customerName, location, priority,
    dueDate: dueDate || undefined,
    assignedTo,
    createdBy: req.user._id,
  });
  res.status(201).json(await populate(Task.findById(task._id)));
});

router.put('/:id', loadTask, async (req, res) => {
  const { task } = req;
  const { status } = req.body;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  if (req.user.role === 'admin') {
    if (req.body.assignedTo && !(await User.exists({ _id: req.body.assignedTo, role: 'worker' }))) {
      return res.status(400).json({ message: 'Assigned worker not found' });
    }
    const fields = ['title', 'description', 'customerName', 'location', 'priority', 'dueDate', 'assignedTo'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) task[f] = req.body[f] === '' && f === 'dueDate' ? undefined : req.body[f];
    });
    if (status && status !== task.status) setStatus(task, status);
  } else {
    // Workers can only change status
    if (!status) return res.status(400).json({ message: 'Only status can be updated' });
    if (status !== task.status) {
      setStatus(task, status);
      task.updates.push({ note: `Status changed to ${status.replace('_', ' ')}`, status, by: req.user._id });
    }
  }
  await task.save();
  res.json(await populate(Task.findById(task._id)));
});

// Progress note
router.post('/:id/updates', loadTask, async (req, res) => {
  if (!req.body.note?.trim()) return res.status(400).json({ message: 'Note is required' });
  req.task.updates.push({ note: req.body.note, status: req.task.status, by: req.user._id });
  await req.task.save();
  res.json(await populate(Task.findById(req.task._id)));
});

// Customer feedback, recorded by the assigned worker
router.post('/:id/feedback', loadTask, async (req, res) => {
  const { task } = req;
  if (req.user.role !== 'worker') {
    return res.status(403).json({ message: 'Only the assigned worker records feedback' });
  }
  if (task.status !== 'completed') {
    return res.status(400).json({ message: 'Complete the task before collecting feedback' });
  }
  const rating = Number(req.body.rating);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  task.feedback = {
    customerName: req.body.customerName || task.customerName,
    rating,
    comment: req.body.comment,
    submittedBy: req.user._id,
    submittedAt: new Date(),
  };
  await task.save();
  res.json(await populate(Task.findById(task._id)));
});

router.delete('/:id', adminOnly, loadTask, async (req, res) => {
  await req.task.deleteOne();
  res.json({ message: 'Task deleted' });
});

module.exports = router;
