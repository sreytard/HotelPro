const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/verify-email', c.verifyEmail);
router.get('/me', protect, c.getMe);
router.put('/profile', protect, c.updateProfile);
router.put('/password', protect, c.changePassword);
router.post('/resend-verification', protect, c.resendVerification);

module.exports = router;
