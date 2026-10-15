import { Router } from 'express';
import { registerOwner, login, getMe, sendOtp, verifyOtp } from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerOwner);
router.post('/login', login);
router.get('/me', authenticateUser, getMe);

export default router;

