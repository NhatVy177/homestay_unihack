import { Router } from 'express';
import { baoCaoNguon } from '../services/nguonKhach.service.js';
import { baoCaoKpiSale } from '../services/kpiSale.service.js';

// Gắn sau requireAuth ở index.js. GET /api/bao-cao/nguon-khach: tỷ lệ chốt theo nguồn khách (Sale, quản lý, Admin).
const router = Router();
router.get('/nguon-khach', async (req, res, next) => { try { res.json(await baoCaoNguon(req.user)); } catch (err) { next(err); } });
// GET /api/bao-cao/kpi-sale?thang=YYYY-MM&chiNhanh=: KPI từng Sale (D-075); Sale xem mình, Quản lý xem chi nhánh, Admin xem tất cả.
router.get('/kpi-sale', async (req, res, next) => { try { res.json(await baoCaoKpiSale(req.user, req.query)); } catch (err) { next(err); } });
export default router;
