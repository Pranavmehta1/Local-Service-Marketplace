const Worker = require('../models/Worker');
const Review = require('../models/Review');

// GET /api/workers/categories
const getCategories = (req, res) => {
  const categories = [
    { id: 'electrician', name: 'Electrician', icon: 'bi-lightning-charge-fill' },
    { id: 'plumber', name: 'Plumber', icon: 'bi-wrench-adjustable' },
    { id: 'ac_repair', name: 'AC Repair', icon: 'bi-snow' },
    { id: 'ro_repair', name: 'RO Repair', icon: 'bi-droplet-fill' },
    { id: 'carpenter', name: 'Carpenter', icon: 'bi-hammer' },
    { id: 'cleaning', name: 'Home Cleaning', icon: 'bi-stars' },
    { id: 'appliance_repair', name: 'Appliance Repair', icon: 'bi-cpu-fill' },
  ];
  res.json({ success: true, count: categories.length, categories });
};

// GET /api/workers?category=&rating=&maxPrice=&sort=
// Public: only ever returns admin-approved workers.
const listWorkers = async (req, res, next) => {
  try {
    const { category, rating, maxPrice, sort } = req.query;
    const query = { verificationStatus: 'approved' };
    if (category) query.serviceCategory = category;
    if (rating) query.rating = { $gte: Number(rating) };
    if (maxPrice) query['pricing.startingPrice'] = { $lte: Number(maxPrice) };

    let sortBy = { rating: -1 }; // 'Recommended' default
    if (sort === 'rating_desc') sortBy = { rating: -1 };
    if (sort === 'price_asc') sortBy = { 'pricing.startingPrice': 1 };
    if (sort === 'experience_desc') sortBy = { experience: -1 };

    const workers = await Worker.find(query).sort(sortBy).populate('userId', 'name profileImage location');
    res.json({ count: workers.length, workers });
  } catch (err) {
    next(err);
  }
};

// GET /api/workers/:id
const getWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('userId', 'name profileImage location');
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json({ worker });
  } catch (err) {
    next(err);
  }
};

// PUT /api/workers/profile  [worker only — updates only the caller's own record]
const updateOwnProfile = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user._id });
    if (!worker) return res.status(404).json({ message: 'Worker profile not found' });

    const { experience, skills, serviceArea, startingPrice, about } = req.body;
    if (experience !== undefined) worker.experience = experience;
    if (skills !== undefined) worker.skills = skills;
    if (serviceArea !== undefined) worker.serviceArea = serviceArea;
    if (startingPrice !== undefined) worker.pricing.startingPrice = startingPrice;
    if (about !== undefined) worker.about = about;

    await worker.save();
    res.json({ worker });
  } catch (err) {
    next(err);
  }
};

// PUT /api/workers/availability  [worker only]
const updateAvailability = async (req, res, next) => {
  try {
    const worker = await Worker.findOneAndUpdate(
      { userId: req.user._id },
      { workingHours: req.body.workingHours },
      { new: true }
    );
    if (!worker) return res.status(404).json({ message: 'Worker profile not found' });
    res.json({ worker });
  } catch (err) {
    next(err);
  }
};

// GET /api/workers/:id/reviews
const getWorkerReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ workerId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name profileImage');
    res.json({ count: reviews.length, reviews });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories, listWorkers, getWorker, updateOwnProfile, updateAvailability, getWorkerReviews };
