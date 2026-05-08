import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

/** E-posta + şifre → JWT; bireysel, kurumsal ve platform yöneticisi (PLATFORM_ADMIN) dahil. */
router.post('/login', authController.userLogin);
router.post('/logout', authController.superadminLogout);

/** Platform yöneticisi: yalnızca PLATFORM_ADMIN (ayrı uç). */
router.post('/superadmin/login', authController.superadminLogin);
router.post('/superadmin/logout', authController.superadminLogout);

/** Giriş/kayıt kaldırıldı; yalnızca mevcut kullanıcı profili (token yoksa middleware ilk aktif kullanıcıya düşer). */
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.patchMe);

export default router;
