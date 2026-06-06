import express, { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import {
  verifyToken,
  verifyTokenFromCookie,
  isSuperAdmin,
  isRestaurantOwner,
} from '../middleware/auth.middleware.js';

const router: Router = express.Router();

/**  Public routes */
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/verify', AuthController.verifyToken);

/**  Protected routes */
router.post('/logout', verifyToken, AuthController.logout);
router.get('/me', verifyToken, AuthController.getCurrentUser);
router.post('/change-password', verifyToken, AuthController.changePassword);
router.post('/revoke-all', verifyToken, AuthController.revokeAllTokens);

export default router;
