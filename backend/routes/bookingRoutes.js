const express = require('express');
const router = express.Router();
const {
  createBooking, getCustomerBookings, getWorkerBookings, updateBookingStatus, cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.post('/', protect, requireRole('customer'), createBooking);
router.get('/customer', protect, requireRole('customer'), getCustomerBookings);
router.get('/worker', protect, requireRole('worker'), getWorkerBookings);
router.put('/:id/status', protect, requireRole('worker'), updateBookingStatus);
router.put('/:id/cancel', protect, requireRole('customer'), cancelBooking);

module.exports = router;
