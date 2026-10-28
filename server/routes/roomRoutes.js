const router = require('express').Router();
const c = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/', c.getRooms);
router.post('/upload', protect, authorize('staff', 'admin'), upload.array('images', 5), c.uploadImages);
router.get('/:id/availability', c.getAvailability);
router.get('/:id', c.getRoom);
router.post('/', protect, authorize('staff', 'admin'), c.createRoom);
router.put('/:id/housekeeping', protect, authorize('staff', 'admin'), c.updateHousekeeping);
router.put('/:id', protect, authorize('staff', 'admin'), c.updateRoom);
router.delete('/:id', protect, authorize('admin'), c.deleteRoom);

module.exports = router;
