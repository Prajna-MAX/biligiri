const router = require('express').Router();
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { protect } = require('../middleware/auth');
const { getPublicKey } = require('../notify');

router.use(protect);

// Latest notifications + unread count for the bell
router.get('/', async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ items, unread });
});

router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
});

// ---- Phone/desktop push ----
router.get('/push/key', (_req, res) => res.json({ publicKey: getPublicKey() }));

router.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint?.startsWith('https://') || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'Invalid push subscription' });
  }
  // The same device may have belonged to another login before; it now belongs to this user
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user._id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    { upsert: true }
  );
  res.json({ ok: true });
});

router.post('/push/unsubscribe', async (req, res) => {
  if (req.body?.endpoint) await PushSubscription.deleteOne({ endpoint: req.body.endpoint, user: req.user._id });
  res.json({ ok: true });
});

module.exports = router;
