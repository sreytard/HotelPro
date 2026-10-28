const router = require('express').Router();
const c = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/', c.createRequest);
router.get('/my', c.getMyRequests);
router.get('/staff', authorize('staff', 'admin'), c.getStaffList);
router.get('/', authorize('staff', 'admin'), c.getAllRequests);
router.put('/:id', authorize('staff', 'admin'), c.updateRequest);

module.exports = router;
