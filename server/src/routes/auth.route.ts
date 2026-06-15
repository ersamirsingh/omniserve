import express, { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import {
  verifyToken,
  verifyTokenFromCookie,
  isSuperAdmin,
  isRestaurantOwner,
} from '../middleware/auth.middleware.js';
import { rateLimiter } from '../middleware/rateLimiter.middleware.js';

const router: Router = express.Router();

const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts, please try again after 15 minutes'
});

/**  Public routes */
router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/verify', AuthController.verifyToken);

/**  Protected routes */
router.post('/logout', verifyToken, AuthController.logout);
router.get('/me', verifyToken, AuthController.getCurrentUser);
router.post('/change-password', verifyToken, AuthController.changePassword);
router.post('/revoke-all', verifyToken, AuthController.revokeAllTokens);

// router.post('/invite/restro-owner', verifyToken, isSuperAdmin, /*funs */)
// router.post('/invite/staff', verifyToken, isRestaurantOwner, /*funs */)
// router.post('/invite/accept', verifyToken, /*funs */)
// router.post('/invite/decline', verifyToken, /*funs */)

export default router;
