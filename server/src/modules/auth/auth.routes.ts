import express, { Router } from 'express';
import { AuthController } from "./auth.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { rateLimiter } from "../../middlewares/rateLimiter.middleware.js";

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


export default router;
