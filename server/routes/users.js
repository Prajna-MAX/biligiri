const router = require('express').Router();
const User = require('../models/User');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { protect, adminOnly } = require('../middleware/auth');
const { normalizePhone, isValidPhone } = require('../utils/phone');

router.use(protect, adminOnly);

// List workers with their task counts
router.get('/', async (_req, res) => {
  const workers = await User.find({ role: 'worker' }).sort({ name: 1 }).lean();
  const counts = await Task.aggregate([
    { $group: { _id: { worker: '$assignedTo', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const byWorker = {};
  counts.forEach(({ _id, n }) => {
    const key = String(_id.worker);
    byWorker[key] = byWorker[key] || { pending: 0, in_progress: 0, completed: 0 };
    byWorker[key][_id.status] = n;
  });
  res.json(
    workers.map(({ password, ...w }) => ({
      ...w,
      taskCounts: byWorker[String(w._id)] || { pending: 0, in_progress: 0, completed: 0 },
    }))
  );
});

router.post('/', async (req, res) => {
  const { name, password } = req.body;
  const email = req.body.email?.trim().toLowerCase() || undefined;
  if (!name || !password || !req.body.phone) {
    return res.status(400).json({ message: 'Name, phone and password are required' });
  }
  const phone = normalizePhone(req.body.phone);
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'Enter a valid 10-digit mobile number (starting with 6-9)' });
  }
  if (await User.exists({ phone })) {
    return res.status(400).json({ message: 'Phone number already in use' });
  }
  if (email && (await User.exists({ email }))) {
    return res.status(400).json({ message: 'Email already in use' });
  }
  const user = await User.create({ name, email, password, phone, role: 'worker' });
  res.status(201).json(user);
});

router.delete('/:id', async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'worker' });
  if (!user) return res.status(404).json({ message: 'Worker not found' });
  const open = await Task.countDocuments({ assignedTo: user._id, status: { $ne: 'completed' } });
  if (open > 0) {
    return res.status(400).json({ message: `Reassign this worker's ${open} open task(s) first` });
  }
  await Promise.all([
    user.deleteOne(),
    Notification.deleteMany({ user: user._id }),
    PushSubscription.deleteMany({ user: user._id }),
  ]);
  res.json({ message: 'Worker removed' });
});

module.exports = router;
