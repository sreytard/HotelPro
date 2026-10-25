const router = require('express').Router();
const { getRooms, getRoom, getAvailability, uploadImages, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/', getRooms);
router.post('/upload', protect, authorize('staff', 'admin'), upload.array('images', 5), uploadImages);
router.get('/:id/availability', getAvailability);
router.get('/:id', getRoom);
router.post('/', protect, authorize('staff', 'admin'), createRoom);
router.put('/:id', protect, authorize('staff', 'admin'), updateRoom);
router.delete('/:id', protect, authorize('admin'), deleteRoom);

module.exports = router;
