import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './middleware/error.middleware';
import { router } from './routes';

export function createApp() {
  const app = express();

  // Security & parsing
  // HSTS varsayılanı kapalı: tarayıcı localhost için HSTS önbelleği (Strict-Transport-Security)
  // sonradan http://localhost:3000/3001 isteklerini bozup 404/SSL hatası verebiliyor.
  // Gerçek HTTPS + HSTS istiyorsanız: ENABLE_HSTS=true ve reverse proxy üzerinden verin.
  if (process.env.NODE_ENV === 'production') {
    app.use(
      helmet({
        hsts:
          process.env.ENABLE_HSTS === 'true'
            ? { maxAge: 31_536_000, includeSubDomains: true }
            : false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      })
    );
  }
  const allowedOrigins = [
    process.env.WEB_URL || 'http://localhost:3000',
    process.env.NEXT_PUBLIC_WEB_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ].filter(Boolean);

  const isAllowedOrigin = (origin?: string): boolean => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    // Vercel preview/prod domainleri
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  };

  app.use(
    cors({
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) return cb(null, origin || allowedOrigins[0]);
        if (process.env.NODE_ENV === 'development') return cb(null, origin || 'http://localhost:3000');
        return cb(new Error('CORS not allowed'));
      },
      credentials: true,
    })
  );
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api', router);

  // Tanımsız /api/* yolları için JSON 404 (boş gövde / HTML 404 yerine)
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'Endpoint bulunamadı',
      path: req.originalUrl,
    });
  });

  // Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
