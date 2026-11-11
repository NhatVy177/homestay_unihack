import React from 'react';
import { money } from '../../lib/avalanche/api.js';
function saveAttachment(file) {
  const bytes = Uint8Array.from(atob(file.dataBase64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function HandoverView({ policy, handover }) {
  if (!handover) return null;
  const p = handover.payload, files = p.attachments || [];
  const terms = p.contractTerms;
  return <div className="xn-doc">
    <div className="xn-row"><span>Tiền cọc ghi nhận</span><strong>{money(p.depositHeldVnd)}</strong></div>
    {p.schema === 'homestaydorm.handover.v2' && terms && <section className="ui-evidence-panel" aria-label="Điều khoản hợp đồng">
      <h3>Điều khoản hợp đồng</h3>
      <dl className="ui-evidence-terms">
        <div><dt>Mã hợp đồng</dt><dd>{terms.contractId}</dd></div>
        <div><dt>Giá thuê</dt><dd>{money(terms.rentVnd)}</dd></div>
        <div><dt>Ngày bắt đầu</dt><dd>{terms.startDate}</dd></div>
        <div><dt>Ngày kết thúc</dt><dd>{terms.endDate}</dd></div>
        <div><dt>Kỳ thanh toán</dt><dd>{terms.paymentCycle}</dd></div>
        <div><dt>Tiền cọc theo phiếu</dt><dd>{money(terms.depositVnd)}</dd></div>
        <div><dt>Phiên bản chính sách</dt><dd>{p.policyVersion}</dd></div>
      </dl>
      {p.signedContract && <details><summary>Thông tin bản hợp đồng đã ký</summary>
        <p>{p.signedContract.name}</p>
        <p>Mã đối chiếu file: <code className="ui-evidence-hash">{p.signedContract.sha256}</code></p>
        <p>Bản lưu chỉ chứa mã đối chiếu; hợp đồng gốc được lưu riêng.</p>
      </details>}
    </section>}
    <table className="xn-table"><thead><tr><th>Tài sản</th><th>SL</th><th>Tình trạng lúc nhận phòng</th></tr></thead>
      <tbody>{p.inventory.map((item, i) => <tr key={i}><td>{item.item}</td><td>{item.quantity}</td><td>{item.condition}</td></tr>)}</tbody></table>
    {p.notes && <p className="xn-note"><strong>Ghi chú chung:</strong> {p.notes}</p>}
    {files.length > 0 && <div className="xn-files">
      {files.map((file, i) => <figure key={i}>
        {/^image\/(png|jpeg|webp)$/.test(file.mediaType) && <img alt={file.name} src={'data:' + file.mediaType + ';base64,' + file.dataBase64} />}
        <button type="button" className="xn-link" onClick={() => saveAttachment(file)}>Tải bản gốc: {file.name}</button>
      </figure>)}
    </div>}
    {policy && <details className="xn-policy"><summary>Chính sách hoàn cọc áp dụng</summary><p>{policy.payload.text}</p></details>}
  </div>;
}
export function SettlementView({ bundle }) {
  const p = bundle?.documents?.statement?.payload;
  if (!p) return null;
  return <div className="xn-doc">
    <table className="xn-table"><thead><tr><th>Khoản trừ vào tiền cọc</th><th className="xn-num">Số tiền</th></tr></thead>
      <tbody>{p.items.map((item, i) => <tr key={i}><td>{item.description}</td><td className="xn-num">{money(item.amountVnd)}</td></tr>)}</tbody></table>
    <div className="xn-row"><span>Tiền cọc</span><strong>{money(p.depositHeldVnd)}</strong></div>
    <div className="xn-row"><span>Tổng khấu trừ</span><strong>{money(p.deductionsVnd)}</strong></div>
    <div className="xn-row xn-total"><span>{Number(p.topUpDueVnd) > 0 ? 'Bạn cần thanh toán thêm' : 'Dự kiến hoàn lại'}</span>
      <strong>{money(Number(p.topUpDueVnd) > 0 ? p.topUpDueVnd : p.refundDueVnd)}</strong></div>
  </div>;
}
export function Pill({ label }) {
  if (!label) return null;
  return <span className={'xn-pill xn-' + label[1]}>{label[0]}</span>;
}
