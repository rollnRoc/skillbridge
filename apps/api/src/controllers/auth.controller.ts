import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import * as authService from '../services/auth.service.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function setTokenCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  rememberMe = false
) {
  res.cookie('accessToken', tokens.accessToken, {
    ...COOKIE_OPTS,
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    ...COOKIE_OPTS,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
  });
}

export async function userLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, rememberMe } = req.body ?? {};
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ message: 'E-posta ve şifre gerekli' });
    }
    const tokens = await authService.loginWithPassword(email.trim(), password, Boolean(rememberMe));
    setTokenCookies(res, tokens, Boolean(rememberMe));
    // SPA: çapraz köken / tarayıcı çerez kısıtlarında fetchMe için Bearer kullanılabilir
    res.json({ success: true, accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function superadminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, rememberMe } = req.body ?? {};
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ message: 'E-posta ve şifre gerekli' });
    }
    const tokens = await authService.loginSuperAdmin(email.trim(), password, Boolean(rememberMe));
    setTokenCookies(res, tokens, Boolean(rememberMe));
    res.json({ success: true, accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export function superadminLogout(_req: Request, res: Response, next: NextFunction) {
  try {
    res.clearCookie('accessToken', COOKIE_OPTS);
    res.clearCookie('refreshToken', COOKIE_OPTS);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function patchMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { firstName, lastName, department, occupation } = req.body ?? {};
    const user = await authService.updateProfile(req.user!.id, {
      firstName,
      lastName,
      department,
      occupation,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}
