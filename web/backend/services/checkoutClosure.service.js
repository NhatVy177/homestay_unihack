import { canonicalize } from '@homestaydorm/settlement/evidence';
import { createClosureEvidence, WEB2_NOTICE, closureDigest } from '@homestaydorm/settlement/closure';
import { assertAccess, exceptionEligibility, moneyState, responseState } from './checkoutClosure.rules.js';
import { createServiceError } from './serviceErrors.js';

export class CheckoutClosure {
  constructor({repository,proofs,verifyAccepted,statement,notify,clock=()=>Date.now()}) {
    Object.assign(this,{repository,proofs,verifyAccepted,statement,notify,clock});
  }
  async context(user,id,role) {const row=await this.repository.context(id);assertAccess(user,row,role);return row;}
  async list(user) {const ids=await this.repository.listIds(user);return Promise.all(ids.map(id=>this.status(user,id)));}
  async uploadContact(user,id,file) {await this.context(user,id,'Quản lý');return this.proofs.contact(id,file);}
  async proof(user,id,proofId) {await this.context(user,id);return this.proofs.get(id,proofId);}
  async assertFinancialAction(settlementId,actor,reference,paidAt) {
    const id=await this.repository.contractForSettlement(settlementId);
    if(!id)return; // Deposit-only cancellation keeps its Web2 flow.
    const row=await this.repository.context(id);
    if(actor)assertAccess(await this.repository.staff(actor),row,'Kế toán');
    if(row.closedAt)throw createServiceError('Hồ sơ đã đóng, không được ghi thêm tiền.',409);
    const c=row.case, latest=c?.versions?.at(-1);
    const exception=exceptionEligibility(c,this.clock()).allowed&&row.exceptionReason&&row.contactProof
      &&row.preparedSettlementId===settlementId&&Number(row.preparedRefund)===Number(row.refundDueVnd)&&Number(row.preparedTopUp)===Number(row.topUpDueVnd);
    if(!exception) {
      if(c?.state!=='accepted'||!latest?.accepted||latest.sourceId!==settlementId||!await this.verifyAccepted(c))
        throw createServiceError('Chưa có xác nhận đúng đối soát hoặc hồ sơ xử lý không có xác nhận của quản lý.',409);
      const current=await this.statement(settlementId,c,latest.bundle.version);
      if(canonicalize(current)!==canonicalize(latest.bundle.documents.statement.payload))throw createServiceError('Đối soát đã thay đổi, chưa được ghi nhận tiền.',409);
    }
    if(reference!==undefined) {
      if(!reference)throw createServiceError('Cần chứng từ thu/chi trước khi ghi nhận tiền.',400);
      await this.proofs.financial({...row,paymentReference:reference,paidAt},id=>this.repository.simulatedOrder(id));
    }
  }
  async reconcileBySettlement(settlementId) {
    const id=await this.repository.contractForSettlement(settlementId);
    return id?this.reconcile(id):null;
  }
  async money(row) {
    let proof=null,error=null;
    try {proof=await this.proofs.financial(row,id=>this.repository.simulatedOrder(id));} catch(e){error=e.message;}
    const state=moneyState(row,proof);
    if(error&&!state.missing.includes(error))state.missing.push(error);
    state.ready=state.missing.length===0;
    return {state,proof};
  }
  async status(user,id) {
    const row=await this.context(user,id), {state}=await this.money(row);
    const exception=exceptionEligibility(row.case,this.clock());
    const exceptionPrepared=!!row.exceptionReason&&!!row.contactProof&&row.preparedSettlementId===row.settlementId
      &&Number(row.preparedRefund)===Number(row.refundDueVnd)&&Number(row.preparedTopUp)===Number(row.topUpDueVnd);
    return {contractId:id,hasReturn:!!row.returnId,settlementId:row.settlementId,closed:!!row.closedAt,closedAt:row.closedAt,mode:row.mode,
      keysReturnedAt:row.keysReturnedAt,canReturnKeys:!!row.returnId&&!row.keysReturnedAt,
      money:state,exception,exceptionPrepared,canCloseWithoutConsent:!row.closedAt&&exception.allowed&&state.ready&&exceptionPrepared,
      response:responseState(row.case,this.clock()),mailStatus:row.mailStatus||null};
  }
  async reconcile(id) {
    let row=await this.repository.context(id);
    if(row?.case?.state==='disputed'&&!row.closedAt)await this.repository.disputed(row);
    if(!row||row.closedAt||row.case?.pending||row.case?.state!=='accepted')return {closed:!!row?.closedAt};
    const c=row.case, latest=c.versions?.at(-1);
    if(!latest?.accepted||!latest.bundle?.confirmationReceipt||latest.sourceId!==row.settlementId) return {closed:false};
    if(!await this.verifyAccepted(c))throw createServiceError('Chưa đối chiếu được xác nhận hiện tại trên chuỗi.',409);
    const current=await this.statement(row.settlementId,c,latest.bundle.version);
    if(canonicalize(current)!==canonicalize(latest.bundle.documents.statement.payload)) throw createServiceError('Đối soát Web2 khác bản khách đã xác nhận; chưa được thanh lý.',409);
    await this.repository.accepted(row,c);
    row=await this.repository.context(id);
    const money=await this.money(row);
    if(!money.state.ready)return {closed:false,missing:money.state.missing};
    return this.close(row,'accepted',money.proof,null,null);
  }
  async prepareException(user,id,reason,proofId) {
    const row=await this.context(user,id,'Quản lý');
    if(row.closedAt)throw createServiceError('Hồ sơ đã đóng.',409);
    const eligible=exceptionEligibility(row.case,this.clock());
    if(!eligible.allowed)throw createServiceError(eligible.reason,409);
    if(typeof reason!=='string'||!reason.trim()||reason.length>2000)throw createServiceError('Cần lý do liên hệ/xử lý, tối đa 2000 ký tự.',400);
    const {meta}=await this.proofs.get(id,proofId);
    await this.repository.prepareException(row,user,reason.trim(),meta);
    return this.status(user,id);
  }
  async closeWithoutConsent(user,id) {
    const row=await this.context(user,id,'Quản lý');
    if(row.closedAt)return this.status(user,id);
    const eligible=exceptionEligibility(row.case,this.clock());
    if(!eligible.allowed)throw createServiceError(eligible.reason,409);
    if(!row.exceptionReason||!row.contactProof?.id)throw createServiceError('Cần lưu lý do và chứng từ đã liên hệ.',409);
    const contact=await this.proofs.get(id,row.contactProof.id);
    if(contact.meta.sha256!==row.contactProof.sha256)throw createServiceError('Chứng từ liên hệ không khớp.',409);
    const money=await this.money(row);
    if(!money.state.ready)throw createServiceError(money.state.missing.join(' '),409);
    // D-038: this path never calls the chain or signs/accepts on behalf of the tenant.
    await this.close(row,'without-consent',money.proof,row.exceptionReason,contact.meta,user);
    return this.status(user,id);
  }
  async close(row,mode,proof,reason,contactProof,user) {
    let savedProof=null;
    if(proof){const {bytes,...meta}=proof;savedProof={...meta,...await this.proofs.save(row.contractId,bytes,meta.name,meta.mediaType)};}
    const c=row.case,latest=c?.versions?.at(-1),chainRecords={};
    if(c?.handover?.receipt)chainRecords.handover=c.handover;
    if(latest?.bundle?.receipt)chainRecords.settlement={...latest.bundle,dispute:latest.dispute||null,disputeReceipt:latest.disputeReceipt||null};
    const web2={notice:WEB2_NOTICE,contractId:row.contractId,settlementId:row.settlementId,mode,
      closedAt:new Date(this.clock()).toISOString(),refundDueVnd:String(row.refundDueVnd||0),topUpDueVnd:String(row.topUpDueVnd||0),
      paymentProofs:savedProof?[savedProof]:[],reason:reason||null,contactEvidence:contactProof||null};
    const bundle=createClosureEvidence(web2,chainRecords);
    const result=await this.repository.close(row,{mode,bundle,sourceDigest:closureDigest(this.repository.moneySnapshot(row)),actor:user?.maNguoiDung||null});
    await this.sendFinal(row.contractId).catch(()=>{});
    return {closed:true,...result};
  }
  async returnKeys(user,id) {
    const row=await this.context(user,id,'Quản lý');
    if(!row.returnId)throw createServiceError('Chưa có yêu cầu trả phòng hợp lệ.',409);
    // D-041: deliberately independent of consent, money and contract closure.
    await this.repository.returnKeys(row,user);
    return this.status(user,id);
  }
  async download(user,id) {
    const row=await this.context(user,id);
    if(!row.bundle)throw createServiceError('Chưa có gói bằng chứng kết thúc.',409);
    return row.bundle;
  }
  async sendFinal(id) {
    const claimed=await this.repository.claimMail(id);
    if(!claimed)return;
    let status='failed';
    try {status=(await this.notify('closure-final',claimed)).status||'skipped';}
    finally {await this.repository.finishMail(id,status);}
  }
}
