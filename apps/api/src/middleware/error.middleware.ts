import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, message: err.message });
  }

  console.error('[API Error]', err);
  const message = process.env.NODE_ENV === 'development' && err.message
    ? err.message
    : 'Sunucu hatası';
  res.status(500).json({ error: message, message });
}
