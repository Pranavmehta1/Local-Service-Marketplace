const express = require('express');
const router = express.Router();
const {
  getOverview, getPendingWorkers, verifyWorker, suspendUser, deleteReview,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(protect, requireRole('admin'));

router.get('/overview', getOverview);
router.get('/workers/pending', getPendingWorkers);
router.put('/workers/:id/verify', verifyWorker);
router.put('/users/:id/suspend', suspendUser);
router.delete('/reviews/:id', deleteReview);

module.exports = router;
