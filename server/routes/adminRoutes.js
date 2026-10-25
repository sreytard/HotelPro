const router = require('express').Router();
const { getStats, getUsers, createStaff, deleteUser } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin')); // admin only

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users', createStaff);
router.delete('/users/:id', deleteUser);

module.exports = router;
