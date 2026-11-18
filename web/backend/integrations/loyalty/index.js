import { loyaltyDeployment, getLoyaltyChain } from './chain.js';
import { LoyaltyStore } from './store.js';
import { LoyaltyService } from './service.js';

let service;
export function getLoyaltyService() {
  const deployment = loyaltyDeployment();
  if (!deployment) return null;
  service ||= new LoyaltyService(deployment, getLoyaltyChain(deployment), new LoyaltyStore());
  return service;
}

export function startLoyaltyScheduler() {
  if (!loyaltyDeployment()) return;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      for (let count = 0; count < 5; count++) {
        if (!await getLoyaltyService().processOne()) break;
      }
    } catch (error) {
      console.warn('[loyalty] Chưa xử lý xong hàng chờ:', error.shortMessage || error.message);
    } finally { busy = false; }
  };
  setInterval(tick, 7000).unref();
  void tick();
}
