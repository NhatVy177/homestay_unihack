import { Router } from 'express';
import { isAddress } from 'viem';
import { requireAuth } from '../middleware/auth.middleware.js';
import { SqlStore } from '../integrations/avalanche/store.js';
import { sqlSources } from '../integrations/avalanche/sources.js';
import { AvalancheService } from '../integrations/avalanche/service.js';
import { chainConfig, configuredChain } from '../integrations/avalanche/chain.js';
export const router = Router();
const enabled = () => process.env.AVALANCHE_ENABLED === 'true';
router.get('/config', (req, res) => {
  const deployment = chainConfig();
  res.json({ enabled: enabled() && isAddress(deployment.address), deployment });
});
let service;
const getService = () => service ||= new AvalancheService({
  store: new SqlStore(), sources: sqlSources, chain: configuredChain(),
  origin: process.env.AVALANCHE_APP_ORIGIN || 'http://localhost:5173',
});
router.use(requireAuth);
router.use((req, res, next) => {
  if (!enabled() || !isAddress(chainConfig().address)) return res.status(503).json({ message: 'Chức năng xác nhận chưa được cấu hình. Các nghiệp vụ thuê phòng vẫn dùng bình thường.' });
  next();
});
// Per-user request budget; operator nonce handling assumes one API worker in this MVP.
const budgets = new Map();
router.use((req, res, next) => {
  const now = Date.now(), key = req.user.maNguoiDung;
  for (const [id, b] of budgets) if (b.until < now) budgets.delete(id);
  const budget = budgets.get(key) || { until: now + 60000, count: 0 };
  budget.count++; budgets.set(key, budget);
  if (budget.count > 40) return res.status(429).json({ message: 'Quá nhiều yêu cầu. Hãy thử lại sau một phút.' });
  next();
});
const route = fn => async (req, res, next) => { try { res.json(await fn(getService(), req)); } catch (error) { next(error); } };
router.get('/wallet', route((s, r) => s.store.getWallet(r.user.maNguoiDung).then(address => ({ address: address || null }))));
router.post('/wallet/challenge', route((s, r) => s.challenge(r.user, r.body.address)));
router.post('/wallet/link', route((s, r) => s.link(r.user, r.body.id, r.body.signature)));
router.get('/cases', route((s, r) => s.list(r.user)));
router.post('/cases', route((s, r) => s.create(r.user, r.body)));
router.post('/cases/:id/settlements', route((s, r) => s.propose(r.user, r.params.id, r.body.sourceId)));
router.post('/cases/:id/prepare', route((s, r) => s.prepare(r.user, r.params.id, r.body.action, r.body.reason)));
router.post('/cases/:id/confirm', route((s, r) => s.confirm(r.user, r.params.id, r.body)));
router.post('/cases/:id/sync', route((s, r) => s.sync(r.user, r.params.id)));
export default router;
