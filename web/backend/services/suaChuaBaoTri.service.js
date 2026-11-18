import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeQuery, sql } from '../database/connection.js';
import { createServiceError } from './serviceErrors.js';

// Báo hỏng và sửa chữa trong thời gian thuê (bảng YeuCauSuaChua có sẵn). Khách báo kèm ảnh có ngày giờ; quản lý chi nhánh
// tiếp nhận, xử lý và ghi rõ "lỗi do khách" hay không. Lúc trả phòng, quản lý và kế toán xem lại lịch sử này theo hợp đồng để
// không tính lên khách những hư hỏng đã báo từ trước và không do khách gây ra.
// Hư hỏng do khách gây ra (D-065): khi quản lý chốt, chi phí sửa thành một khoản phí phát sinh "Đã xác nhận" (mã SC-<mã yêu cầu>)
// trong bảng PhiPhatSinh sẵn có, nên kế toán lập hóa đơn tháng kế tiếp sẽ tự cộng vào. Bảo trì thông thường thì chủ nhà chịu.
// Loại hư hỏng lưu ở đầu mô tả dạng "[Loại] mô tả" để không phải thêm cột.
// Không dùng thủ tục SQL (các SP_*YeuCauSuaChua mà bản cũ gọi chưa từng có trong cơ sở dữ liệu) và không đổi cấu trúc bảng.
const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads', 'sua-chua');
const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
export const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
export const STATUS = { NEW: 'Chờ tiếp nhận', DOING: 'Đang xử lý', DONE: 'Hoàn tất', REJECTED: 'Từ chối' };
export const LOAI = ['Điện, đèn, ổ cắm', 'Nước, vòi, bồn cầu', 'Máy lạnh, thiết bị', 'Cửa, khóa', 'Giường, tủ, nội thất', 'Internet, wifi', 'Khác'];
const feeId = (maYeuCau) => `SC-${maYeuCau}`;

const isCustomer = (user) => user?.vaiTro === 'KhachHang';
const isManager = (user) => user?.vaiTro === 'NhanVien' && user.chucVu === 'Quản lý' && Boolean(user.maChiNhanh);
const isStaff = (user) => user?.vaiTro === 'NhanVien' || user?.vaiTro === 'Admin';

const SELECT = `SELECT y.MaYeuCau AS maYeuCau, y.NgayYeuCau AS ngayYeuCau, y.MoTaHuHong AS moTa, y.HinhAnhMinhChung AS anh,
    y.TrangThai AS trangThai, y.NgayTiepNhan AS ngayTiepNhan, y.NgayHoanTat AS ngayHoanTat, y.ChiPhiSuaChua AS chiPhi,
    y.LoiDoKhachGayRa AS loiDoKhach, y.GhiChuXuLy AS ghiChu, y.MaHopDong AS maHopDong, y.MaPhong AS maPhong,
    ph.TenPhong AS tenPhong, ph.MaChiNhanh AS maChiNhanh, nd.HoTen AS hoTenKhach, nd.SDT AS sdtKhach,
    f.TrangThai AS trangThaiPhi, f.MaHoaDon AS maHoaDonPhi, hdon.KyThanhToan AS kyHoaDonPhi
  FROM dbo.YeuCauSuaChua y
  LEFT JOIN dbo.Phong ph ON ph.MaPhong = y.MaPhong
  LEFT JOIN dbo.HopDongThue h ON h.MaHopDong = y.MaHopDong
  LEFT JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = h.MaKhachHang
  LEFT JOIN dbo.PhiPhatSinh f ON f.MaPhi = 'SC-' + y.MaYeuCau
  LEFT JOIN dbo.HoaDon hdon ON hdon.MaHoaDon = f.MaHoaDon`;

