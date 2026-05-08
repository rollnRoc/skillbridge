import { Router } from 'express';
import authRoutes from './auth.routes.js';
import documentRoutes from './documents.routes.js';
import aiRoutes from './ai.routes.js';
import testRoutes from './tests.routes.js';
import creditRoutes from './credits.routes.js';
import taxonomyRoutes from './taxonomy.routes.js';
import sessionRoutes from './sessions.routes.js';
import invitationRoutes from './invitations.routes.js';
import evaluationRoutes from './evaluations.routes.js';
import adminRoutes from './admin.routes.js';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/ai', aiRoutes);
router.use('/tests', testRoutes);
router.use('/credits', creditRoutes);
router.use('/taxonomy', taxonomyRoutes);
router.use('/sessions', sessionRoutes);
router.use('/invitations', invitationRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/admin', adminRoutes);
