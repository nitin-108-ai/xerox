import { Router } from 'express';
import { registerOwner, login, getMe } from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', registerOwner);
router.post('/login', login);
router.get('/me', authenticateUser, getMe);

export default router;
