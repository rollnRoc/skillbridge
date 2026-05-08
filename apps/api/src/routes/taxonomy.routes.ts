import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';

const router = Router();
router.use(authenticate);

// ─── SEKTÖRLER ─────────────────────────────────────────────────────────────────

// GET /api/taxonomy/sectors
router.get('/sectors', async (_req, res, next) => {
  try {
    const sectors = await prisma.sector.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(sectors);
  } catch (err) { next(err); }
});

// GET /api/taxonomy/sectors/:id/occupations — cascade
router.get('/sectors/:id/occupations', async (req, res, next) => {
  try {
    const occupations = await prisma.occupation.findMany({
      where: { sectorId: req.params.id, isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(occupations);
  } catch (err) { next(err); }
});

// GET /api/taxonomy/occupations/:id/units
router.get('/occupations/:id/units', async (req, res, next) => {
  try {
    const units = await prisma.unit.findMany({
      where: { occupationId: req.params.id, isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(units);
  } catch (err) { next(err); }
});

// GET /api/taxonomy/units/:id/titles
router.get('/units/:id/titles', async (req, res, next) => {
  try {
    const titles = await prisma.title.findMany({
      where: { unitId: req.params.id, isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(titles);
  } catch (err) { next(err); }
});

// GET /api/taxonomy/occupations/:id/competencies
router.get('/occupations/:id/competencies', async (req, res, next) => {
  try {
    const competencies = await prisma.competency.findMany({
      where: {
        isActive: true,
        OR: [
          { occupationId: req.params.id },
          { occupationId: null }, // genel yetkinlikler
        ],
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(competencies);
  } catch (err) { next(err); }
});

// ─── ADMIN — CRUD ──────────────────────────────────────────────────────────────

// POST /api/taxonomy/sectors (admin)
router.post('/sectors', requireRole('PLATFORM_ADMIN'), async (req, res, next) => {
  try {
    if (!req.body.name) throw new AppError(400, 'name zorunludur');
    const sector = await prisma.sector.create({ data: { name: req.body.name } });
    res.status(201).json(sector);
  } catch (err) { next(err); }
});

// POST /api/taxonomy/occupations (admin)
router.post('/occupations', requireRole('PLATFORM_ADMIN'), async (req, res, next) => {
  try {
    const { name, sectorId } = req.body;
    if (!name || !sectorId) throw new AppError(400, 'name ve sectorId zorunludur');
    const occ = await prisma.occupation.create({ data: { name, sectorId } });
    res.status(201).json(occ);
  } catch (err) { next(err); }
});

// POST /api/taxonomy/competencies (admin)
router.post('/competencies', requireRole('PLATFORM_ADMIN'), async (req, res, next) => {
  try {
    const { name, category, occupationId } = req.body;
    if (!name || !category) throw new AppError(400, 'name ve category zorunludur');
    const comp = await prisma.competency.create({ data: { name, category, occupationId } });
    res.status(201).json(comp);
  } catch (err) { next(err); }
});

// PATCH /api/taxonomy/sectors/:id (admin)
router.patch('/sectors/:id', requireRole('PLATFORM_ADMIN'), async (req, res, next) => {
  try {
    const sector = await prisma.sector.update({
      where: { id: req.params.id },
      data: { name: req.body.name, isActive: req.body.isActive },
    });
    res.json(sector);
  } catch (err) { next(err); }
});

export default router;
