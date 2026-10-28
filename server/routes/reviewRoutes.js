const router = require('express').Router();
const c = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/latest', c.getLatestReviews); // public
router.get('/room/:roomId', c.getRoomReviews); // public
router.get('/my', protect, c.getMyReviews);
router.post('/', protect, c.createReview);
router.delete('/:id', protect, authorize('admin'), c.deleteReview);

module.exports = router;
