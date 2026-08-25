const User = require('../models/User');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

// GET /api/admin/overview  [admin]
const getOverview = async (req, res, next) => {
  try {
    const [
      totalCustomers, totalWorkers, totalBookings, pendingBookings,
      completedBookings, cancelledBookings, totalComplaints, resolvedComplaints,
      pendingVerifications, completedBookingDocs,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'worker' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: ['requested', 'accepted', 'in_progress'] } }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'resolved' }),
      Worker.countDocuments({ verificationStatus: 'pending' }),
      Booking.find({ status: 'completed' }).select('price'),
    ]);

    const revenue = completedBookingDocs.reduce((sum, b) => sum + b.price, 0);

    res.json({
      totalCustomers,
      totalWorkers,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      totalComplaints,
      resolvedComplaints,
      pendingVerifications,
      revenue,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/workers/pending  [admin]
const getPendingWorkers = async (req, res, next) => {
  try {
    const workers = await Worker.find({ verificationStatus: 'pending' }).populate('userId', 'name email phone location');
    res.json({ count: workers.length, workers });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/workers/:id/verify  [admin]  body: { decision: 'approved' | 'rejected' }
const verifyWorker = async (req, res, next) => {
  try {
    const { decision } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be approved or rejected' });
    }
    const worker = await Worker.findByIdAndUpdate(req.params.id, { verificationStatus: decision }, { new: true });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    await Notification.create({
      userId: worker.userId,
      title: 'Verification update',
      message: `Your worker profile has been ${decision}.`,
      type: 'system',
    });

    res.json({ worker });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/users/:id/suspend  [admin]  body: { suspend: true|false }
const suspendUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: !!req.body.suspend }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/reviews/:id  [admin]
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getPendingWorkers, verifyWorker, suspendUser, deleteReview };
