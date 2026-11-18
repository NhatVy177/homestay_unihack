import { Router } from 'express';
import { createServiceError } from '../errors/serviceErrors.js';
import { getLoyaltyService } from '../integrations/loyalty/index.js';

const router = Router();
const handler = (operation) => async (req, res, next) => {
  try {
    if (req.user?.vaiTro !== 'KhachHang' || !req.user.maNguoiDung) {
      throw createServiceError('Chức năng này chỉ dành cho khách thuê.', 403);
    }
    const service = getLoyaltyService();
    if (!service && req.method === 'GET') return res.json({ enabled: false });
    if (!service) throw createServiceError('Chương trình điểm thưởng chưa được mở.', 503);
    res.json(await operation(service, req.user.maNguoiDung, req.body || {}, req.params));
  } catch (error) { next(error); }
};
router.get('/', handler((service, customerId) => service.overview(customerId)));
router.post('/doi-uu-dai', handler((service, customerId, body) => service.quote(customerId, body.contractId)));
router.post('/doi-uu-dai/:id', handler((service, customerId, body, params) => service.redeem(customerId, params.id, body.signature)));
export default router;
