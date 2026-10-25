const router = require('express').Router();
const { payBooking, getMyPayments, getAllPayments } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/my', getMyPayments);
router.get('/', authorize('admin'), getAllPayments);
router.post('/:bookingId', payBooking);

module.exports = router;
