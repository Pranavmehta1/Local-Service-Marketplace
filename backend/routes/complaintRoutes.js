const express = require('express');
const router = express.Router();
const {
  createComplaint, getCustomerComplaints, getWorkerComplaints, getAllComplaints, updateComplaintStatus,
} = require('../controllers/complaintController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.post('/', protect, requireRole('customer'), createComplaint);
router.get('/customer', protect, requireRole('customer'), getCustomerComplaints);
router.get('/worker', protect, requireRole('worker'), getWorkerComplaints);
router.get('/admin', protect, requireRole('admin'), getAllComplaints);
router.put('/:id/status', protect, requireRole('admin'), updateComplaintStatus);

module.exports = router;
