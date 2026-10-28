const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // every booking route needs login

router.post('/', c.createBooking);
router.get('/my', c.getMyBookings); // must stay above '/:id'
router.get('/', authorize('staff', 'admin'), c.getAllBookings);
router.get('/:id', c.getBooking);
router.get('/:id/invoice', c.getInvoice);
router.put('/:id/cancel', c.cancelBooking);
router.put('/:id/reject-cancel', authorize('staff', 'admin'), c.rejectCancel);
router.put('/:id/check-in', authorize('staff', 'admin'), c.checkIn);
router.put('/:id/check-out', authorize('staff', 'admin'), c.checkOut);
router.put('/:id', c.modifyBooking);

module.exports = router;
