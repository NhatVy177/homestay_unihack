import { isAddress } from 'viem';
import { SqlStore } from './store.js';
import { sqlSources } from './sources.js';
import { AvalancheService } from './service.js';
import { chainConfig, configuredChain } from './chain.js';
import { createNotifier } from './notifications.js';
import { createMailer } from '../mail/mailer.js';
export function avalancheEnabled() {
  try { return process.env.AVALANCHE_ENABLED === 'true' && isAddress(chainConfig().address); } catch { return false; }
}
export const appOrigin = () => process.env.AVALANCHE_APP_ORIGIN || 'http://localhost:5173';
let service;
export function getAvalancheService() {
  return service ||= new AvalancheService({
    store: new SqlStore(), sources: sqlSources, chain: configuredChain(), origin: appOrigin(),
    notify: createNotifier({ mailer: createMailer(), contact: sqlSources.contact, origin: appOrigin() }),
  });
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
