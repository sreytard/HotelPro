const router = require('express').Router();
const c = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', c.getHotelSettings); // public
router.put('/', protect, authorize('admin'), c.updateHotelSettings);

module.exports = router;
