const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin')); // admin only

router.get('/stats', c.getStats);
router.get('/reports', c.getReports);
router.get('/reports/export', c.exportReport);
router.get('/audit', c.getAuditLogs);
router.get('/health', c.getHealth);
router.get('/users', c.getUsers);
router.post('/users', c.createStaff);
router.delete('/users/:id', c.deleteUser);

module.exports = router;
