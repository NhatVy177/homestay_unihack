import { getCheckoutClosure } from '../integrations/checkoutClosure/index.js';
import { getAvalancheService, avalancheEnabled } from '../integrations/avalanche/index.js';
import { responseState } from './checkoutClosure.rules.js';

// Exposed separately for deterministic tests. This never prepares or sends a chain transaction.
export async function remindPendingCases(service,cases,now=Date.now()) {
  for(const item of cases) await service.exclusive(async()=>{
    let c=await service.store.getCase(item.id);
    if(!c||await service.isClosed(c.contractId))return;
    const response=responseState(c,now);
    if(!response.waiting)return;
    if(response.overdue&&!c.responseTracking?.overdue || c.responseTracking?.token!==response.token) {
      c=await service.store.saveCase({...c,responseTracking:{token:response.token,overdue:response.overdue,sentAt:response.sentAt}},c.revision);
    }
    const hours=response.reminders.at(-1);if(!hours)return;
    const kind=`reminder:${response.token}:${hours}`;
    const previous=(c.notifications||[]).filter(n=>n.kind===kind).at(-1);
    if(previous?.status==='sent'||previous&&Date.parse(previous.at)>now-5*60000)return;
    await service.notified(c,kind);
  });
}
let timer;
export function startCheckoutLifecycleScheduler() {
  if(timer)return timer;
  const run=async()=>{
    try {
      const s=getCheckoutClosure(),ids=await s.repository.candidates();
      for(const id of ids){try{await s.reconcile(id);await s.sendFinal(id);}catch(e){console.warn('[checkout-lifecycle] Hồ sơ chưa đồng bộ: %s',e.message);}}
      if(avalancheEnabled())await remindPendingCases(getAvalancheService(),await s.repository.allCases());
    }catch(e){console.warn('[checkout-lifecycle] Chưa quét được hồ sơ: %s',e.message);}
  };
  void run();timer=setInterval(run,5*60000);timer.unref?.();return timer;
}
