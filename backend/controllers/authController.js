const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  location: user.location,
  profileImage: user.profileImage,
});

// POST /api/auth/register/customer
const registerCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, password, location } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    // role is hardcoded here, never taken from req.body — that's what stops
    // someone from POSTing { role: "admin" } to make themselves an admin.
    const user = await User.create({ name, email, phone, password, location, role: 'customer' });

    res.status(201).json({ token: signToken(user), user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register/worker
const registerWorker = async (req, res, next) => {
  try {
    const {
      name, email, phone, password, location,
      serviceCategory, experience, skills, serviceArea, startingPrice, workingHours,
    } = req.body;

    if (!name || !email || !phone || !password || !serviceCategory || !serviceArea || startingPrice == null) {
      return res.status(400).json({ message: 'Missing required worker fields' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, phone, password, location, role: 'worker' });

    const worker = await Worker.create({
      userId: user._id,
      serviceCategory,
      experience: Number(experience) || 0,
      skills: Array.isArray(skills) ? skills : String(skills || '').split(',').map((s) => s.trim()).filter(Boolean),
      serviceArea,
      pricing: { startingPrice: Number(startingPrice) },
      workingHours: workingHours || undefined,
      verificationStatus: 'pending', // admin must approve before worker is publicly visible
    });

    res.status(201).json({
      token: signToken(user),
      user: sanitize(user),
      worker,
      notice: 'Registration received. Your profile will be visible to customers once an admin verifies your account.',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.isSuspended) return res.status(403).json({ message: 'This account has been suspended' });

    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: sanitize(req.user) });
};

module.exports = { registerCustomer, registerWorker, login, getMe };
