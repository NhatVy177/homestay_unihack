import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { chainConfig } from '../integrations/avalanche/chain.js';
import { avalancheEnabled, getAvalancheService } from '../integrations/avalanche/index.js';
import { configuredPrivyIssuer } from '../integrations/avalanche/privy-jwt.js';
export const router = Router();
router.get('/config', (req, res) => {
  let deployment = null;
  try { deployment = chainConfig(); } catch { /* invalid chain id → disabled */ }
  res.json({ enabled: avalancheEnabled(), deployment, accountWallet: configuredPrivyIssuer().enabled });
});
// Public verification key for Privy JWT-based auth (D-011). Contains no secret.
router.get('/privy/jwks.json', (req, res) => res.json(configuredPrivyIssuer().jwks()));
router.use(requireAuth);
router.use((req, res, next) => {
  if (!avalancheEnabled()) return res.status(503).json({ message: 'Chức năng xác nhận điện tử chưa được cấu hình. Các nghiệp vụ thuê phòng vẫn dùng bình thường.' });
  next();
});
// Per-user request budget; operator nonce handling assumes one API worker in this MVP.
const budgets = new Map();
router.use((req, res, next) => {
  const now = Date.now(), key = req.user.maNguoiDung;
  for (const [id, b] of budgets) if (b.until < now) budgets.delete(id);
  const budget = budgets.get(key) || { until: now + 60000, count: 0 };
  budget.count++; budgets.set(key, budget);
  if (budget.count > 60) return res.status(429).json({ message: 'Quá nhiều yêu cầu. Hãy thử lại sau một phút.' });
  next();
});
const route = fn => async (req, res, next) => { try { res.json(await fn(getAvalancheService(), req)); } catch (error) { next(error); } };
router.get('/privy/token', (req, res, next) => { try { res.json({ token: configuredPrivyIssuer().issue(req.user) }); } catch (error) { next(error); } });
router.get('/wallet', route((s, r) => s.store.getWallet(r.user.maNguoiDung).then(address => ({ address: address || null }))));
router.post('/wallet/challenge', route((s, r) => s.challenge(r.user, r.body.address)));
router.post('/wallet/link', route((s, r) => s.link(r.user, r.body.id, r.body.signature)));
router.get('/handovers/unpublished', route((s, r) => s.unpublished(r.user)));
router.get('/cases', route((s, r) => s.list(r.user)));
router.post('/cases', route((s, r) => s.publish(r.user, r.body.sourceId, r.body)));
router.post('/cases/:id/change-request', route((s, r) => s.requestChange(r.user, r.params.id, r.body.reason)));
router.post('/cases/:id/revise', route((s, r) => s.revise(r.user, r.params.id, r.body)));
router.post('/cases/:id/remind', route((s, r) => s.remind(r.user, r.params.id)));
router.get('/cases/:id/statements', route((s, r) => s.statements(r.user, r.params.id)));
router.post('/cases/:id/settlements', route((s, r) => s.propose(r.user, r.params.id, r.body.sourceId)));
router.post('/cases/:id/prepare', route((s, r) => s.prepare(r.user, r.params.id, r.body.action, r.body.reason, r.body.revision)));
router.post('/cases/:id/confirm', route((s, r) => s.confirm(r.user, r.params.id, r.body)));
router.post('/cases/:id/sync', route((s, r) => s.sync(r.user, r.params.id)));
export default router;
