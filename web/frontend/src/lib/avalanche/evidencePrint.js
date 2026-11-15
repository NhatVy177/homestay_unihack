// Bản dễ đọc của gói bằng chứng bàn giao (chỉ để người đọc/in PDF).
// File JSON mới là bản dùng để kiểm chứng mã băm trên chuỗi; PDF không thay thế nó.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} VNĐ`;
const day = (value) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—');
const dateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};
const short = (hex) => (hex && hex.length > 20 ? `${hex.slice(0, 10)}…${hex.slice(-8)}` : hex || '—');
const NETWORKS = { 43113: { name: 'Avalanche Fuji (mạng thử nghiệm)', explorer: 'https://testnet.snowtrace.io' }, 43114: { name: 'Avalanche C-Chain', explorer: 'https://snowtrace.io' } };

export function buildHandoverEvidenceHtml(bundle) {
  if (!bundle || bundle.kind !== 'handover' || !bundle.documents?.handover?.payload) throw new Error('Chỉ in được biên bản bàn giao.');
  const payload = bundle.documents.handover.payload;
  const policy = bundle.documents.policy?.payload || {};
  const terms = payload.contractTerms || {};
  const network = NETWORKS[bundle.deployment?.chainId] || { name: `Chuỗi ${bundle.deployment?.chainId}`, explorer: '' };
  const contractId = terms.contractId || '';
  const tx = (label, receipt) => receipt?.hash ? `<tr><th>${esc(label)}</th><td>${esc(dateTime(receipt.at))}<br>
      ${network.explorer ? `<a href="${esc(network.explorer)}/tx/${esc(receipt.hash)}">${esc(short(receipt.hash))}</a>` : esc(short(receipt.hash))}
      · khối ${esc(receipt.blockNumber)}</td></tr>` : '';
  const rows = (payload.inventory || []).map((line, index) => `<tr><td>${index + 1}</td><td>${esc(line.item)}</td><td>${esc(line.quantity)}</td><td>${esc(line.condition)}</td></tr>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>ban-giao-${esc(contractId)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2a24; font-size: 13px; line-height: 1.5; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #3a5a45; }
  h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #d7ddd2; color: #3a5a45; }
  p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border: 1px solid #d7ddd2; vertical-align: top; }
  th { background: #f1f3ee; width: 34%; font-weight: 600; }
  table.list th { width: auto; }
  .muted { color: #5d6b62; font-size: 12px; }
  .policy { white-space: pre-wrap; background: #f7f8f5; border: 1px solid #d7ddd2; padding: 10px 12px; border-radius: 6px; }
  .note { margin-top: 22px; padding: 10px 12px; border: 1px dashed #8fa395; border-radius: 6px; font-size: 12px; }
  .hash { font-family: Consolas, monospace; word-break: break-all; font-size: 11px; }
  a { color: #1d5a8a; word-break: break-all; }
</style></head><body>
<h1>Biên bản bàn giao phòng</h1>
<p class="muted">Hợp đồng ${esc(contractId)} · bản số ${esc(bundle.revision ?? payload.revision)} · HomeStayDorm</p>

<h2>Thông tin hợp đồng</h2>
<table>
  <tr><th>Mã hợp đồng</th><td>${esc(contractId)}</td></tr>
  <tr><th>Giá thuê</th><td>${esc(money(terms.rentVnd))} / tháng · thanh toán ${esc(terms.paymentCycle || '—')}</td></tr>
  <tr><th>Thời hạn</th><td>${esc(day(terms.startDate))} đến ${esc(day(terms.endDate))}</td></tr>
  <tr><th>Tiền cọc đang giữ</th><td>${esc(money(payload.depositHeldVnd ?? terms.depositVnd))}</td></tr>
</table>

<h2>Tài sản và tình trạng lúc bàn giao</h2>
<table class="list"><thead><tr><th style="width:36px">#</th><th>Tài sản</th><th style="width:70px">Số lượng</th><th>Tình trạng</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="4">Không có tài sản nào được ghi.</td></tr>'}</tbody></table>
${payload.notes ? `<p><strong>Ghi chú:</strong> ${esc(payload.notes)}</p>` : ''}
${payload.attachments?.length ? `<p class="muted">Đính kèm: ${payload.attachments.length} tệp ảnh (mã băm nằm trong gói bằng chứng).</p>` : ''}

<h2>Chính sách hoàn cọc áp dụng (phiên bản ${esc(policy.version || payload.policyVersion || '—')})</h2>
<div class="policy">${esc(policy.text || 'Không có nội dung.')}</div>

<h2>Hợp đồng giấy đã ký</h2>
<table>
  <tr><th>Tệp</th><td>${esc(payload.signedContract?.name || '—')}</td></tr>
  <tr><th>Mã băm SHA-256 của tệp</th><td class="hash">${esc(payload.signedContract?.sha256 || '—')}</td></tr>
</table>
<p class="muted">Bản gốc hợp đồng được lưu riêng, không nằm trong gói này; mã băm cho phép kiểm tra tệp chưa bị sửa.</p>

<h2>Xác nhận điện tử trên Avalanche</h2>
<table>
  <tr><th>Mạng</th><td>${esc(network.name)}</td></tr>
  <tr><th>Hợp đồng thông minh</th><td class="hash">${esc(bundle.deployment?.address || '—')}</td></tr>
  <tr><th>Ví của khách thuê</th><td class="hash">${esc(payload.tenant || '—')}</td></tr>
  <tr><th>Mã hồ sơ</th><td class="hash">${esc(bundle.agreementId || '—')}</td></tr>
  ${tx('Quản lý phát hành biên bản', bundle.receipt)}
  ${tx('Khách xác nhận biên bản', bundle.confirmationReceipt)}
</table>

<div class="note"><strong>Bản này chỉ để đọc và lưu trữ.</strong> Để kiểm chứng biên bản chưa bị sửa, hãy dùng file <strong>ban-giao-${esc(contractId)}.json</strong>
  (nút "File kiểm chứng (.json)") và đưa vào trang "Kiểm tra biên bản" của HomeStayDorm. In lúc ${esc(dateTime(new Date()))}.</div>
</body></html>`;
}

// Mở cửa sổ in; khách chọn "Lưu dưới dạng PDF". Trả false nếu trình duyệt chặn cửa sổ mới.
export function printHandoverEvidence(bundle) {
  const html = buildHandoverEvidenceHtml(bundle);
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}

// Bản dễ đọc của bảng đối soát tiền cọc (mốc 2) để khách lưu PDF. File JSON vẫn là bản dùng để kiểm chứng.
export function buildSettlementEvidenceHtml(bundle, contractId = '') {
  const p = bundle?.documents?.statement?.payload;
  if (!p) throw new Error('Chưa có bảng đối soát để in.');
  const network = NETWORKS[bundle.deployment?.chainId] || { name: `Chuỗi ${bundle.deployment?.chainId}`, explorer: '' };
  const tx = (label, receipt) => receipt?.hash ? `<tr><th>${esc(label)}</th><td>${esc(dateTime(receipt.at))}<br>
      ${network.explorer ? `<a href="${esc(network.explorer)}/tx/${esc(receipt.hash)}">${esc(short(receipt.hash))}</a>` : esc(short(receipt.hash))}</td></tr>` : '';
  const rows = (p.items || []).map((item, i) => `<tr><td>${i + 1}</td><td>${esc(item.description)}</td><td class="num">${esc(money(item.amountVnd))}</td></tr>`).join('');
  const topUp = Number(p.topUpDueVnd) > 0;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>doi-soat-${esc(contractId)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2a24; font-size: 13px; line-height: 1.5; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #3a5a45; }
  h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #d7ddd2; color: #3a5a45; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border: 1px solid #d7ddd2; vertical-align: top; }
  th { background: #f1f3ee; font-weight: 600; }
  .num { text-align: right; white-space: nowrap; }
  .muted { color: #5d6b62; font-size: 12px; }
  .total td { font-weight: 700; font-size: 15px; color: #3a5a45; }
  a { color: #1d5a8a; word-break: break-all; }
</style></head><body>
<h1>Bảng đối soát tiền cọc khi trả phòng</h1>
<p class="muted">Hợp đồng ${esc(contractId)} · phiên bản ${esc(bundle.version ?? '')} · HomeStayDorm</p>
<h2>Các khoản trừ vào tiền cọc</h2>
<table><thead><tr><th style="width:36px">#</th><th>Khoản</th><th class="num">Số tiền</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Không có khoản trừ.</td></tr>'}</tbody></table>
<h2>Kết quả</h2>
<table>
  <tr><td>Tiền cọc đang giữ</td><td class="num">${esc(money(p.depositHeldVnd))}</td></tr>
  <tr><td>Tổng khấu trừ</td><td class="num">${esc(money(p.deductionsVnd))}</td></tr>
  <tr class="total"><td>${topUp ? 'Khách cần thanh toán thêm' : 'Khách được hoàn lại'}</td><td class="num">${esc(money(topUp ? p.topUpDueVnd : p.refundDueVnd))}</td></tr>
</table>
<h2>Xác nhận điện tử</h2>
<table><tr><th>Mạng</th><td>${esc(network.name)}</td></tr>${tx('Kế toán gửi bảng đối soát', bundle.receipt)}${tx('Khách đồng ý bảng đối soát', bundle.confirmationReceipt)}</table>
<p class="muted">Đồng ý đối soát không có nghĩa là đã nhận tiền; việc hoàn/thu tiền thực hiện theo quy trình thanh toán của HomeStayDorm. In lúc ${esc(dateTime(new Date()))}.</p>
</body></html>`;
}

export function printSettlementEvidence(bundle, contractId) {
  const html = buildSettlementEvidenceHtml(bundle, contractId);
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open(); win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
