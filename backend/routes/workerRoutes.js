const express = require('express');
const router = express.Router();
const {
  listWorkers, getWorker, updateOwnProfile, updateAvailability, getWorkerReviews,
} = require('../controllers/workerController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get('/', listWorkers);
router.put('/profile', protect, requireRole('worker'), updateOwnProfile);
router.put('/availability', protect, requireRole('worker'), updateAvailability);
router.get('/:id', getWorker);
router.get('/:id/reviews', getWorkerReviews);

module.exports = router;
