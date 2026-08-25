const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');

const notify = (userId, title, message, type) => Notification.create({ userId, title, message, type });

// POST /api/bookings  [customer]
const createBooking = async (req, res, next) => {
  try {
    const { workerId, serviceCategory, problemDescription, address, date, timeSlot } = req.body;
    const worker = await Worker.findById(workerId);
    if (!worker || worker.verificationStatus !== 'approved') {
      return res.status(400).json({ message: 'Worker not available for booking' });
    }

    const booking = await Booking.create({
      customerId: req.user._id,
      workerId,
      serviceCategory,
      problemDescription,
      address,
      date,
      timeSlot,
      price: worker.pricing.startingPrice,
      status: 'requested',
    });

    await notify(worker.userId, 'New booking request', `You have a new ${serviceCategory} booking request.`, 'booking');
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/customer  [customer] — only the caller's own bookings
const getCustomerBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'workerId', populate: { path: 'userId', select: 'name profileImage' } });
    res.json({ count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/worker  [worker] — only the caller's own bookings
const getWorkerBookings = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user._id });
    if (!worker) return res.status(404).json({ message: 'Worker profile not found' });

    const bookings = await Booking.find({ workerId: worker._id })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name profileImage location');
    res.json({ count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

// PUT /api/bookings/:id/status  [worker] — accept/reject/in_progress/completed
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['accepted', 'rejected', 'in_progress', 'completed'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const worker = await Worker.findOne({ userId: req.user._id });
    const booking = await Booking.findOne({ _id: req.params.id, workerId: worker._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    await booking.save();

    if (status === 'completed') {
      worker.completedJobs += 1;
      worker.earnings += booking.price;
      await worker.save();
    }

    await notify(booking.customerId, 'Booking update', `Your booking is now "${status.replace('_', ' ')}".`, 'booking');
    res.json({ booking });
  } catch (err) {
    next(err);
  }
};

// PUT /api/bookings/:id/cancel  [customer] — only the caller's own booking
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'This booking can no longer be cancelled' });
    }
    booking.status = 'cancelled';
    await booking.save();
    res.json({ booking });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBooking, getCustomerBookings, getWorkerBookings, updateBookingStatus, cancelBooking };
