// Kiểm tra quyền xem từng hồ sơ: khách chỉ xem hồ sơ của mình, nhân viên chỉ xem hồ sơ của chi nhánh mình, Admin xem tất cả.
// Dùng cho các API đọc theo mã hợp đồng, phiếu cọc hoặc biên bản bàn giao (trước đây chỉ cần đăng nhập là xem được).
import { SqlStore } from '../integrations/avalanche/store.js';

const store = new SqlStore();
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const validId = value => typeof value === 'string' && /^[A-Za-z0-9]{1,12}$/.test(value);

const BRANCH_OF_SLIP = `(SELECT TOP (1) ph.MaChiNhanh FROM dbo.ChiTietDatCoc d JOIN dbo.Phong ph ON ph.MaPhong=d.MaPhong
  WHERE d.MaPhieuDatCoc=p.MaPhieuDatCoc)`;

const finders = {
  slip: id => store.query(`SELECT p.MaKhachHang AS customerId, ${BRANCH_OF_SLIP} AS branchId
    FROM dbo.PhieuDatCoc p WHERE p.MaPhieuDatCoc=@id`, { id }),
  contract: id => store.query(`SELECT p.MaKhachHang AS customerId, ${BRANCH_OF_SLIP} AS branchId
    FROM dbo.HopDongThue h JOIN dbo.PhieuDatCoc p ON p.MaPhieuDatCoc=h.MaPhieuCoc WHERE h.MaHopDong=@id`, { id }),
  handover: id => store.query(`SELECT p.MaKhachHang AS customerId, ${BRANCH_OF_SLIP} AS branchId
    FROM dbo.BienBanBanGiao b JOIN dbo.HopDongThue h ON h.MaHopDong=b.MaHopDong
    JOIN dbo.PhieuDatCoc p ON p.MaPhieuDatCoc=h.MaPhieuCoc WHERE b.MaBienBan=@id`, { id }),
};

export function mayAccess(user, row) {
  if (!user || !row) return false;
  if (user.vaiTro === 'KhachHang') return Boolean(row.customerId) && row.customerId === user.maNguoiDung;
  if (user.vaiTro === 'NhanVien') return user.chucVu === 'Admin' || (Boolean(user.maChiNhanh) && user.maChiNhanh === row.branchId);
  return false;
}

// kind: 'slip' | 'contract' | 'handover'; param: tên tham số trên đường dẫn.
export function guardRecord(kind, param) {
  return async (req, res, next) => {
    try {
      const id = req.params[param];
      if (!validId(id)) throw fail('Mã hồ sơ không hợp lệ.', 400);
      const row = (await finders[kind](id)).recordset[0];
      if (!row) throw fail('Không tìm thấy hồ sơ.', 404);
      if (!mayAccess(req.user, row)) throw fail('Hồ sơ không thuộc quyền truy cập của bạn.', 403);
      next();
    } catch (error) { next(error); }
  };
}

// Mã phiếu cọc mà người dùng được xem, dùng để lọc danh sách.
export async function allowedSlipIds(user) {
  if (user?.vaiTro === 'NhanVien' && user.chucVu === 'Admin') return null; // null = không giới hạn
  if (user?.vaiTro === 'KhachHang') {
    return new Set((await store.query('SELECT MaPhieuDatCoc AS id FROM dbo.PhieuDatCoc WHERE MaKhachHang=@u', { u: user.maNguoiDung })).recordset.map(r => r.id));
  }
  if (user?.vaiTro === 'NhanVien' && user.maChiNhanh) {
    return new Set((await store.query(`SELECT p.MaPhieuDatCoc AS id FROM dbo.PhieuDatCoc p WHERE ${BRANCH_OF_SLIP}=@b`, { b: user.maChiNhanh })).recordset.map(r => r.id));
  }
  return new Set();
}
