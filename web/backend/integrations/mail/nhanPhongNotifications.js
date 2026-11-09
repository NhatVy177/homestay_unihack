import { executeQuery, sql } from '../../database/connection.js';
import { sqlFirstCharges } from '../payment-sim/sql.js';
import { createMailer } from './mailer.js';

const param = (name, type, value) => ({ name, type, value });
const appOrigin = () => (process.env.AVALANCHE_APP_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
const money = amount => `${Number(amount).toLocaleString('vi-VN')} đ`;
const date = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : 'chưa xác định';
const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function loadResidence(id) {
  const result = await executeQuery(`SELECT hs.MaHoSoCuTru AS id, hs.MaNhanVienSale AS saleId,
      hs.NgayGuiDuyet AS reviewSentAt,
      hs.GhiChuQuanLy AS reason, pdc.MaPhieuDatCoc AS depositId,
      nd.HoTen AS customerName, nd.Email AS customerEmail, sale.Email AS saleEmail,
      (SELECT STRING_AGG(CONVERT(nvarchar(max), tv.HoTen + N': ' + COALESCE(tv.LyDoTuChoi,N'Chưa nêu lý do')), N'; ')
       FROM dbo.ThanhVienHopDong tv WHERE tv.MaHoSoCuTru=hs.MaHoSoCuTru AND tv.TrangThai=N'Bị từ chối') AS rejected
    FROM dbo.HoSoCuTru hs
    JOIN dbo.PhieuDatCoc pdc ON pdc.MaPhieuDatCoc=hs.MaPhieuDatCoc
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=pdc.MaKhachHang
    LEFT JOIN dbo.NguoiDung sale ON sale.MaNguoiDung=hs.MaNhanVienSale
    WHERE hs.MaHoSoCuTru=@id`, [param('id', sql.VarChar(6), id)]);
  return result.recordset[0] || null;
}

async function loadContract(id) {
  const result = await executeQuery(`SELECT hd.MaHopDong AS id, hd.NgayBatDau AS checkinDate,
      nd.Email AS customerEmail, nd.HoTen AS customerName,
      CASE WHEN EXISTS (SELECT 1 FROM dbo.HoaDon h WHERE h.MaHopDong=hd.MaHopDong
        AND h.KyThanhToan=CONVERT(char(7),hd.NgayBatDau,120) AND h.TrangThai=N'Đã TT') THEN 1 ELSE 0 END AS paid
    FROM dbo.HopDongThue hd JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=hd.MaKhachHang
    WHERE hd.MaHopDong=@id`, [param('id', sql.VarChar(6), id)]);
  return result.recordset[0] || null;
}

export async function branchManagers(kind, id, query = executeQuery) {
  const source = kind === 'residence-review'
    ? `dbo.HoSoCuTru hs JOIN dbo.PhieuDatCoc pdc ON pdc.MaPhieuDatCoc=hs.MaPhieuDatCoc
       JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=pdc.MaPhieuDatCoc`
    : `dbo.HopDongThue hd JOIN dbo.ChiTietDatCoc c ON c.MaPhieuDatCoc=hd.MaPhieuCoc`;
  const filter = kind === 'residence-review' ? 'hs.MaHoSoCuTru=@id' : 'hd.MaHopDong=@id';
  const result = await query(`SELECT DISTINCT n.MaNhanVien AS id, nd.Email AS email
    FROM ${source} JOIN dbo.Phong p ON p.MaPhong=c.MaPhong
    JOIN dbo.NhanVien n ON n.MaChiNhanh=p.MaChiNhanh AND n.ChucVu=N'Quản lý'
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=n.MaNhanVien WHERE ${filter}`,
  [param('id', sql.VarChar(6), id)]);
  return result.recordset;
}

async function claim(key) {
  const result = await executeQuery(`INSERT dbo.DepositMailEvent(EventKey,Status)
    SELECT @key,'Sending' WHERE NOT EXISTS
      (SELECT 1 FROM dbo.DepositMailEvent WITH (UPDLOCK,HOLDLOCK) WHERE EventKey=@key);
    SELECT @@ROWCOUNT AS claimed;`, [param('key', sql.VarChar(100), key)]);
  return result.recordset.at(-1)?.claimed === 1;
}
async function finish(key, status) {
  await executeQuery('UPDATE dbo.DepositMailEvent SET Status=@status WHERE EventKey=@key',
    [param('key', sql.VarChar(100), key), param('status', sql.VarChar(12), status)]);
}

export function createNhanPhongNotifier({ residence = loadResidence, contract = loadContract,
  managers = branchManagers, amount = id => sqlFirstCharges.amount(id), reserve = claim,
  mark = finish, mailer = createMailer(), origin = appOrigin(), log = console } = {}) {
  return async function notify(kind, id) {
    try {
      const row = kind === 'residence-review' || kind === 'member-rejected'
        ? await residence(id) : await contract(id);
      if (!row) return { status: 'skipped' };
      if (kind === 'member-rejected' && !row.rejected) return { status: 'skipped' };
      if (kind === 'first-charge-paid' && !row.paid) return { status: 'skipped' };
      if (kind === 'first-charge-reminder' && row.paid) return { status: 'skipped' };
      const link = `${origin}/khach-hang?tab=hop-dong&hopDong=${encodeURIComponent(id)}`;
      const managerLink = `${origin}/nhan-vien-quan-ly?tab=lap-bien-ban-ban-giao`;
      let subject, body, button;
      switch (kind) {
        case 'residence-review':
          subject = 'HomeStayDorm - Hồ sơ cư trú cần quản lý duyệt';
          body = `Hồ sơ ${id} của ${row.customerName} cần duyệt thủ công.\nLý do: ${row.reason || 'Có thông tin cần kiểm tra'}.\nMở tab Duyệt cư trú: ${origin}/nhan-vien-quan-ly?tab=duyet-cu-tru`;
          break;
        case 'member-rejected':
          subject = 'HomeStayDorm - Thành viên cư trú bị từ chối';
          body = `Hồ sơ ${id} có thành viên bị từ chối: ${row.rejected}.\nKhách có thể ký hợp đồng với các thành viên còn lại đủ điều kiện hoặc dừng đăng ký. Vui lòng liên hệ Sale để chọn phương án.`;
          break;
        case 'contract-created':
          subject = 'HomeStayDorm - Hợp đồng đã được lập';
          body = `Hợp đồng ${id} đã được lập. Ngày nhận phòng: ${date(row.checkinDate)}.\nKhoản thu kỳ đầu: ${money(await amount(id))}.\nXem trước hợp đồng: ${link}\nThanh toán ngay: ${link}`;
          button = { label: 'Thanh toán ngay', url: link };
          break;
        case 'first-charge-reminder':
          subject = 'HomeStayDorm - Nhắc thanh toán kỳ đầu';
          body = `Còn không quá một ngày tới lịch nhận phòng ${date(row.checkinDate)}. Hợp đồng ${id} chưa thanh toán kỳ đầu (${money(await amount(id))}).\nThanh toán ngay: ${link}`;
          button = { label: 'Thanh toán ngay', url: link };
          break;
        case 'first-charge-paid':
          subject = 'HomeStayDorm - Sẵn sàng bàn giao phòng';
          body = `Hợp đồng ${id} đã thanh toán kỳ đầu và sẵn sàng bàn giao phòng vào ${date(row.checkinDate)}. Xem hợp đồng: ${link}`;
          break;
        default: throw new Error(`Unknown check-in notification: ${kind}`);
      }
      const recipients = kind === 'residence-review' || kind === 'first-charge-paid'
        ? (kind === 'first-charge-paid' ? [{ role: 'customer', email: row.customerEmail }] : []).concat(
            (await managers(kind, id)).map(item => ({ role: `manager:${item.id}`, email: item.email })))
        : kind === 'member-rejected'
          ? [{ role: 'customer', email: row.customerEmail }, { role: `sale:${row.saleId}`, email: row.saleEmail }]
          : [{ role: 'customer', email: row.customerEmail }];
      const results = {};
      for (const recipient of recipients) {
        // A rejected residence dossier can be corrected and submitted again.
        // Its new NgayGuiDuyet creates a new event for both manager and member emails.
        const reviewAttempt = kind === 'residence-review' || kind === 'member-rejected'
          ? `:${row.reviewSentAt ? new Date(row.reviewSentAt).getTime() : 'legacy'}` : '';
        const key = `${kind}:${id}${reviewAttempt}:${recipient.role}`;
        if (!await reserve(key)) { results[recipient.role] = 'duplicate'; continue; }
        if (!recipient.email) { await mark(key, 'Skipped'); results[recipient.role] = 'skipped'; continue; }
        try {
          const recipientBody = kind === 'first-charge-paid' && recipient.role.startsWith('manager:')
            ? `Hợp đồng ${id} của ${row.customerName} đã thanh toán kỳ đầu, sẵn sàng bàn giao.\nMở tab Bàn giao phòng: ${managerLink}` : body;
          const html = button && recipient.role === 'customer'
            ? `<p>${htmlEscape(body).replace(/\n/g, '<br>')}</p><p><a href="${htmlEscape(button.url)}" style="padding:12px 18px;background:#2f6765;color:white;text-decoration:none">${button.label}</a></p>`
            : undefined;
          const sent = await mailer.send({ to: recipient.email, subject: recipient.role.startsWith('manager:') && kind === 'first-charge-paid'
            ? 'HomeStayDorm - Hợp đồng sẵn sàng bàn giao' : subject, text: recipientBody, html });
          await mark(key, sent.status === 'sent' ? 'Sent' : sent.status === 'logged' ? 'Logged' : 'Skipped');
          results[recipient.role] = sent.status;
        } catch (error) {
          await mark(key, 'Failed').catch(() => {});
          log.warn(`[checkin-mail] ${kind}/${id}/${recipient.role}: ${error.message}`);
          results[recipient.role] = 'failed';
        }
      }
      return { status: 'processed', ...results };
    } catch (error) {
      log.warn(`[checkin-mail] ${kind}/${id}: ${error.message}`);
      return { status: 'failed' };
    }
  };
}

export const notifyNhanPhong = createNhanPhongNotifier();
