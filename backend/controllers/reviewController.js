const Review = require('../models/Review');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');

// POST /api/reviews  [customer] — only allowed once a booking is completed
const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review a completed booking' });
    }

    const existing = await Review.findOne({ bookingId });
    if (existing) return res.status(409).json({ message: 'You already reviewed this booking' });

    const review = await Review.create({
      customerId: req.user._id,
      workerId: booking.workerId,
      bookingId,
      rating,
      comment,
    });

    // Recompute the worker's average rating from every review they have.
    const worker = await Worker.findById(booking.workerId);
    const reviews = await Review.find({ workerId: worker._id });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    worker.rating = Math.round(avg * 10) / 10;
    worker.totalReviews = reviews.length;
    await worker.save();

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
};

// GET /api/reviews/worker/:workerId
const getWorkerReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ workerId: req.params.workerId })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name profileImage');
    res.json({ count: reviews.length, reviews });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReview, getWorkerReviews };
