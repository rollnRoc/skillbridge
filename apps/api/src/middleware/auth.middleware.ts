import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';
import { prisma } from '@org/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    companyId?: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.accessToken;

  if (!token) {
    try {
      const user = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, companyId: true },
      });
      if (!user) return next(new AppError(401, 'Sistemde aktif kullanıcı bulunamadı'));
      req.user = { id: user.id, role: user.role, companyId: user.companyId ?? undefined };
      return next();
    } catch {
      return next(new AppError(500, 'Kimlik doğrulama servisi hatası'));
    }
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
      companyId?: string;
    };
    req.user = payload;
    next();
  } catch {
    // Token geçersizse de girişsiz kullanım için ilk aktif kullanıcıya düş
    try {
      const user = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, companyId: true },
      });
      if (!user) return next(new AppError(401, 'Sistemde aktif kullanıcı bulunamadı'));
      req.user = { id: user.id, role: user.role, companyId: user.companyId ?? undefined };
      return next();
    } catch {
      return next(new AppError(401, 'Geçersiz token'));
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Bu işlem için yetkiniz yok'));
    }
    next();
  };
}
