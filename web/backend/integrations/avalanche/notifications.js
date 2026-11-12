// D-009/D-012 email texts. Emails only point the tenant to the logged-in contract page; they are
// never a signature, never carry a public read link, and contain no handover content beyond IDs.
const footer = 'Email này chỉ là thông báo. Hãy đăng nhập HomeStayDorm để xem, yêu cầu chỉnh sửa hoặc xác nhận; email không thay cho xác nhận của bạn.';
const json = value => JSON.stringify(value, null, 2) + '\n';
const evidence = (name, bundle) => ({ filename: name, content: json(bundle), contentType: 'application/json' });
const latest = c => c.versions[c.versions.length - 1];
const templates = {
  'handover-published': (c, link) => ({
    subject: `[HomeStayDorm] Biên bản bàn giao hợp đồng ${c.contractId} chờ bạn xác nhận`,
    text: `Nhân viên đã lập biên bản bàn giao phòng cho hợp đồng ${c.contractId}.\nVui lòng mở ${link}, kiểm tra tài sản và tình trạng phòng, rồi bấm "Xác nhận biên bản" hoặc "Yêu cầu chỉnh sửa".`,
  }),
  'handover-revised': (c, link) => ({
    subject: `[HomeStayDorm] Biên bản bàn giao ${c.contractId} đã được cập nhật`,
    text: `Quản lý đã phát hành bản ${c.drafts.length} của biên bản bàn giao theo yêu cầu của bạn.\nXem lại tại ${link}.`,
  }),
  reminder: (c, link) => ({
    subject: `[HomeStayDorm] Nhắc xác nhận hồ sơ hợp đồng ${c.contractId}`,
    text: `Hồ sơ của hợp đồng ${c.contractId} vẫn đang chờ bạn xem và xác nhận.\nMở ${link} khi bạn sẵn sàng.`,
  }),
  'handover-confirmed': c => ({
    subject: `[HomeStayDorm] Đã ghi nhận xác nhận biên bản bàn giao ${c.contractId}`,
    text: 'Cảm ơn bạn đã xác nhận biên bản bàn giao. Bản lưu hồ sơ được đính kèm; bạn có thể tự kiểm tra bất cứ lúc nào tại trang "Kiểm chứng hồ sơ".',
    attachments: [evidence(`ban-giao-${c.contractId}.json`, c.handover)],
  }),
  'settlement-published': (c, link) => ({
    subject: `[HomeStayDorm] Bảng đối soát tiền cọc ${c.contractId} chờ bạn xem`,
    text: `Kế toán đã lập bảng đối soát tiền cọc (phiên bản ${latest(c)?.bundle.version}).\nXem chi tiết và đồng ý hoặc phản hồi tại ${link}.`,
  }),
  'settlement-confirmed': c => ({
    subject: `[HomeStayDorm] Đã ghi nhận bạn đồng ý đối soát ${c.contractId}`,
    text: 'Bạn đã đồng ý bảng đối soát tiền cọc. Việc hoàn/thu tiền vẫn thực hiện theo quy trình thanh toán của HomeStayDorm. Bản lưu hồ sơ được đính kèm.',
    attachments: [evidence(`doi-soat-${c.contractId}-v${latest(c)?.bundle.version}.json`, latest(c)?.bundle)],
  }),
  'settlement-disputed': c => ({
    subject: `[HomeStayDorm] Đã ghi nhận phản hồi đối soát ${c.contractId}`,
    text: 'Phản hồi của bạn đã được ghi nhận. Kế toán sẽ xem xét và gửi phiên bản mới nếu có điều chỉnh. Bản lưu hồ sơ được đính kèm.',
    attachments: [evidence(`phan-hoi-${c.contractId}-v${latest(c)?.bundle.version}.json`, latest(c) && { ...latest(c).bundle, dispute: latest(c).dispute, disputeReceipt: latest(c).disputeReceipt })],
  }),
};
export function createNotifier({ mailer, contact, origin }) {
  const link = `${origin.replace(/\/$/, '')}/khach-hang?tab=hop-dong`;
  return async (kind, c) => {
    const template = templates[kind] || (kind.startsWith('reminder:') ? templates.reminder : null);
    if (!template) return { status: 'skipped' };
    const person = await contact(c.customerId);
    const { subject, text, attachments } = template(c, link);
    return mailer.send({ to: person?.email, subject, text: `Chào ${person?.name || 'bạn'},\n\n${text}\n\n${footer}\n`, attachments });
  };
}