export function toItem(row) {
  let anh = [];
  try { anh = row.anh ? JSON.parse(row.anh) : []; } catch { anh = []; }
  const match = /^\[([^\]]{1,40})\]\s*([\s\S]*)$/.exec(String(row.moTa || ''));
  return { ...row, loai: match ? match[1] : null, moTa: match ? match[2] : row.moTa, anh: Array.isArray(anh) ? anh : [],
    chiPhi: row.chiPhi == null ? null : Number(row.chiPhi), loiDoKhach: Boolean(row.loiDoKhach) };
}

export function parsePhoto(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw createServiceError('Ảnh phải là PNG, JPG hoặc WebP.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) throw createServiceError('Mỗi ảnh tối đa 1,5MB.');
  return { buffer, ext: IMAGE_TYPES[match[1]] };
}

async function nextId(query) {
  const row = (await query(`SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(MaYeuCau, 3, 4))), 0) + 1 AS n FROM dbo.YeuCauSuaChua WHERE MaYeuCau LIKE 'SC[0-9][0-9][0-9][0-9]'`)).recordset[0];
  if (row.n > 9999) throw createServiceError('Không thể sinh thêm mã yêu cầu sửa chữa.', 500);
  return `SC${String(row.n).padStart(4, '0')}`;
}

export async function savePhotos(maYeuCau, parsed) {
  if (!parsed.length) return [];
  await mkdir(UPLOAD_DIR, { recursive: true });
  const paths = [];
  const stamp = randomUUID();
  try {
    for (const [index, photo] of parsed.entries()) {
      const name = `${maYeuCau}-${stamp}-${index + 1}.${photo.ext}`;
      await writeFile(path.join(UPLOAD_DIR, name), photo.buffer, { flag: 'wx' });
      paths.push(`/uploads/sua-chua/${name}`);
    }
  } catch (error) {
    await removePhotos(paths);
    throw error;
  }
  return paths;
}

async function chiTiet(maYeuCau, { query }) {
  const row = (await query(`${SELECT} WHERE y.MaYeuCau = @Ma`, [{ name: 'Ma', type: sql.VarChar(6), value: maYeuCau }])).recordset[0];
  return row ? toItem(row) : null;
}

// Hợp đồng đang hiệu lực của khách (kèm phòng) để chọn khi báo hỏng.
export async function hopDongCuaKhach(user, { query = executeQuery } = {}) {
  if (!isCustomer(user)) throw createServiceError('Chỉ khách hàng mới báo hỏng được.', 403);
  const result = await query(`SELECT h.MaHopDong AS maHopDong, r.MaPhong AS maPhong, ph.TenPhong AS tenPhong
    FROM dbo.HopDongThue h
    OUTER APPLY (SELECT TOP 1 c.MaPhong FROM dbo.ChiTietDatCoc c WHERE c.MaPhieuDatCoc = h.MaPhieuCoc ORDER BY c.MaPhong) r
    LEFT JOIN dbo.Phong ph ON ph.MaPhong = r.MaPhong
    WHERE h.MaKhachHang = @Kh AND h.TrangThai = N'Hiệu lực' ORDER BY h.MaHopDong DESC`, [{ name: 'Kh', type: sql.VarChar(6), value: user.maNguoiDung }]);
  return result.recordset || [];
}

export async function taoYeuCau(user, data = {}, { query = executeQuery, save = savePhotos } = {}) {
  if (!isCustomer(user)) throw createServiceError('Chỉ khách hàng mới báo hỏng được.', 403);
  const moTa = String(data.moTa || '').trim();
  if (moTa.length < 5) throw createServiceError('Vui lòng mô tả hư hỏng (ít nhất 5 ký tự).');
  if (moTa.length > 1000) throw createServiceError('Mô tả tối đa 1000 ký tự.');
  const loai = String(data.loai || '').trim();
  if (!LOAI.includes(loai)) throw createServiceError('Vui lòng chọn loại hư hỏng.');
  const photos = Array.isArray(data.anh) ? data.anh : [];
  if (photos.length > MAX_PHOTOS) throw createServiceError(`Tối đa ${MAX_PHOTOS} ảnh.`);
  const parsed = photos.map(parsePhoto);
  const contracts = await hopDongCuaKhach(user, { query });
  const wanted = String(data.maHopDong || '').trim();
  const contract = wanted ? contracts.find((item) => item.maHopDong === wanted) : (contracts.length === 1 ? contracts[0] : null);
  if (!contract) throw createServiceError(contracts.length > 1 ? 'Vui lòng chọn hợp đồng cần báo hỏng.' : 'Bạn chưa có hợp đồng đang hiệu lực để báo hỏng.', contracts.length > 1 ? 400 : 404);
  const maYeuCau = await nextId(query);
  const anh = await save(maYeuCau, parsed);
  await query(`INSERT INTO dbo.YeuCauSuaChua (MaYeuCau, NgayYeuCau, MoTaHuHong, HinhAnhMinhChung, TrangThai, MaHopDong, MaPhong)
    VALUES (@Ma, CAST(SYSDATETIME() AS DATE), @MoTa, @Anh, N'${STATUS.NEW}', @Hd, @Phong)`, [
    { name: 'Ma', type: sql.VarChar(6), value: maYeuCau },
    { name: 'MoTa', type: sql.NVarChar(sql.MAX), value: `[${loai}] ${moTa}` },
    { name: 'Anh', type: sql.VarChar(500), value: anh.length ? JSON.stringify(anh) : null },
    { name: 'Hd', type: sql.VarChar(6), value: contract.maHopDong },
    { name: 'Phong', type: sql.VarChar(4), value: contract.maPhong || null },
  ]);
  return chiTiet(maYeuCau, { query });
}

export async function danhSach(user, { query = executeQuery } = {}) {
  if (isCustomer(user)) {
    const rows = (await query(`${SELECT} WHERE h.MaKhachHang = @Kh ORDER BY y.MaYeuCau DESC`, [{ name: 'Kh', type: sql.VarChar(6), value: user.maNguoiDung }])).recordset || [];
    return rows.map(toItem);
  }
  if (isManager(user)) {
    const rows = (await query(`${SELECT} WHERE ph.MaChiNhanh = @Cn ORDER BY CASE y.TrangThai WHEN N'${STATUS.NEW}' THEN 0 WHEN N'${STATUS.DOING}' THEN 1 ELSE 2 END, y.MaYeuCau DESC`,
      [{ name: 'Cn', type: sql.VarChar(6), value: user.maChiNhanh }])).recordset || [];
    return rows.map(toItem);
  }
  throw createServiceError('Bạn không có quyền xem danh sách này.', 403);
}

// Lịch sử báo hỏng của một hợp đồng: dùng lúc kiểm tra trả phòng và đối soát cọc.
export async function theoHopDong(user, maHopDong, { query = executeQuery } = {}) {
  const ma = String(maHopDong || '').trim();
  if (isCustomer(user)) {
    const own = (await query('SELECT 1 AS ok FROM dbo.HopDongThue WHERE MaHopDong = @Hd AND MaKhachHang = @Kh', [
      { name: 'Hd', type: sql.VarChar(6), value: ma }, { name: 'Kh', type: sql.VarChar(6), value: user.maNguoiDung }])).recordset[0];
    if (!own) throw createServiceError('Không tìm thấy hợp đồng.', 404);
  } else if (!isStaff(user)) throw createServiceError('Bạn không có quyền xem lịch sử này.', 403);
  const rows = (await query(`${SELECT} WHERE y.MaHopDong = @Hd ORDER BY y.MaYeuCau`, [{ name: 'Hd', type: sql.VarChar(6), value: ma }])).recordset || [];
  return rows.map(toItem);
}

async function forManager(user, maYeuCau, query) {
  if (!isManager(user)) throw createServiceError('Chức năng này chỉ dành cho quản lý chi nhánh.', 403);
  const item = await chiTiet(String(maYeuCau || '').trim(), { query });
  if (!item || item.maChiNhanh !== user.maChiNhanh) throw createServiceError('Không tìm thấy yêu cầu sửa chữa.', 404);
  return item;
}

export async function removePhotos(paths = []) {
  await Promise.all(paths.filter((p) => /^\/uploads\/sua-chua\/[A-Za-z0-9.-]+$/.test(p))
    .map((p) => unlink(path.join(UPLOAD_DIR, path.basename(p))).catch(() => {})));
}

// Khách sửa hoặc xóa báo hỏng của mình khi quản lý CHƯA tiếp nhận (D-067). Đã tiếp nhận thì nội dung giữ nguyên.
async function forOwner(user, maYeuCau, query) {
  if (!isCustomer(user)) throw createServiceError('Chỉ khách gửi báo hỏng mới sửa hoặc xóa được.', 403);
  const ma = String(maYeuCau || '').trim();
  const row = (await query(`${SELECT} WHERE y.MaYeuCau = @Ma AND h.MaKhachHang = @Kh`, [
    { name: 'Ma', type: sql.VarChar(6), value: ma }, { name: 'Kh', type: sql.VarChar(6), value: user.maNguoiDung },
  ])).recordset[0];
  const item = row ? toItem(row) : null;
  if (!item) throw createServiceError('Không tìm thấy báo hỏng.', 404);
  if (item.trangThai !== STATUS.NEW) throw createServiceError('Quản lý đã tiếp nhận báo hỏng này nên không sửa hoặc xóa được nữa.', 409);
  return { item, originalDescription: row.moTa, originalPhotos: row.anh };
}

// Recheck ownership, status and the snapshot in the write itself. A concurrent
// acceptance/edit must never report success or remove photos still used by SQL.
const OWNER_WRITE_GUARD = `MaYeuCau = @Ma AND TrangThai = N'${STATUS.NEW}'
  AND (MoTaHuHong = @OriginalDescription OR (MoTaHuHong IS NULL AND @OriginalDescription IS NULL))
  AND (HinhAnhMinhChung = @OriginalPhotos OR (HinhAnhMinhChung IS NULL AND @OriginalPhotos IS NULL))
  AND EXISTS (SELECT 1 FROM dbo.HopDongThue h WHERE h.MaHopDong = YeuCauSuaChua.MaHopDong AND h.MaKhachHang = @Kh)`;
function ownerWriteParams(user, snapshot) {
  return [
    { name: 'Ma', type: sql.VarChar(6), value: snapshot.item.maYeuCau },
    { name: 'Kh', type: sql.VarChar(6), value: user.maNguoiDung },
    { name: 'OriginalDescription', type: sql.NVarChar(sql.MAX), value: snapshot.originalDescription ?? null },
    { name: 'OriginalPhotos', type: sql.VarChar(500), value: snapshot.originalPhotos ?? null },
  ];
}
const ownerConflict = () => createServiceError('Báo hỏng đã được cập nhật hoặc tiếp nhận. Vui lòng tải lại để xem thông tin mới.', 409);

export async function capNhatYeuCau(user, maYeuCau, data = {}, { query = executeQuery, save = savePhotos, remove = removePhotos } = {}) {
  const snapshot = await forOwner(user, maYeuCau, query);
  const { item } = snapshot;
  const moTa = String(data.moTa || '').trim();
  if (moTa.length < 5) throw createServiceError('Vui lòng mô tả hư hỏng (ít nhất 5 ký tự).');
  if (moTa.length > 1000) throw createServiceError('Mô tả tối đa 1000 ký tự.');
  const loai = String(data.loai || '').trim();
  if (!LOAI.includes(loai)) throw createServiceError('Vui lòng chọn loại hư hỏng.');
  const keep = [...new Set((Array.isArray(data.giuAnh) ? data.giuAnh : item.anh).filter((p) => item.anh.includes(p)))];
  const added = (Array.isArray(data.anhMoi) ? data.anhMoi : []).map(parsePhoto);
  if (keep.length + added.length > MAX_PHOTOS) throw createServiceError(`Tối đa ${MAX_PHOTOS} ảnh.`);
  const savedNew = await save(item.maYeuCau, added);
  const anh = [...keep, ...savedNew];
  let writeRejected = false;
  try {
    const result = await query(`DECLARE @Changed TABLE (maYeuCau VARCHAR(6));
      UPDATE dbo.YeuCauSuaChua SET MoTaHuHong = @MoTa, HinhAnhMinhChung = @Anh
      OUTPUT inserted.MaYeuCau INTO @Changed WHERE ${OWNER_WRITE_GUARD};
      SELECT maYeuCau FROM @Changed;`, [
      { name: 'MoTa', type: sql.NVarChar(sql.MAX), value: `[${loai}] ${moTa}` },
      { name: 'Anh', type: sql.VarChar(500), value: anh.length ? JSON.stringify(anh) : null },
      ...ownerWriteParams(user, snapshot),
    ]);
    if (!result.recordset?.length) { writeRejected = true; throw ownerConflict(); }
  } catch (error) {
    // A dropped SQL connection can hide a committed update. Only remove new files
    // when a rejected write or a fresh read proves they are not used by the row.
    try {
      const current = writeRejected ? null : await chiTiet(item.maYeuCau, { query });
      await remove(savedNew.filter(photo => !current?.anh.includes(photo)));
    } catch { /* Keep files if the database cannot confirm their use. */ }
    throw error;
  }
  await remove(item.anh.filter((p) => !keep.includes(p)));
  return chiTiet(item.maYeuCau, { query });
}

export async function xoaYeuCau(user, maYeuCau, { query = executeQuery, remove = removePhotos } = {}) {
  const snapshot = await forOwner(user, maYeuCau, query);
  const { item } = snapshot;
  const result = await query(`DECLARE @Changed TABLE (maYeuCau VARCHAR(6));
    DELETE FROM dbo.YeuCauSuaChua OUTPUT deleted.MaYeuCau INTO @Changed WHERE ${OWNER_WRITE_GUARD};
    SELECT maYeuCau FROM @Changed;`, ownerWriteParams(user, snapshot));
  if (!result.recordset?.length) throw ownerConflict();
  await remove(item.anh);
  return { maYeuCau: item.maYeuCau, daXoa: true };
}

export async function tiepNhan(user, maYeuCau, data = {}, { query = executeQuery } = {}) {
  const item = await forManager(user, maYeuCau, query);
  if (item.trangThai !== STATUS.NEW) throw createServiceError('Yêu cầu này đã được tiếp nhận hoặc đã xử lý.', 409);
  await query(`UPDATE dbo.YeuCauSuaChua SET TrangThai = N'${STATUS.DOING}', NgayTiepNhan = CAST(SYSDATETIME() AS DATE), MaNhanVienQuanLy = @Nv,
      GhiChuXuLy = COALESCE(@GhiChu, GhiChuXuLy) WHERE MaYeuCau = @Ma AND TrangThai = N'${STATUS.NEW}'`, [
    { name: 'Nv', type: sql.VarChar(6), value: user.maNguoiDung },
    { name: 'GhiChu', type: sql.NVarChar(sql.MAX), value: String(data.ghiChu || '').trim() || null },
    { name: 'Ma', type: sql.VarChar(6), value: item.maYeuCau },
  ]);
  const updated = await chiTiet(item.maYeuCau, { query });
  if (!updated) throw createServiceError('Báo hỏng đã được xóa. Vui lòng tải lại danh sách.', 409);
  return updated;
}

export async function hoanTat(user, maYeuCau, data = {}, { query = executeQuery } = {}) {
  const item = await forManager(user, maYeuCau, query);
  if (item.trangThai !== STATUS.DOING) throw createServiceError('Chỉ hoàn tất được yêu cầu đang xử lý.', 409);
  const chiPhi = Number(data.chiPhi ?? 0);
  if (!Number.isFinite(chiPhi) || chiPhi < 0 || chiPhi > 1e9) throw createServiceError('Chi phí sửa chữa không hợp lệ.');
  const loiDoKhach = Boolean(data.loiDoKhach);
  const ghiChu = String(data.ghiChu || '').trim();
  if (loiDoKhach && !ghiChu) throw createServiceError('Ghi rõ lý do khi xác định hư hỏng do khách gây ra.');
  if (loiDoKhach && !(chiPhi > 0)) throw createServiceError('Nhập chi phí sửa để tính vào hóa đơn của khách.');
  if (loiDoKhach && !Number.isSafeInteger(chiPhi)) throw createServiceError('Chi phí sửa phải là số nguyên (đồng).');
  const tenPhi = `Sửa chữa ${item.maYeuCau}${item.loai ? ` (${item.loai})` : ''}: ${item.moTa}`.slice(0, 200);
  await query(`SET XACT_ABORT ON;
BEGIN TRAN;
UPDATE dbo.YeuCauSuaChua SET TrangThai = N'${STATUS.DONE}', NgayHoanTat = CAST(SYSDATETIME() AS DATE), ChiPhiSuaChua = @ChiPhi,
  LoiDoKhachGayRa = @Loi, GhiChuXuLy = COALESCE(@GhiChu, GhiChuXuLy) WHERE MaYeuCau = @Ma AND TrangThai = N'${STATUS.DOING}';
IF @@ROWCOUNT = 1 AND @Loi = 1 AND NOT EXISTS (SELECT 1 FROM dbo.PhiPhatSinh WITH (UPDLOCK, HOLDLOCK) WHERE MaPhi = @MaPhi)
  INSERT dbo.PhiPhatSinh (MaPhi, MaHopDong, TenPhi, SoTien, TrangThai, NgayGhiNhan, MaNhanVien)
  VALUES (@MaPhi, @Hd, @TenPhi, @ChiPhi, N'Đã xác nhận', CAST(SYSDATETIME() AS DATE), @Nv);
COMMIT;`, [
    { name: 'ChiPhi', type: sql.Decimal(18, 2), value: chiPhi },
    { name: 'Loi', type: sql.Bit, value: loiDoKhach },
    { name: 'GhiChu', type: sql.NVarChar(sql.MAX), value: ghiChu || null },
    { name: 'Ma', type: sql.VarChar(6), value: item.maYeuCau },
    { name: 'MaPhi', type: sql.VarChar(20), value: feeId(item.maYeuCau) },
    { name: 'Hd', type: sql.VarChar(6), value: item.maHopDong },
    { name: 'TenPhi', type: sql.NVarChar(200), value: tenPhi },
    { name: 'Nv', type: sql.VarChar(6), value: user.maNguoiDung },
  ]);
  return chiTiet(item.maYeuCau, { query });
}

export async function tuChoi(user, maYeuCau, data = {}, { query = executeQuery } = {}) {
  const item = await forManager(user, maYeuCau, query);
  if (![STATUS.NEW, STATUS.DOING].includes(item.trangThai)) throw createServiceError('Yêu cầu này đã đóng.', 409);
  const lyDo = String(data.lyDo || '').trim();
  if (!lyDo) throw createServiceError('Vui lòng ghi lý do từ chối.');
  await query(`UPDATE dbo.YeuCauSuaChua SET TrangThai = N'${STATUS.REJECTED}', GhiChuXuLy = @LyDo WHERE MaYeuCau = @Ma`, [
    { name: 'LyDo', type: sql.NVarChar(sql.MAX), value: lyDo },
    { name: 'Ma', type: sql.VarChar(6), value: item.maYeuCau },
  ]);
  return chiTiet(item.maYeuCau, { query });
}
