import multer from 'multer';
import { contractEvidence } from '../integrations/avalanche/contractEvidence.js';

// Reuse the existing multipart mechanism, but never put personal contract scans under public /uploads.
const parseUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('file');
export const signedUpload = (req, res, next) => {
  if (req.user?.vaiTro !== 'NhanVien' || req.user.chucVu !== 'Sale')
    return next(Object.assign(new Error('Chỉ nhân viên Sale được tải bản hợp đồng đã ký.'), { statusCode: 403 }));
  parseUpload(req, res, error => next(error
    ? Object.assign(new Error('Chọn một file hợp đồng tối đa 5 MB.'), { statusCode: 400 }) : undefined));
};
const handle = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
export const policy = handle(async (req, res) => res.json(await contractEvidence.policy(req.user, req.params.id)));
export const confirmPolicy = handle(async (req, res) => res.json(await contractEvidence.confirm(req.user, req.params.id, req.body.version)));
export const metadata = handle(async (req, res) => res.json(await contractEvidence.metadata(req.user, req.params.id)));
export const upload = handle(async (req, res) => res.json(await contractEvidence.upload(req.user, req.params.id, req.file)));
export const download = handle(async (req, res) => {
  await contractEvidence.metadata(req.user, req.params.id); // authorization BEFORE reading bytes
  const result = await contractEvidence.read(req.params.id);
  if (!result) return res.status(404).json({ message: 'Chưa có ảnh hợp đồng đã ký.' });
  res.setHeader('Content-Type', result.file.mediaType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.file.name}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(result.buffer);
});
