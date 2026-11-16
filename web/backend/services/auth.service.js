import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { executeProcedure, executeQuery, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';
import { googleClientId, verifyGoogleIdToken } from './googleAuth.js';

function getAuthSecret() {
  return process.env.AUTH_SECRET || 'happyroom-auth-secret';
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getAuthSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyToken(token) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', getAuthSecret()).update(body).digest();
  const actualSignature = Buffer.from(signature, 'base64url');
  if (expectedSignature.length !== actualSignature.length) {
    return null;
  }

  if (!timingSafeEqual(expectedSignature, actualSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function toUser(record) {
  const user = {
    id: record.maNguoiDung,
    maNguoiDung: record.maNguoiDung,
    tenDangNhap: record.tenDangNhap,
    hoTen: record.hoTen,
    ngaySinh: record.ngaySinh,
    gioiTinh: record.gioiTinh,
    email: record.email,
    soDienThoai: record.soDienThoai,
    vaiTro: record.vaiTro,
    trangThai: record.trangThai,
    chucVu: record.chucVu || null,
    maChiNhanh: record.maChiNhanh || null,
    quocTich: record.quocTich || null,
    cccd: record.cccd || null
  };

  return {
    token: signToken({
      maNguoiDung: user.maNguoiDung,
      tenDangNhap: user.tenDangNhap,
      hoTen: user.hoTen,
      ngaySinh: user.ngaySinh,
      gioiTinh: user.gioiTinh,
      email: user.email,
      soDienThoai: user.soDienThoai,
      vaiTro: user.vaiTro,
      trangThai: user.trangThai,
      chucVu: user.chucVu,
      maChiNhanh: user.maChiNhanh,
      quocTich: user.quocTich,
      cccd: user.cccd,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    }),
    user
  };
}

function handleDatabaseError(error) {
  mapDatabaseError(error, {
    50001: 400,
    50002: 409,
    50003: 400,
    50004: 401,
    50005: 401,
    50006: 409
  });
}

export async function dangKy(data = {}) {
  const tenDangNhap = String(data.tenDangNhap || '').trim();
  const matKhau = String(data.matKhau || '');
  const xacNhanMatKhau = String(data.xacNhanMatKhau || '');
  const hoTen = String(data.hoTen || '').trim();
  const ngaySinh = data.ngaySinh || null;
  const gioiTinh = String(data.gioiTinh || '').trim();
  const soDienThoai = String(data.soDienThoai || '').trim();
  const email = String(data.email || '').trim();

  if (!tenDangNhap || !matKhau || !xacNhanMatKhau || !hoTen || !ngaySinh || !gioiTinh || !soDienThoai || !email) {
    throw createServiceError('Vui long nhap day du cac thong tin bat buoc');
  }

  // D-016: email nhận mã xác nhận và thông báo biên bản.
  if (email.length > 100 || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) {
    throw createServiceError('Email không hợp lệ.');
  }

  if (matKhau !== xacNhanMatKhau) {
    throw createServiceError('Mat khau xac nhan khong khop');
  }

  if (!['Nam', 'Nữ'].includes(gioiTinh)) {
    throw createServiceError('Gioi tinh khong hop le');
  }

  if (!/^\d{10}$/.test(soDienThoai)) {
    throw createServiceError('Số điện thoại phải có đúng 10 chữ số.');
  }

  try {
    const result = await executeProcedure('dbo.SP_DangKy', [
      { name: 'TenDangNhap', type: sql.VarChar(50), value: tenDangNhap },
      { name: 'MatKhau', type: sql.VarChar(255), value: matKhau },
      { name: 'HoTen', type: sql.NVarChar(100), value: hoTen },
      { name: 'NgaySinh', type: sql.Date, value: ngaySinh },
      { name: 'GioiTinh', type: sql.NVarChar(5), value: gioiTinh },
      { name: 'SDT', type: sql.VarChar(20), value: soDienThoai },
      { name: 'Email', type: sql.VarChar(100), value: email }
    ]);

    const record = result.recordset[0];
    return record ? toUser(record) : null;
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function kiemTraSoDienThoai(value) {
  const soDienThoai = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (!/^\d{10}$/.test(soDienThoai)) {
    throw createServiceError('Số điện thoại phải có đúng 10 chữ số.');
  }

  const result = await executeQuery(`
    SELECT TOP (1)
      nd.MaNguoiDung AS maKhachHang,
      nd.HoTen AS hoTen,
      CAST(CASE WHEN tk.MaNguoiDung IS NOT NULL THEN 1 ELSE 0 END AS bit) AS daCoTaiKhoan,
      (SELECT COUNT(*) FROM dbo.PhieuDangKy pdk WHERE pdk.MaKhachHang = nd.MaNguoiDung) AS soPhieuDangKy
    FROM dbo.NguoiDung nd
    INNER JOIN dbo.KhachHang kh ON kh.MaKhachHang = nd.MaNguoiDung
    LEFT JOIN dbo.TaiKhoan tk ON tk.MaNguoiDung = nd.MaNguoiDung
    WHERE nd.SDT = @SDT
      AND nd.LoaiNguoiDung = 'KhachHang'
  `, [
    { name: 'SDT', type: sql.VarChar(20), value: soDienThoai }
  ]);
  const customer = result.recordset[0] || null;

  return {
    tonTaiKhachHang: Boolean(customer),
    daCoTaiKhoan: Boolean(customer?.daCoTaiKhoan),
    maKhachHang: customer?.maKhachHang || null,
    hoTen: customer?.hoTen || null,
    soPhieuDangKy: Number(customer?.soPhieuDangKy || 0),
    seLienKetDuLieu: Boolean(customer && !customer.daCoTaiKhoan),
    thongBao: customer?.daCoTaiKhoan
      ? 'Số điện thoại này đã được liên kết với một tài khoản.'
      : customer
        ? `Đã tìm thấy khách hàng${customer.soPhieuDangKy ? ` và ${customer.soPhieuDangKy} phiếu đăng ký` : ''}. Dữ liệu cũ sẽ được liên kết sau khi tạo tài khoản.`
        : null
  };
}

export async function dangNhap(data = {}) {
  const tenDangNhap = String(data.tenDangNhap || '').trim();
  const matKhau = String(data.matKhau || '');

  if (!tenDangNhap || !matKhau) {
    throw createServiceError('Vui long nhap ten dang nhap va mat khau');
  }

  try {
    const result = await executeProcedure('dbo.SP_DangNhap', [
      { name: 'TenDangNhap', type: sql.VarChar(50), value: tenDangNhap },
      { name: 'MatKhau', type: sql.VarChar(255), value: matKhau }
    ]);

    const record = result.recordset[0];
    return record ? toUser(record) : null;
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function getSessionUser(token) {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  return {
    token,
    id: payload.maNguoiDung,
    maNguoiDung: payload.maNguoiDung,
    tenDangNhap: payload.tenDangNhap,
    hoTen: payload.hoTen,
    ngaySinh: payload.ngaySinh,
    gioiTinh: payload.gioiTinh,
    email: payload.email,
    soDienThoai: payload.soDienThoai,
    vaiTro: payload.vaiTro,
    trangThai: payload.trangThai,
    chucVu: payload.chucVu || null,
    maChiNhanh: payload.maChiNhanh || null,
    quocTich: payload.quocTich || null,
    cccd: payload.cccd || null
  };
}

export async function dangXuat(token) {
  return token;
}

// ---- Đăng nhập / đăng ký bằng tài khoản Google (email Google làm danh tính) ----
export function cauHinhGoogle() {
  const clientId = googleClientId();
  return { enabled: Boolean(clientId), clientId: clientId || null };
}

const GOOGLE_PROFILE_MINUTES = 15;

// Chỉ tài khoản khách hàng dùng được đường này. Email Google đã được Google xác minh nên khớp email tài khoản là đủ;
// tài khoản nhân viên vẫn đăng nhập bằng tên đăng nhập và mật khẩu.
export async function dangNhapGoogle(data = {}, { verify = verifyGoogleIdToken, query = executeQuery } = {}) {
  const profile = await verify(data.credential);
  const result = await query(`SELECT tk.TenDangNhap AS tenDangNhap, tk.MaNguoiDung AS maNguoiDung, nd.HoTen AS hoTen, nd.NgaySinh AS ngaySinh,
      nd.GioiTinh AS gioiTinh, nd.Email AS email, nd.SDT AS soDienThoai, nd.LoaiNguoiDung AS vaiTro, tk.TrangThai AS trangThai,
      nv.ChucVu AS chucVu, nv.MaChiNhanh AS maChiNhanh, kh.QuocTich AS quocTich, kh.CCCD AS cccd
    FROM dbo.TaiKhoan tk
    JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = tk.MaNguoiDung
    LEFT JOIN dbo.NhanVien nv ON nv.MaNhanVien = tk.MaNguoiDung
    LEFT JOIN dbo.KhachHang kh ON kh.MaKhachHang = tk.MaNguoiDung
    WHERE LOWER(nd.Email) = @Email`, [{ name: 'Email', type: sql.VarChar(100), value: profile.email }]);
  const rows = result.recordset || [];
  if (rows.length > 1) throw createServiceError('Email này đang gắn với nhiều tài khoản, vui lòng đăng nhập bằng tên đăng nhập.', 409);
  const record = rows[0];
  if (record) {
    if (record.vaiTro !== 'KhachHang') throw createServiceError('Tài khoản nhân viên đăng nhập bằng tên đăng nhập và mật khẩu.', 403);
    if (record.trangThai === 'Vô hiệu hóa') throw createServiceError('Tài khoản đã bị vô hiệu hóa.', 401);
    return toUser(record);
  }
  return {
    needsProfile: true, email: profile.email, hoTen: profile.hoTen,
    profileToken: signToken({ kind: 'google-signup', email: profile.email, hoTen: profile.hoTen, exp: Date.now() + GOOGLE_PROFILE_MINUTES * 60 * 1000 }),
  };
}

function taoTenDangNhapTuEmail(email) {
  if (email.length <= 50) return email;
  return `${email.split('@')[0].slice(0, 44)}${String(Math.floor(1000 + Math.random() * 9000))}`;
}

// Email Google chưa có tài khoản: khách bổ sung ngày sinh, giới tính, số điện thoại rồi hệ thống tạo tài khoản
// (tên đăng nhập là email, mật khẩu ngẫu nhiên vì khách đăng nhập bằng Google).
export async function hoanTatDangKyGoogle(data = {}, { register = dangKy } = {}) {
  const payload = verifyToken(data.profileToken);
  if (!payload || payload.kind !== 'google-signup' || !payload.email) {
    throw createServiceError('Phiên đăng ký bằng Google đã hết hạn, vui lòng đăng nhập Google lại.', 401);
  }
  const matKhau = randomBytes(24).toString('base64url');
  return register({
    tenDangNhap: taoTenDangNhapTuEmail(payload.email), matKhau, xacNhanMatKhau: matKhau,
    hoTen: String(data.hoTen || payload.hoTen || '').trim(), ngaySinh: data.ngaySinh, gioiTinh: data.gioiTinh,
    soDienThoai: data.soDienThoai, email: payload.email,
  });
}
