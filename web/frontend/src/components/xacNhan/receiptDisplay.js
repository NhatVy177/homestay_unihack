export const eventLabels = {
  HandoverProposed: 'Phát hành biên bản bàn giao',
  HandoverAccepted: 'Khách xác nhận biên bản bàn giao',
  SettlementProposed: 'Phát hành bảng đối soát',
  SettlementDisputed: 'Khách phản hồi bảng đối soát',
  SettlementAccepted: 'Khách đồng ý bảng đối soát',
};

export const emailNotice = (current, kind, sent, fallback) => {
  const latest = current?.notifications?.at(-1);
  return latest?.kind === kind && latest.status === 'sent' ? sent : fallback;
};

export function receiptTime(at) {
  if (!at) return '';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.hour}:${parts.minute}, ${parts.day}/${parts.month}/${parts.year}`;
}
