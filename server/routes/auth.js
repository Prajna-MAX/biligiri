const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { normalizePhone } = require('../utils/phone');

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ message: 'Phone number and password required' });
  const user = await User.findOne({ phone: normalizePhone(phone) });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid phone number or password' });
  }
  res.json({ token: sign(user), user });
});

router.get('/me', protect, (req, res) => res.json(req.user));

module.exports = router;
