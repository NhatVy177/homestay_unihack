import { canonicalize } from '@homestaydorm/settlement/evidence';
import { verifyEvidence } from '@homestaydorm/settlement/evidence';
import { CheckoutClosure } from '../../services/checkoutClosure.service.js';
import { SqlCheckoutClosure } from '../../repositories/checkoutClosure.repository.js';
import { ClosureProofs } from '../../services/checkoutClosure.proofs.js';
import { configuredChain } from '../avalanche/chain.js';
import { sqlSources } from '../avalanche/sources.js';
import { createMailer } from '../mail/mailer.js';
let service;
export function getCheckoutClosure() {
  return service ||= new CheckoutClosure({repository:new SqlCheckoutClosure(),proofs:new ClosureProofs(),statement:sqlSources.statement,
    verifyAccepted:async c=>{
      const chain=configuredChain();
      if(chain.deployment.chainId!==c.deployment.chainId||chain.deployment.address.toLowerCase()!==c.deployment.address.toLowerCase())return false;
      const handover=await verifyEvidence(chain.publicClient,c.deployment,c.handover);
      const settlement=await verifyEvidence(chain.publicClient,c.deployment,c.versions.at(-1).bundle);
      return handover.valid&&handover.accepted&&settlement.valid&&settlement.accepted&&!settlement.superseded;
    },
    notify:async(kind,row)=>{
      if(kind!=='closure-final')return {status:'skipped'};
      return createMailer().send({to:row.email,subject:`[HomeStayDorm] Hồ sơ kết thúc hợp đồng ${row.contractId}`,
        text:`Hợp đồng ${row.contractId} đã được xử lý kết thúc. ${row.mode==='without-consent'?'Đóng không có xác nhận của khách.':'Khách đã xác nhận đối soát.'}\nThông tin chi/thu do bên cho thuê ghi nhận, không nằm trên chuỗi. Bản lưu đính kèm không chứng minh ngân hàng đã chuyển tiền.`,
        attachments:[{filename:`ket-thuc-${row.contractId}.json`,content:canonicalize(row.bundle)+'\n',contentType:'application/json'}]});
    }});
}
export async function reconcileCheckoutBySettlement(id) {
  try{return await getCheckoutClosure().reconcileBySettlement(id);}
  catch(error){console.warn('[checkout-lifecycle] Chưa đồng bộ được trạng thái sau ghi nhận tiền: %s',error.message);return {closed:false};}
}
