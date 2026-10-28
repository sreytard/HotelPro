const router = require('express').Router();
const c = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/config', c.getConfig);
router.get('/my', c.getMyPayments);
router.get('/', authorize('admin'), c.getAllPayments);
router.post('/:bookingId/razorpay/order', c.createRazorpayOrder);
router.post('/:bookingId/razorpay/verify', c.verifyRazorpayPayment);
router.post('/:bookingId', c.payBooking);

module.exports = router;
