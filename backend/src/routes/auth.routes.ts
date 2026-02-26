import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  orgName: z.string().min(1).max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const inviteSchema = z.object({
  email: z.string().email(),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/invite', requireAuth, requireRole('admin'), validate(inviteSchema), authController.invite);
router.post('/accept-invite', authLimiter, validate(acceptInviteSchema), authController.acceptInvite);

export default router;
