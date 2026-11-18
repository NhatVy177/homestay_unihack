import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { moLink, taoLink } from '../services/linkChot.service.js';

// POST /api/link-chot (Sale/Quản lý đăng nhập) tạo link; GET /api/link-chot/:token (công khai) mở link.
const router = Router();
router.post('/', requireAuth, async (req, res, next) => { try { res.status(201).json(await taoLink(req.user, req.body)); } catch (err) { next(err); } });
router.get('/:token', async (req, res, next) => { try { res.json(await moLink(req.params.token)); } catch (err) { next(err); } });
export default router;
