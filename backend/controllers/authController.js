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
  isVerified: !!user.isVerified,
  isEmailVerified: !!user.isEmailVerified,
  isPhoneVerified: !!user.isPhoneVerified,
});

// POST /api/auth/register/customer
const registerCustomer = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const password = req.body.password;
    const location = (req.body.location || req.body.area || req.body.city || 'Model Town, Ludhiana').trim();

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(409).json({ message: 'Email already registered. Please sign in.' });
    }

    let user;
    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.password = password;
      existing.location = location;
      existing.role = 'customer';
      existing.isVerified = true;
      existing.isEmailVerified = true;
      user = await existing.save();
    } else {
      user = await User.create({
        name,
        email,
        phone,
        password,
        location,
        role: 'customer',
        isVerified: true,
        isEmailVerified: true,
      });
    }

    res.status(201).json({ token: signToken(user), user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register/worker
const registerWorker = async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const password = req.body.password;
    const location = (req.body.location || req.body.area || req.body.serviceArea || 'Model Town, Ludhiana').trim();
    const serviceArea = (req.body.serviceArea || req.body.area || req.body.location || 'Model Town, Ludhiana').trim();
    const serviceCategory = req.body.serviceCategory || req.body.category || 'electrician';
    const experience = Number(req.body.experience) || 1;
    const startingPrice = req.body.startingPrice != null
      ? Number(req.body.startingPrice)
      : (req.body.price != null ? Number(req.body.price) : 200);
    const skills = req.body.skills || '';
    const workingHours = req.body.workingHours;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Missing required worker fields' });
    }

    let existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(409).json({ message: 'Email already registered. Please sign in.' });
    }

    let user;
    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.password = password;
      existing.location = location;
      existing.role = 'worker';
      existing.isVerified = true;
      existing.isEmailVerified = true;
      user = await existing.save();
    } else {
      user = await User.create({
        name,
        email,
        phone,
        password,
        location,
        role: 'worker',
        isVerified: true,
        isEmailVerified: true,
      });
    }

    let worker = await Worker.findOne({ userId: user._id });
    const parsedSkills = Array.isArray(skills)
      ? skills
      : String(skills || '').split(',').map((s) => s.trim()).filter(Boolean);

    if (worker) {
      worker.serviceCategory = serviceCategory;
      worker.experience = experience;
      worker.skills = parsedSkills;
      worker.serviceArea = serviceArea;
      worker.pricing = { startingPrice };
      if (workingHours) worker.workingHours = workingHours;
      await worker.save();
    } else {
      worker = await Worker.create({
        userId: user._id,
        serviceCategory,
        experience,
        skills: parsedSkills,
        serviceArea,
        pricing: { startingPrice },
        workingHours: workingHours || undefined,
        verificationStatus: 'pending',
      });
    }

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
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    const otp = req.body.otp;

    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.isSuspended) return res.status(403).json({ message: 'This account has been suspended' });

    const requireOtp = process.env.REQUIRE_OTP_LOGIN !== 'false';
    if (requireOtp && !otp) {
      return res.json({
        requireOtp: true,
        message: 'Password verified. Please complete OTP verification.',
        user: sanitize(user),
      });
    }

    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: sanitize(req.user) });
};

module.exports = {
  registerCustomer,
  registerWorker,
  login,
  getMe,
  signToken,
  sanitize,
};
