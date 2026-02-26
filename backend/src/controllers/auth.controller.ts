import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, orgName } = req.body;
    const { user, org } = await authService.register(name, email, password, orgName);

    // Set session
    req.session.userId = user.id;
    req.session.orgId = org.id;
    req.session.role = user.role;

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);

    // Set session
    req.session.userId = user.id;
    req.session.orgId = user.org_id;
    req.session.role = user.role;

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie('sid');
      res.json({ message: 'Logged out' });
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUserById(req.session.userId!);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    await authService.generateResetToken(email);
    // In production, send email with reset link
    res.json({ message: 'If an account with that email exists, a reset link has been sent' });
  } catch {
    // Don't leak whether email exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent' });
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
}

export async function invite(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.session.orgId!;
    const { email } = req.body;
    const token = await authService.createInvite(orgId, email);
    // In production, send email with invite link
    res.json({ message: 'Invite sent', token });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, name, password } = req.body;
    const user = await authService.acceptInvite(token, name, password);

    req.session.userId = user.id;
    req.session.orgId = user.org_id;
    req.session.role = user.role;

    res.json(user);
  } catch (err) {
    next(err);
  }
}
