const router = require('express').Router();
const c = require('../controllers/seasonController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));
router.get('/', c.getSeasons);
router.post('/', c.createSeason);
router.put('/:id', c.updateSeason);
router.delete('/:id', c.deleteSeason);

module.exports = router;
