import { isAddress } from 'viem';
import { SqlStore } from './store.js';
import { sqlSources } from './sources.js';
import { AvalancheService } from './service.js';
import { chainConfig, configuredChain } from './chain.js';
import { createNotifier } from './notifications.js';
import { createMailer } from '../mail/mailer.js';
import { getCheckoutClosure } from '../checkoutClosure/index.js';
import { executeQuery, sql } from '../../database/connection.js';
export function avalancheEnabled() {
  try { return process.env.AVALANCHE_ENABLED === 'true' && isAddress(chainConfig().address); } catch { return false; }
}
export const appOrigin = () => process.env.AVALANCHE_APP_ORIGIN || 'http://localhost:5173';
let service;
export function getAvalancheService() {
  return service ||= new AvalancheService({
    store: new SqlStore(), sources: sqlSources, chain: configuredChain(), origin: appOrigin(),
    notify: createNotifier({ mailer: createMailer(), contact: sqlSources.contact, origin: appOrigin() }),
    isClosed:async id=>!!(await getCheckoutClosure().repository.context(id))?.closedAt,
    afterConfirmed: c=>getCheckoutClosure().reconcile(c.contractId),
  });
}
async function contractOfSettlement(maDoiSoat) {
  const row = (await executeQuery('SELECT p.MaHopDong AS contractId FROM dbo.DoiSoat d JOIN dbo.PhieuTraPhong p ON p.MaPhieuTra = d.MaPhieuTra WHERE d.MaDoiSoat = @id',
    [{ name: 'id', type: sql.VarChar(6), value: maDoiSoat }])).recordset[0];
  return row?.contractId || null;
}
/** D-030 (J-C116): lập/điều chỉnh bảng đối soát đã gửi khách trên Web2 thì tự gửi luôn lên hệ thống xác nhận (khách ký bằng ví).
 *  Không có hồ sơ xác nhận hoặc bàn giao chưa được khách xác nhận thì bỏ qua; lỗi không bao giờ chặn Web2, kế toán vẫn gửi tay được. */
export async function onWeb2SettlementSent(user, maDoiSoat, { enabled = avalancheEnabled, service = getAvalancheService, contractOf = contractOfSettlement } = {}) {
  if (!enabled() || !maDoiSoat) return { status: 'disabled' };
  try {
    const contractId = await contractOf(maDoiSoat);
    if (!contractId) return { status: 'skipped', reason: 'no-contract' };
    const svc = service();
    const found = (await svc.list(user)).find((item) => item.contractId === contractId);
    if (!found) return { status: 'skipped', reason: 'no-case' };
    const c = await svc.propose(user, found.id, maDoiSoat);
    return { status: 'published', caseId: c.id };
  } catch (error) {
    console.warn('[avalanche] Chưa gửi được bảng đối soát %s lên hệ thống xác nhận: %s', maDoiSoat, error.message);
    return { status: 'failed', message: error.message };
  }
}
/** D-012: the Web2 handover publishes the tenant review automatically; failures never block Web2. */
export async function onWeb2HandoverCreated(user, maBienBan) {
  if (!avalancheEnabled() || !maBienBan) return { status: 'disabled' };
  try {
    const c = await getAvalancheService().publish(user, maBienBan);
    return { status: 'published', caseId: c.id, notification: c.notifications?.at(-1)?.status || null };
  } catch (error) {
    console.warn('[avalanche] Chưa phát hành được biên bản %s cho khách xem: %s', maBienBan, error.message);
    return { status: 'failed', message: error.message };
  }
}
