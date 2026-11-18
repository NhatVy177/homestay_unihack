import { Router } from 'express';
import { baoCaoNguon } from '../services/nguonKhach.service.js';

// Gắn sau requireAuth ở index.js. GET /api/bao-cao/nguon-khach: tỷ lệ chốt theo nguồn khách (Sale, quản lý, Admin).
const router = Router();
router.get('/nguon-khach', async (req, res, next) => { try { res.json(await baoCaoNguon(req.user)); } catch (err) { next(err); } });
export default router;
