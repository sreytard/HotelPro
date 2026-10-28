const router = require('express').Router();
const c = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', c.getNotifications);
router.put('/read-all', c.markAllRead); // above '/:id/read'
router.put('/:id/read', c.markRead);

module.exports = router;
