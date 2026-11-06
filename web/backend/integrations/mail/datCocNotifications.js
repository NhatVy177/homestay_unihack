import { executeQuery, sql } from '../../database/connection.js';
import { getPaymentAccount } from '../../config/payment.js';
import { createMailer } from './mailer.js';

const v = (name, type, value) => ({ name, type, value });
const origin = () => (process.env.AVALANCHE_APP_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = n => `${Number(n || 0).toLocaleString('vi-VN')} đ`;
// SQL DATETIME stores Vietnam wall time; mssql exposes it as a Date tagged UTC.
const dateTime = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'UTC' }) : '—';

async function details(id) {
  const result = await executeQuery(`SELECT p.MaDangKy AS maDangKy,d.MaPhieuDatCoc AS maPhieuDatCoc,
    nd.HoTen AS khach,nd.Email AS emailKhach,nd.SDT AS sdt,
    s.HoTen AS sale,s.Email AS emailSale,COALESCE(y.MaPhong,ph.MaPhong) AS maPhong,
    COALESCE(d.HinhThucThue,y.HinhThucThue) AS hinhThucThue,
    y.DanhSachGiuong AS giuongYeuCau,y.GuiLuc AS guiLuc,d.SoTienCoc AS soTienCoc,
    d.ThoiHanThanhToan AS thoiHanThanhToan,
    (SELECT STRING_AGG(CONVERT(nvarchar(3),c2.MaGiuong),N', ')
      FROM dbo.ChiTietDatCoc c2 WHERE c2.MaPhieuDatCoc=d.MaPhieuDatCoc AND c2.MaGiuong IS NOT NULL) AS giuongs
    FROM dbo.PhieuDangKy p JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=p.MaKhachHang
    LEFT JOIN dbo.NguoiDung s ON s.MaNguoiDung=p.MaNhanVienSale
    LEFT JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
    LEFT JOIN dbo.PhieuDatCoc d ON d.MaPhieuYeuCauDangKy=p.MaDangKy AND d.MaPhieuDatCoc=@id
    OUTER APPLY (SELECT TOP (1) c.MaPhong FROM dbo.ChiTietXemPhong c
      WHERE c.MaDangKy=p.MaDangKy AND c.KhachChon IN (1,2) ORDER BY c.KhachChon) ph
    WHERE p.MaDangKy=@id OR d.MaPhieuDatCoc=@id`, [v('id', sql.VarChar(6), id)]);
  return result.recordset[0] || null;
}

export async function managers(id, query = executeQuery) {
  const result = await query(`SELECT n.MaNhanVien AS id,nd.Email AS email
    FROM dbo.PhieuDangKy p
    JOIN dbo.YeuCauDatCocChiTiet y ON y.MaDangKy=p.MaDangKy
    JOIN dbo.Phong ph ON ph.MaPhong=y.MaPhong
    JOIN dbo.NhanVien n ON n.MaChiNhanh=ph.MaChiNhanh AND n.ChucVu=N'Quản lý'
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=n.MaNhanVien
    WHERE p.MaDangKy=@id`, [v('id', sql.VarChar(6), id)]);
  return result.recordset;
}

async function claim(key) {
  const result = await executeQuery(`INSERT dbo.DepositMailEvent(EventKey,Status)
    SELECT @key,'Sending' WHERE NOT EXISTS
      (SELECT 1 FROM dbo.DepositMailEvent WITH (UPDLOCK,HOLDLOCK) WHERE EventKey=@key);
    SELECT @@ROWCOUNT AS claimed;`, [v('key', sql.VarChar(100), key)]);
  return result.recordset.at(-1)?.claimed === 1;
}
async function finish(key, status) {
  await executeQuery('UPDATE dbo.DepositMailEvent SET Status=@status WHERE EventKey=@key',
    [v('key', sql.VarChar(100), key), v('status', sql.VarChar(12), status)]);
}

