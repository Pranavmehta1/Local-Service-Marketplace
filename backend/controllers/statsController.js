const User = require('../models/User');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

/**
 * GET /api/platform/stats
 * Public endpoint: Returns live, persistent platform metrics directly from MongoDB.
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const [
      registeredCustomers,
      registeredWorkers,
      verifiedWorkers,
      repairsCompleted,
      rawAreas,
      reviews,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'worker' }),
      Worker.countDocuments({ verificationStatus: 'approved' }),
      Booking.countDocuments({ status: 'completed' }),
      Worker.distinct('serviceArea'),
      Review.find().select('rating'),
    ]);

    const areasCovered = rawAreas.filter(Boolean).length;

    const validRatings = reviews
      .map((r) => Number(r.rating))
      .filter((r) => !isNaN(r) && r >= 1 && r <= 5);

    let customerSatisfaction = null;
    if (validRatings.length > 0) {
      const sum = validRatings.reduce((acc, r) => acc + r, 0);
      customerSatisfaction = Math.round((sum / (validRatings.length * 5)) * 100);
    }

    res.json({
      success: true,
      source: 'mongodb',
      registeredWorkers,
      registeredCustomers,
      registeredUsers: registeredWorkers + registeredCustomers,
      verifiedWorkers,
      repairsCompleted,
      areasCovered,
      customerSatisfaction,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlatformStats };
