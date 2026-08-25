const User = require('../models/User');

// GET /api/users/profile
const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, location, profileImage } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile };
