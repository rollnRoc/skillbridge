import path from 'path';
import fs from 'fs';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import * as documentsService from '../services/documents.service.js';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const docs = await documentsService.listDocuments(req.user!.id);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doc = await documentsService.getDocument(req.params.id, req.user!.id);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

export async function upload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Dosya yüklenmedi' });
      return;
    }

    const fileUrl = `/uploads/documents/${file.filename}`;
    const ext = path.extname(file.originalname || '').toLowerCase();
    const normalizedMime = (() => {
      if (file.mimetype && file.mimetype !== 'application/octet-stream') {
        return file.mimetype;
      }
      if (ext === '.pdf') return 'application/pdf';
      if (ext === '.doc' || ext === '.docx') {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      if (ext === '.ppt' || ext === '.pptx') {
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      }
      if (ext === '.txt') return 'text/plain';
      return file.mimetype || 'application/octet-stream';
    })();

    const doc = await documentsService.uploadDocument({
      ownerId: req.user!.id,
      title: (req.body.title as string) || file.originalname,
      fileUrl,
      mimeType: normalizedMime,
      sizeBytes: file.size,
      language: req.body.language,
      category: req.body.category,
      description: req.body.description,
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

export async function download(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doc = await documentsService.getDocument(req.params.id, req.user!.id);

    if (doc.content && !doc.fileUrl) {
      const filename = `${doc.title.replace(/[<>:"/\\|?*]/g, '_')}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);
      return res.send(doc.content);
    }

    if (doc.fileUrl) {
      const rel = doc.fileUrl.replace(/^\//, '');
      const abs = path.join(process.cwd(), rel);
      if (!fs.existsSync(abs)) {
        return next(new AppError(404, 'Dosya bulunamadı'));
      }
      const mime = doc.mimeType || 'application/octet-stream';
      const ext =
        mime === 'application/pdf'
          ? '.pdf'
          : mime.includes('wordprocessingml')
            ? '.docx'
            : mime.includes('presentationml')
              ? '.pptx'
              : mime === 'text/plain'
                ? '.txt'
                : path.extname(abs) || '';
      const safeName = `${doc.title.replace(/[<>:"/\\|?*]/g, '_')}${ext}`;
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);
      return res.sendFile(path.resolve(abs));
    }

    return next(new AppError(404, 'İndirilebilir içerik yok'));
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const doc = await documentsService.updateDocument(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await documentsService.deleteDocument(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
