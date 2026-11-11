import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SqlStore } from '../integrations/avalanche/store.js';
import { layChiTietBienBanBanGiao } from '../repositories/banGiao.repository.js';

// C2 / D-030 (1): the move-out inspection shows the move-in condition next to the current one,
// and keeps the manager's photos privately with their SHA-256 (bound into evidence later, C3/C4).
const fail = (message, statusCode = 409) => { throw Object.assign(new Error(message), { statusCode }); };
const code = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9]{1,6}$/.test(value)) fail('Mã phiếu không hợp lệ.', 400);
  return value;
};
export const photoDirectory = fileURLToPath(new URL('../secrets/checkout-photos/', import.meta.url));
export const MAX_PHOTOS = 10;
const NORMAL = new Set(['', 'không có ghi chú', 'bình thường', 'tốt', 'mới', 'nguyên vẹn', 'đầy đủ']);

/** True when the move-in note records something other than a plain "OK" (an existing defect). */
export function ghiNhanHuHongLucVao(tinhTrang) {
  return !NORMAL.has(String(tinhTrang || '').trim().toLowerCase().replace(/[.!]+$/, ''));
}

export function photoExtension(file) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) fail('Chọn ảnh PNG, JPG hoặc WebP, tối đa 5 MB.', 400);
  if (file.mimetype === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (file.mimetype === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (file.mimetype === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp';
  fail('Ảnh phải là PNG, JPG hoặc WebP đúng định dạng.', 400);
}

export class SqlCheckoutRepository {
  constructor() { this.store = new SqlStore(); }
  query(text, values) { return this.store.query(text, values); }
  async phieu(maPhieuTra) {
    return (await this.query(`SELECT TOP (1) ptp.MaPhieuTra AS maPhieuTra, ptp.MaHopDong AS maHopDong, ptp.TrangThai AS trangThai,
        p.MaChiNhanh AS maChiNhanh
      FROM dbo.PhieuTraPhong ptp
      LEFT JOIN dbo.HopDongThue hdt ON hdt.MaHopDong = ptp.MaHopDong
      JOIN dbo.PhieuDatCoc pdc ON pdc.MaPhieuDatCoc = COALESCE(ptp.MaPhieuDatCoc, hdt.MaPhieuCoc)
      JOIN dbo.ChiTietDatCoc ctdc ON ctdc.MaPhieuDatCoc = pdc.MaPhieuDatCoc
      JOIN dbo.Phong p ON p.MaPhong = ctdc.MaPhong
      WHERE ptp.MaPhieuTra = @id`, { id: code(maPhieuTra) })).recordset[0];
  }
  async caseForContract(maHopDong) {
    const row = (await this.query('SELECT Data FROM dbo.AvalancheCase WHERE ContractId=@id', { id: code(maHopDong) })).recordset[0];
    return row ? JSON.parse(row.Data) : null;
  }
  async web2MoveIn(maHopDong) {
    const row = (await this.query(`SELECT TOP (1) MaBienBan AS maBienBan, NgayBanGiao AS ngay FROM dbo.BienBanBanGiao
      WHERE MaHopDong=@id AND LoaiBanGiao=N'Bàn giao vào' ORDER BY MaBienBan DESC`, { id: code(maHopDong) })).recordset[0];
    if (!row) return null;
    const detail = await layChiTietBienBanBanGiao(row.maBienBan);
    return { ...row, ghiChu: detail.bienBan?.GhiChuChung || '', taiSan: detail.taiSan };
  }
  async photos(maPhieuTra) {
    return (await this.query(`SELECT MaAnh AS maAnh, KeyTaiSan AS keyTaiSan, TenGoc AS tenGoc, StoredName AS storedName,
        MediaType AS mediaType, Sha256 AS sha256, UploadedAt AS uploadedAt
      FROM dbo.KiemTraTraPhongAnh WHERE MaPhieuTra=@id ORDER BY MaAnh`, { id: code(maPhieuTra) })).recordset;
  }
  async addPhoto(maPhieuTra, record, userId) {
    // Count and insert under one lock so two uploads cannot pass the limit together.
    return (await this.query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
      DECLARE @n int = (SELECT COUNT(*) FROM dbo.KiemTraTraPhongAnh WITH (UPDLOCK, HOLDLOCK) WHERE MaPhieuTra=@id);
      IF @n < @max
        INSERT dbo.KiemTraTraPhongAnh(MaPhieuTra,KeyTaiSan,TenGoc,StoredName,MediaType,Sha256,UploadedBy)
          OUTPUT inserted.MaAnh AS maAnh VALUES(@id,@keyTaiSan,@tenGoc,@storedName,@mediaType,@sha256,@userId);
      COMMIT TRANSACTION;`, { id: code(maPhieuTra), max: MAX_PHOTOS, ...record, userId })).recordset?.[0];
  }
  async removePhoto(maPhieuTra, maAnh) {
    return (await this.query(`DELETE FROM dbo.KiemTraTraPhongAnh OUTPUT deleted.StoredName AS storedName
      WHERE MaPhieuTra=@id AND MaAnh=@maAnh`, { id: code(maPhieuTra), maAnh })).recordset[0];
  }
}

function moveInFromCase(c) {
  if (c.handover?.documents?.handover?.payload) {
    const confirmed = Boolean(c.handover.confirmationReceipt);
    return { payload: c.handover.documents.handover.payload, revision: c.handover.revision, confirmed,
      confirmedAt: confirmed ? c.handover.confirmationReceipt.at || null : null };
  }
  const draft = c.drafts?.[c.drafts.length - 1];
  return draft?.handover?.payload ? { payload: draft.handover.payload, revision: draft.revision, confirmed: false, confirmedAt: null } : null;
}

export class CheckoutComparison {
  constructor({ repository = new SqlCheckoutRepository(), directory = photoDirectory } = {}) {
    this.repository = repository; this.directory = resolve(directory);
  }
  async access(user, maPhieuTra, { writable = false } = {}) {
    if (user?.vaiTro !== 'NhanVien' || user.chucVu !== 'Quản lý' || !user.maChiNhanh) fail('Chỉ quản lý chi nhánh được dùng chức năng này.', 403);
    const phieu = await this.repository.phieu(code(maPhieuTra));
    if (!phieu || phieu.maChiNhanh !== user.maChiNhanh) fail('Không tìm thấy phiếu trả phòng trong chi nhánh.', 404);
    if (!phieu.maHopDong) fail('Phiếu trả phòng này không thuộc hợp đồng thuê.', 400);
    if (writable && phieu.trangThai !== 'Chờ xử lý') fail('Phiếu đã lập biên bản kiểm tra, không đổi ảnh được nữa.');
    return phieu;
  }

  /** Move-in record for the contract: the version the tenant confirmed if any, else the latest draft, else Web2. */
  async moveIn(user, maPhieuTra) {
    const phieu = await this.access(user, maPhieuTra);
    const web2 = await this.repository.web2MoveIn(phieu.maHopDong);
    const maTheoTen = new Map((web2?.taiSan || []).map(t => [String(t.TenTaiSan || t.MaTaiSan), t.MaTaiSan]));
    const c = await this.repository.caseForContract(phieu.maHopDong);
    const signed = c && moveInFromCase(c);
    if (signed) {
      const { payload } = signed;
      return {
        nguon: 'xac-nhan-dien-tu', khachDaXacNhan: signed.confirmed, xacNhanLuc: signed.confirmedAt, phienBan: signed.revision,
        ghiChu: payload.notes || '',
        taiSan: (payload.inventory || []).map(i => ({ maTaiSan: maTheoTen.get(i.item) || null, ten: i.item, soLuong: i.quantity,
          tinhTrang: i.condition, coHuHongLucVao: ghiNhanHuHongLucVao(i.condition) })),
        anh: (payload.attachments || []).filter(a => /^image\/(png|jpeg|webp)$/.test(a.mediaType))
          .map(a => ({ ten: a.name, mediaType: a.mediaType, dataBase64: a.dataBase64 })),
      };
    }
    if (!web2) return { nguon: 'khong-co', khachDaXacNhan: false, taiSan: [], anh: [] };
    return {
      nguon: 'web2', khachDaXacNhan: false, xacNhanLuc: null, phienBan: null, ghiChu: web2.ghiChu,
      taiSan: web2.taiSan.map(t => ({ maTaiSan: t.MaTaiSan, ten: String(t.TenTaiSan || t.MaTaiSan), soLuong: Number(t.SoLuongThucTe),
        tinhTrang: String(t.GhiChu || 'Không có ghi chú'), coHuHongLucVao: ghiNhanHuHongLucVao(t.GhiChu) })),
      anh: [],
    };
  }

  path(name) {
    if (!/^tra-phong-[A-Za-z0-9]{1,6}-[0-9a-f-]{36}\.(png|jpg|webp)$/.test(name || '')) fail('Tên file ảnh không hợp lệ.');
    const target = resolve(this.directory, name);
    if (!target.startsWith(this.directory + sep)) fail('Đường dẫn ảnh không hợp lệ.');
    return target;
  }
  async photos(user, maPhieuTra) {
    await this.access(user, maPhieuTra);
    return (await this.repository.photos(maPhieuTra)).map(({ storedName, ...rest }) => rest);
  }
  async upload(user, maPhieuTra, file, keyTaiSan) {
    await this.access(user, maPhieuTra, { writable: true });
    const key = keyTaiSan ? String(keyTaiSan) : null;
    if (key && !/^[A-Za-z0-9_]{1,20}$/.test(key)) fail('Mã tài sản của ảnh không hợp lệ.', 400);
    const ext = photoExtension(file);
    const record = { keyTaiSan: key, tenGoc: String(file.originalname || `anh.${ext}`).slice(0, 200),
      storedName: `tra-phong-${maPhieuTra}-${randomUUID()}.${ext}`, mediaType: file.mimetype,
      sha256: createHash('sha256').update(file.buffer).digest('hex') };
    await mkdir(this.directory, { recursive: true });
    const target = this.path(record.storedName);
    await writeFile(target, file.buffer, { flag: 'wx', mode: 0o600 });
    let saved;
    try { saved = await this.repository.addPhoto(maPhieuTra, record, user.maNguoiDung); }
    catch (error) { await unlink(target).catch(() => {}); throw error; }
    if (!saved?.maAnh) { await unlink(target).catch(() => {}); fail(`Mỗi phiếu tối đa ${MAX_PHOTOS} ảnh.`); }
    const { storedName, ...rest } = record;
    return { maAnh: saved.maAnh, ...rest };
  }
  async remove(user, maPhieuTra, maAnh) {
    await this.access(user, maPhieuTra, { writable: true });
    const id = Number(maAnh);
    if (!Number.isSafeInteger(id) || id <= 0) fail('Mã ảnh không hợp lệ.', 400);
    const removed = await this.repository.removePhoto(maPhieuTra, id);
    if (!removed) fail('Không tìm thấy ảnh.', 404);
    await unlink(this.path(removed.storedName)).catch(() => {});
    return true;
  }
  async read(user, maPhieuTra, maAnh) {
    await this.access(user, maPhieuTra); // authorization before reading bytes
    const photo = (await this.repository.photos(maPhieuTra)).find(p => p.maAnh === Number(maAnh));
    if (!photo) fail('Không tìm thấy ảnh.', 404);
    let buffer;
    try { buffer = await readFile(this.path(photo.storedName)); }
    catch (error) { if (error.code === 'ENOENT') fail('Không tìm thấy file ảnh, cần kiểm tra lại.'); throw error; }
    if (createHash('sha256').update(buffer).digest('hex') !== photo.sha256) fail('File ảnh đã thay đổi so với lúc tải lên.');
    return { photo, buffer };
  }
}

export const checkoutComparison = new CheckoutComparison();
