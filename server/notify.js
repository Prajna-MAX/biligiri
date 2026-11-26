const webpush = require('web-push');
const Notification = require('./models/Notification');
const PushSubscription = require('./models/PushSubscription');
const Setting = require('./models/Setting');
const User = require('./models/User');

let publicKey = null;

// Push needs a VAPID key pair. Use env vars if given, otherwise generate once and keep it in the DB
// so every server restart (and every deploy) uses the same keys.
async function initPush() {
  let keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const saved = await Setting.findOne({ key: 'vapid' }).lean();
    keys = saved?.value;
    if (!keys) {
      keys = webpush.generateVAPIDKeys();
      await Setting.create({ key: 'vapid', value: keys });
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@biligiri.app', keys.publicKey, keys.privateKey);
  publicKey = keys.publicKey;
}

const getPublicKey = () => publicKey;

async function sendPush(userId, payload) {
  if (!publicKey) return;
  const subs = await PushSubscription.find({ user: userId });
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 24 * 60 * 60 })
        .catch(async (err) => {
          // 404/410: the browser unsubscribed or the subscription expired
          if (err.statusCode === 404 || err.statusCode === 410) await s.deleteOne();
          else console.error('Push failed:', err.statusCode || err.message);
        })
    )
  );
}

/**
 * Save an in-app notification for each user and push it to their devices.
 * Never throws: a notification problem must not break the request that triggered it.
 */
async function notify(userIds, { title, body, task }) {
  try {
    const ids = [...new Set([].concat(userIds).filter(Boolean).map(String))];
    await Promise.all(
      ids.map(async (user) => {
        const n = await Notification.create({ user, title, body, task });
        const url = task ? `/?task=${task}` : '/';
        await sendPush(user, { title, body, url, tag: String(n._id) });
      })
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

async function notifyAdmins(message) {
  const admins = await User.find({ role: 'admin' }, '_id').lean();
  return notify(admins.map((a) => a._id), message);
}

module.exports = { initPush, getPublicKey, notify, notifyAdmins };
