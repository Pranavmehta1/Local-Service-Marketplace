const express = require('express');
const router = express.Router();
const { createReview, getWorkerReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.post('/', protect, requireRole('customer'), createReview);
router.get('/worker/:workerId', getWorkerReviews);

module.exports = router;
