import { Router } from 'express';
import { getCheckoutClosure, reconcileCheckoutBySettlement } from '../integrations/checkoutClosure/index.js';
import { randomBytes } from 'node:crypto';
import { requireAuth } from '../middleware/auth.middleware.js';
import { PaymentSimulator } from '../integrations/payment-sim/service.js';
import { sqlDeposits, sqlFirstCharges, sqlPaymentStore, sqlTopUps } from '../integrations/payment-sim/sql.js';
import { notifyDeposit } from '../integrations/mail/datCocNotifications.js';
import { notifyNhanPhong } from '../integrations/mail/nhanPhongNotifications.js';
// D-013: cổng thanh toán ví điện tử MÔ PHỎNG cho tiền cọc. Không gọi nhà cung cấp thật, không nhận tiền thật.
const router = Router();
let simulator;
const getSimulator = () => {
  if (simulator) return simulator;
  const secret = process.env.PAYMENT_SIM_SECRET || randomBytes(32).toString('hex');
  if (!process.env.PAYMENT_SIM_SECRET) console.warn('[payment-sim] PAYMENT_SIM_SECRET chưa đặt; dùng khóa tạm thời cho phiên chạy này.');
  return (simulator = new PaymentSimulator({ store: sqlPaymentStore, deposits: sqlDeposits, firstCharges: sqlFirstCharges, topUps: sqlTopUps,
    secret, notifyDepositPaid: id => notifyDeposit('paid', id),
    notifyFirstChargePaid: id => notifyNhanPhong('first-charge-paid', id),
    beforeTopUpPaid:id=>getCheckoutClosure().assertFinancialAction(id),afterTopUpPaid:reconcileCheckoutBySettlement }));
};
const enabled = () => process.env.PAYMENT_SIM_ENABLED !== 'false';
router.use((req, res, next) => enabled() ? next() : res.status(503).json({ message: 'Cổng thanh toán mô phỏng đang tắt.' }));
const route = fn => async (req, res, next) => { try { res.json(await fn(getSimulator(), req)); } catch (error) { next(error); } };
// Server-to-server notification, authenticated by its HMAC signature (no user session).
router.post('/ipn', route((s, r) => s.handleIpn(r.body || {})));
router.use(requireAuth);
router.post('/dat-coc/:maPhieuCoc', route((s, r) => s.createDepositOrder(r.user, r.params.maPhieuCoc)));
router.get('/thu-nhan-phong', route((s, r) => s.firstChargeQuotes(r.user)));
router.get('/thu-nhan-phong/:maHopDong', route((s, r) => s.firstChargeQuote(r.user, r.params.maHopDong)));
router.post('/thu-nhan-phong/:maHopDong', route((s, r) => s.createFirstChargeOrder(r.user, r.params.maHopDong)));
router.get('/thu-them/:maHopDong', route((s, r) => s.topUpQuote(r.user, r.params.maHopDong)));
router.post('/thu-them/:maHopDong', route((s, r) => s.createTopUpOrder(r.user, r.params.maHopDong)));
router.get('/:id', route((s, r) => s.getOrder(r.user, r.params.id)));
router.post('/:id/thanh-toan', route((s, r) => s.pay(r.user, r.params.id)));
router.post('/:id/huy', route((s, r) => s.cancel(r.user, r.params.id)));
export default router;