export function createDepositNotifier({ load = details, loadManagers = managers, reserve = claim, mark = finish,
  mailer = createMailer(), appOrigin = origin(), bank = getPaymentAccount(), log = console } = {}) {
  return async function notify(kind, id, reason = '') {
    try {
      const row = await load(id);
      if (!row) return { status: 'skipped' };
      const eventId = ['request', 'manager-reminder', 'rejected'].includes(kind)
        ? `${id}:${row.guiLuc ? new Date(row.guiLuc).getTime() : 'legacy'}` : id;
      const paymentId = row.maPhieuDatCoc || id;
      const transfer = `${paymentId} ${row.sdt || ''}`.trim();
      const link = `${appOrigin.replace(/\/$/, '')}/khach-hang?tab=dat-coc&phieu=${encodeURIComponent(paymentId)}`;
      const summary = `Phiếu: ${paymentId}\nKhách: ${row.khach || '—'}\nPhòng/giường: ${row.maPhong || '—'}${row.giuongs ? ` / ${row.giuongs}` : ''}\nHình thức: ${row.hinhThucThue || '—'}\nTiền cọc: ${money(row.soTienCoc)}\nHạn thanh toán: ${dateTime(row.thoiHanThanhToan)}`;
      if (kind === 'request' || kind === 'manager-reminder') {
        const recipients = await loadManagers(id);
        const link = `${appOrigin.replace(/\/$/, '')}/nhan-vien-quan-ly?tab=xac-nhan-nhan-phong`;
        const subject = kind === 'request'
          ? 'HomeStayDorm - Yêu cầu đặt cọc chờ duyệt'
          : 'HomeStayDorm - Nhắc duyệt yêu cầu đặt cọc sau 8 giờ';
        const body = `Yêu cầu: ${row.maDangKy}\nKhách: ${row.khach || '—'}\nPhòng: ${row.maPhong || '—'}\nHình thức: ${row.hinhThucThue || '—'}\nGiường chọn: ${row.giuongYeuCau || 'Toàn phòng'}\nGửi lúc: ${dateTime(row.guiLuc)}\nMở tab Duyệt nhận cọc: ${link}`;
        const results = {};
        for (const manager of recipients) {
          const key = `${kind}:${eventId}:manager:${manager.id}`;
          if (!await reserve(key)) { results[manager.id] = 'duplicate'; continue; }
          if (!manager.email) { await mark(key, 'Skipped'); results[manager.id] = 'skipped'; continue; }
          try {
            const sent = await mailer.send({ to: manager.email, subject, text: body });
            await mark(key, sent.status === 'sent' ? 'Sent' : sent.status === 'logged' ? 'Logged' : 'Skipped');
            results[manager.id] = sent.status;
          } catch (error) {
            await mark(key, 'Failed').catch(() => {});
            log.warn(`[deposit-mail] ${kind}/manager/${id}: ${error.message}`);
            results[manager.id] = 'failed';
          }
        }
        return { status: 'processed', managers: results };
      }
      const subjects = {
        issued: 'HomeStayDorm - Phiếu đặt cọc đã được duyệt',
        rejected: 'HomeStayDorm - Yêu cầu đặt cọc cần xử lý lại',
        paid: 'HomeStayDorm - Đã nhận tiền đặt cọc',
        reminder: 'HomeStayDorm - Sắp hết hạn thanh toán cọc',
        expired: 'HomeStayDorm - Phiếu đặt cọc đã quá hạn',
      };
      const subject = subjects[kind];
      if (!subject) throw new Error('Unknown deposit notification');
      const account = `Ngân hàng: ${bank.nganHang}\nSố tài khoản: ${bank.soTaiKhoan}\nChủ tài khoản: ${bank.chuTaiKhoan}\nNội dung chuyển khoản: ${transfer}`;
      const body = kind === 'issued' ? `Yêu cầu cọc đã được duyệt và phiếu đã phát hành.\n${summary}`
        : kind === 'rejected' ? `Yêu cầu cọc chưa được chấp nhận. Lý do: ${reason || 'Phòng/giường không còn phù hợp'}. Sale sẽ liên hệ đề xuất phòng khác.\nMã hồ sơ: ${row.maDangKy}`
          : kind === 'paid' ? `HomeStayDorm đã ghi nhận thanh toán cọc thành công.\n${summary}`
            : kind === 'reminder' ? `Còn không quá 3 giờ để thanh toán phiếu cọc.\n${summary}`
              : `Phiếu cọc đã quá hạn 24 giờ và bị hủy.\n${summary}`;
      const results = {};
      for (const [role, email] of [['sale', row.emailSale], ['customer', row.emailKhach]]) {
        const key = `${kind}:${eventId}:${role}`;
        if (!await reserve(key)) { results[role] = 'duplicate'; continue; }
        if (!email) { await mark(key, 'Skipped'); results[role] = 'skipped'; continue; }
        let text = body;
        let html;
        if (kind === 'issued' && role === 'customer') {
          text += `\n\nThanh toán ngay: ${link}\n\nChuyển khoản:\n${account}\nHoặc trả tiền mặt tại quầy.`;
          html = `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;background:#2f6765;color:white;text-decoration:none;border-radius:6px">Thanh toán ngay</a></p><p>${escapeHtml(account).replace(/\n/g, '<br>')}</p><p>Hoặc trả tiền mặt tại quầy.</p>`;
        }
        try {
          const sent = await mailer.send({ to: email, subject, text, html });
          const status = sent.status === 'sent' ? 'Sent' : sent.status === 'logged' ? 'Logged' : 'Skipped';
          await mark(key, status);
          results[role] = sent.status;
        } catch (error) {
          await mark(key, 'Failed').catch(() => {});
          log.warn(`[deposit-mail] ${kind}/${role}/${id}: ${error.message}`);
          results[role] = 'failed';
        }
      }
      return { status: 'processed', ...results, khachThieuEmail: !row.emailKhach };
    } catch (error) {
      log.warn(`[deposit-mail] ${kind}/${id}: ${error.message}`);
      return { status: 'failed' };
    }
  };
}

export const notifyDeposit = createDepositNotifier();
