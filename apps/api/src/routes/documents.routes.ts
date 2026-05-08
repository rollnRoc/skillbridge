import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.middleware.js';
import * as documentsController from '../controllers/documents.controller.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/octet-stream',
      '',
    ];

    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = new Set(['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx']);
    const mimeAllowed = allowedMime.includes(file.mimetype);
    const extAllowed = allowedExt.has(ext);

    if (mimeAllowed && extAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen format'));
    }
  },
});

// Tüm endpointler auth gerektirir
router.use(authenticate);

router.get('/', documentsController.list);
router.get('/:id/download', documentsController.download);
router.get('/:id', documentsController.getOne);
router.post('/', upload.single('file'), documentsController.upload);
router.patch('/:id', documentsController.update);
router.delete('/:id', documentsController.remove);

export default router;
