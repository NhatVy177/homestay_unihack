// Dựng dữ liệu cho video demo bằng chính API của backend (đóng vai khách, Sale, quản lý, kế toán),
// để trigger và thủ tục SQL tự giữ đúng trạng thái phòng, tiền cọc. Chạy theo chặng: node scripts/demo-video-seed.mjs <chặng>.
// Trạng thái (mã hồ sơ, phiếu cọc...) lưu vào scripts/.demo-video-state.json để chặng sau dùng tiếp.
// Cần backend đang chạy ở localhost:5000. Chỉ tạo dữ liệu mới; không sửa, xóa dữ liệu có sẵn. Hỏi Vy trước khi chạy lên HOMEDORM4.
import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import 'dotenv/config';

const API = process.env.DEMO_API || 'http://localhost:5000/api';
const STATE = new URL('./.demo-video-state.json', import.meta.url);
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 2));

const secret = (process.env.AUTH_SECRET || 'happyroom-auth-secret').trim();
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return `${b}.${createHmac('sha256', secret).update(b).digest('base64url')}`; };
const staff = (maNguoiDung, hoTen, chucVu) => ({ maNguoiDung, hoTen, vaiTro: 'NhanVien', chucVu, maChiNhanh: 'CN0001', trangThai: 'Hoạt động' });
const STAFF = { sale: staff('NV0001', 'Nguyễn Minh Khoa', 'Sale'), quanLy: staff('NV0003', 'Lê Thành Nhân', 'Quản lý'), keToan: staff('NV0004', 'Phạm Hoài Thương', 'Kế toán') };
const staffToken = (role) => sign({ ...STAFF[role], exp: Date.now() + 3600e3 });

export async function api(token, method, path, body) {
  const isForm = body instanceof FormData;
  const res = await fetch(API + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data.slice(0, 300) : (data.message || data.error || JSON.stringify(data).slice(0, 300))}`);
  return data;
}
const sale = (m, p, b) => api(staffToken('sale'), m, p, b);
const quanLy = (m, p, b) => api(staffToken('quanLy'), m, p, b);

// Khách demo. Email dạng vynhat2k5+<mã>@gmail.com để mã OTP về hộp thư của Vy; mật khẩu chung 123.
export const CUSTOMERS = {
  k2: { hoTen: 'Trần Minh Khang', gioiTinh: 'Nam', ngaySinh: '2004-03-12', soDienThoai: '0907100002', phong: 'P103' },
  k2b: { hoTen: 'Lê Quốc Bảo', gioiTinh: 'Nam', ngaySinh: '2003-08-21', soDienThoai: '0907100022', phong: 'P103' },
  k3: { hoTen: 'Phạm Thu Hà', gioiTinh: 'Nữ', ngaySinh: '2004-11-02', soDienThoai: '0907100003', phong: 'P107' },
  k4: { hoTen: 'Đỗ Gia Huy', gioiTinh: 'Nam', ngaySinh: '2002-05-30', soDienThoai: '0907100004', phong: 'P401' },
  k5: { hoTen: 'Bùi Đức Anh', gioiTinh: 'Nam', ngaySinh: '2004-02-17', soDienThoai: '0907100005', phong: 'P104' },
  k5b: { hoTen: 'Hồ Minh Trí', gioiTinh: 'Nam', ngaySinh: '2003-10-04', soDienThoai: '0907100055', phong: 'P104' },
  k8: { hoTen: 'Võ Hoàng Phúc', gioiTinh: 'Nam', ngaySinh: '2003-06-09', soDienThoai: '0907100008', phong: 'P412', loaiPhong: 'Phòng 6 người' },
  k6: { hoTen: 'Lý Hoàng Nam', gioiTinh: 'Nam', ngaySinh: '2003-04-08', soDienThoai: '0907100006', phong: 'P102' },
  k1b: { hoTen: 'Ngô Thanh Tâm', gioiTinh: 'Nữ', ngaySinh: '2003-01-15', soDienThoai: '0907100011', phong: 'P409', soNguoi: 3, soNam: 1, soNu: 2 },
};
const email = (key) => `vynhat2k5+${key}@gmail.com`;

export async function customerToken(key) {
  const login = await api(null, 'POST', '/auth/dang-nhap', { tenDangNhap: email(key), matKhau: '123' });
  return login.token;
}
const isoDay = (offset) => { const d = new Date(Date.now() + offset * 864e5); return d.toISOString().slice(0, 10); };

// Chặng 1: tài khoản → phiếu đăng ký → Sale tiếp nhận → lịch xem → "Đã xem".
async function chang1(keys) {
  for (const key of keys) {
    const c = CUSTOMERS[key];
    const s = (state[key] ||= {});
    if (!s.maKhachHang) {
      const out = await api(null, 'POST', '/auth/dang-ky', { email: email(key), matKhau: '123', xacNhanMatKhau: '123', hoTen: c.hoTen, ngaySinh: c.ngaySinh, gioiTinh: c.gioiTinh, soDienThoai: c.soDienThoai });
      s.maKhachHang = out.user?.maNguoiDung || out.maNguoiDung || out.data?.maNguoiDung || 'ok'; save();
      console.log(key, 'đăng ký tài khoản', s.maKhachHang);
    }
    const token = await customerToken(key);
    if (!s.maDangKy) {
      const soNguoi = c.soNguoi || 1;
      const out = await api(token, 'POST', '/dang-ky-thue', {
        soNguoiO: soNguoi, soNam: c.soNam ?? (c.gioiTinh === 'Nam' ? 1 : 0), soNu: c.soNu ?? (c.gioiTinh === 'Nữ' ? 1 : 0),
        gioiTinh: c.gioiTinh, ngayDuKienVaoO: isoDay(3), mucGiaToiDa: 6000000, khuVucMongMuon: 'Quận 1', thoiHanThue: 6, loaiPhongYeuCau: c.loaiPhong || 'Phòng 4 người',
      });
      s.maDangKy = out.maDangKy || out.MaDangKy || out.data?.maDangKy; save();
      console.log(key, 'phiếu đăng ký', s.maDangKy, s.maDangKy ? '' : JSON.stringify(out).slice(0, 200));
    }
    if (!s.tiepNhan) { await sale('PUT', `/dang-ky-thue/${s.maDangKy}/tiep-nhan`, {}); s.tiepNhan = true; save(); console.log(key, 'Sale tiếp nhận'); }
    if (!s.sttLich) {
      const hen = new Date(`${isoDay(1)}T09:00:00+07:00`);
      const out = await sale('POST', '/lich-xem-phong', { maDangKy: s.maDangKy, thoiGianHen: hen.toISOString(), phongIds: [c.phong] });
      s.sttLich = out.sttLich || out.STTLich || out.data?.sttLich || 1; save();
      console.log(key, 'lịch xem', s.sttLich);
    }
    if (!s.khachXacNhan) { await api(token, 'PUT', `/lich-xem-phong/${s.maDangKy}-${s.sttLich}/xac-nhan`, { phienBanLich: 1 }); s.khachXacNhan = true; save(); console.log(key, 'khách xác nhận lịch'); }
    if (!s.daXem) { await sale('PUT', `/lich-xem-phong/${s.maDangKy}-${s.sttLich}/cap-nhat`, { thaoTac: 'da-xem' }); s.daXem = true; save(); console.log(key, 'Đã xem'); }
  }
}

// Chặng 2: khách gửi yêu cầu giữ chỗ → quản lý duyệt → phiếu cọc. Khách có cờ traCoc thì trả cọc luôn qua trình mô phỏng.
const PAY = { k1b: true, k8: true };
async function chang2(keys) {
  for (const key of keys) {
    const c = CUSTOMERS[key];
    const s = state[key];
    const token = await customerToken(key);
    if (!s.guiGiuCho) {
      const nguyenPhong = (c.soNguoi || 1) > 1;
      await api(token, 'POST', '/dat-coc/khach/gui-yeu-cau', { maDangKy: s.maDangKy, maPhong: c.phong, hinhThucThue: nguyenPhong ? 'Nguyên phòng' : 'Ghép giường', giuongs: nguyenPhong ? [] : ['G01'] });
      s.guiGiuCho = true; save(); console.log(key, 'gửi yêu cầu giữ chỗ');
    }
    if (!s.duyetCoc) {
      await quanLy('PUT', `/dat-coc/${s.maDangKy}/xac-nhan-kha-nang-nhan-coc`, { duocNhanCoc: true });
      s.duyetCoc = true; save(); console.log(key, 'quản lý duyệt cọc');
    }
    if (!s.maPhieuCoc) {
      const { executeQuery } = await import('../database/connection.js');
      const row = (await executeQuery("SELECT TOP 1 MaPhieuDatCoc, SoTienCoc, TrangThaiThanhToan FROM dbo.PhieuDatCoc WHERE MaPhieuYeuCauDangKy = '" + s.maDangKy + "' ORDER BY MaPhieuDatCoc DESC")).recordset[0];
      s.maPhieuCoc = row?.MaPhieuDatCoc; save(); console.log(key, 'phiếu cọc', s.maPhieuCoc, row?.SoTienCoc, row?.TrangThaiThanhToan);
    }
    if (PAY[key] && !s.daTraCoc) {
      const order = await api(token, 'POST', `/thanh-toan-mo-phong/dat-coc/${s.maPhieuCoc}`);
      const id = order.id || order.maGiaoDich || order.data?.id;
      await api(token, 'POST', `/thanh-toan-mo-phong/${id}/thanh-toan`);
      s.daTraCoc = true; save(); console.log(key, 'đã trả cọc', id);
    }
  }
}

// Chặng 3 (K8, đi trọn vòng đời không quay): hồ sơ cư trú → duyệt → Sale lập hợp đồng.
const short = (o) => JSON.stringify(o).slice(0, 400);
async function chang3(keys) {
  const { executeQuery } = await import('../database/connection.js');
  for (const key of keys) {
    const c = CUSTOMERS[key];
    const s = state[key];
    const member = { hoTen: c.hoTen, ngaySinh: c.ngaySinh, gioiTinh: c.gioiTinh, cccd: '0792030' + c.soDienThoai.slice(-5), sdt: c.soDienThoai, email: email(key), quocTich: 'Việt Nam' };
    if (!s.maHoSo) {
      const out = await sale('POST', '/nhan-phong/cu-tru/ho-so', { maPhieuDatCoc: s.maPhieuCoc, daDoiChieuGiayTo: true, danhSachThanhVien: [member] });
      s.maHoSo = out.maHoSoCuTru || out.maHoSo || out.data?.maHoSoCuTru || out.hoSo?.MaHoSoCuTru; save();
      console.log(key, 'hồ sơ cư trú', s.maHoSo, s.maHoSo ? '' : short(out));
    }
    const hs = async () => (await executeQuery("SELECT TrangThaiHoSo FROM dbo.HoSoCuTru WHERE MaHoSoCuTru='" + s.maHoSo + "'")).recordset[0]?.TrangThaiHoSo;
    if ((await hs()) === 'Nháp' || !s.guiDuyet) {
      try { await sale('POST', `/nhan-phong/cu-tru/ho-so/${s.maHoSo}/gui-duyet`, {}); } catch (e) { console.log(key, 'gửi duyệt:', e.message); }
      s.guiDuyet = true; save(); console.log(key, 'gửi duyệt, trạng thái', await hs());
    }
    if ((await hs()) !== 'Đã duyệt cư trú') {
      const ct = await quanLy('GET', `/nhan-phong/cu-tru/ho-so/${s.maHoSo}`);
      const tv = (ct.thanhVien || ct.danhSachThanhVien || ct.data?.thanhVien || []).map((m) => ({ ...m, trangThaiDuyet: 'Đã duyệt', trangThai: 'Đã duyệt' }));
      await quanLy('POST', `/nhan-phong/cu-tru/ho-so/${s.maHoSo}/duyet`, { ketQua: 'Đã duyệt cư trú', danhSachKetQuaThanhVien: tv });
      console.log(key, 'quản lý duyệt cư trú →', await hs());
    }
    if (!s.maHopDong) {
      const duyet = await sale('GET', `/hop-dong/phieu-coc/${s.maPhieuCoc}/cu-tru-duyet`);
      const thanhVien = duyet.thanhVien || duyet.danhSachThanhVien || duyet.data?.thanhVien || duyet;
      const dv = await sale('GET', '/hop-dong/dich-vu');
      const dichVu = (Array.isArray(dv) ? dv : dv.data || []).filter((d) => d.batBuoc).map((d) => ({ maDichVu: d.maDichVu, ghiChu: 'Bắt buộc' }));
      const out = await sale('POST', '/hop-dong', { maPhieuDatCoc: s.maPhieuCoc, ngayBatDau: isoDay(0), ngayKetThuc: isoDay(182), kyThanhToan: 'Hàng tháng',
        khachHangDaXacNhan: true, nhanVienDaXacNhan: true, daDoiChieuCCCDGoc: true, danhSachThanhVien: Array.isArray(thanhVien) ? thanhVien : [member], danhSachDichVu: dichVu });
      s.maHopDong = out.maHopDong || out.data?.maHopDong || out.hopDong?.maHopDong; save();
      console.log(key, 'hợp đồng', s.maHopDong, s.maHopDong ? '' : short(out));
    }
  }
}

// Chặng 4 (K8): tải bản hợp đồng đã ký → trả khoản thu kỳ đầu (mô phỏng) → quản lý lập biên bản bàn giao → đưa lên chuỗi.
// Sau chặng này khách cần xác nhận biên bản trong trình duyệt (OTP của Vy).
async function chang4(keys) {
  for (const key of keys) {
    const s = state[key];
    const token = await customerToken(key);
    if (!s.banKy) {
      const pdf = Buffer.from('%PDF-1.4 % Hop dong da ky ' + s.maHopDong + ' %%EOF');
      const fd = new FormData(); fd.append('file', new Blob([pdf], { type: 'application/pdf' }), `hop-dong-${s.maHopDong}-da-ky.pdf`);
      await sale('POST', `/hop-dong/${s.maHopDong}/ban-ky`, fd);
      s.banKy = true; save(); console.log(key, 'đã tải bản ký');
    }
    if (!s.thuKyDau) {
      const order = await api(token, 'POST', `/thanh-toan-mo-phong/thu-nhan-phong/${s.maHopDong}`);
      const id = order.id || order.data?.id;
      await api(token, 'POST', `/thanh-toan-mo-phong/${id}/thanh-toan`);
      s.thuKyDau = true; save(); console.log(key, 'đã trả kỳ đầu', id, order.soTien || order.amount || '');
    }
    if (!s.dieuPhoi) {
      const truoc = await quanLy('GET', `/nhan-phong/ban-giao/${s.maHopDong}/tai-san`);
      if (!(Array.isArray(truoc) ? truoc : truoc.data || []).length) {
        // Phòng chưa có tài sản: quản lý điều phối từ kho vào (D-083, phòng có hợp đồng nhưng chưa bàn giao).
        for (const maTaiSan of ['TS0001', 'TS0002', 'TS0003', 'TS0004']) {
          await quanLy('POST', '/dieu-phoi-tai-san/chuyen', { loaiThaoTac: 'KHO_PHONG', maPhongDich: CUSTOMERS[key].phong, maTaiSan, soLuong: 1, lyDo: 'Trang bị phòng trước bàn giao' });
        }
        console.log(key, 'điều phối 4 món từ kho vào', CUSTOMERS[key].phong);
      }
      s.dieuPhoi = true; save();
    }
    if (!s.maBienBan) {
      const ts = await quanLy('GET', `/nhan-phong/ban-giao/${s.maHopDong}/tai-san`);
      const rows = Array.isArray(ts) ? ts : (ts.data || ts.danhSachTaiSan || []);
      const danhSachTaiSan = rows.map((r) => ({ ...r, soLuongThucTe: r.soLuongHeThong ?? r.soLuong, soLuongHeThong: r.soLuongHeThong ?? r.soLuong, tinhTrang: 'Tốt', ghiChu: '' }));
      const out = await quanLy('POST', '/nhan-phong/ban-giao', { maHopDong: s.maHopDong, khachCoMat: true, quanLyXacNhan: true, khachXacNhan: true, danhSachTaiSan });
      s.maBienBan = out.maBienBan || out.data?.maBienBan || out.MaBienBan; save();
      console.log(key, 'biên bản', s.maBienBan, s.maBienBan ? '' : short(out));
    }
    if (!s.caseId) {
      const out = await quanLy('POST', '/avalanche/cases', { sourceId: s.maBienBan }).catch((e) => { if (!/409/.test(e.message)) throw e; return { id: 'đã có (tự đưa lên khi lập biên bản)' }; });
      s.caseId = out.id || out.case?.id || out.contractId; save();
      console.log(key, 'đã đưa biên bản lên chuỗi, case', s.caseId, short(out).slice(0, 160));
    }
  }
}

// Chặng 5 (K8): khách gửi yêu cầu trả phòng → quản lý kiểm tra, ghi hư hỏng vượt tiền cọc → kế toán lập đối soát.
// Phí: giường mất (100%) + nệm mất (100%) + tủ hư nặng (60%) = 3.420.000đ > cọc 2.800.000đ, nên khách phải trả thêm.
const keToan = (m, p, b) => api(staffToken('keToan'), m, p, b);
async function chang5(keys) {
  const { executeQuery } = await import('../database/connection.js');
  for (const key of keys) {
    const s = state[key];
    const token = await customerToken(key);
    if (!s.maPhieuTra) {
      await api(token, 'POST', '/khach-moi/hop-dong-dashboard/tra-phong', { maHopDong: s.maHopDong, ngayDuKienTra: isoDay(0) });
      s.maPhieuTra = (await executeQuery("SELECT TOP 1 MaPhieuTra FROM dbo.PhieuTraPhong WHERE MaHopDong='" + s.maHopDong + "' ORDER BY MaPhieuTra DESC")).recordset[0]?.MaPhieuTra; save();
      console.log(key, 'yêu cầu trả phòng', s.maPhieuTra);
    }
    if (!s.kiemTra) {
      const gia = Object.fromEntries((await executeQuery("SELECT MaTaiSan, DonGia FROM dbo.TaiSan WHERE MaPhong='" + CUSTOMERS[key].phong + "'")).recordset.map((r) => [r.MaTaiSan, Number(r.DonGia)]));
      const dsHuHong = [
        { maTaiSan: 'TS0001', thuTuTaiSan: 1, soLuong: 1, mucDoHuHong: 'Mất mát', donGiaBoiThuong: gia.TS0001, moTa: 'Giường bị tháo mang đi' },
        { maTaiSan: 'TS0002', thuTuTaiSan: 1, soLuong: 1, mucDoHuHong: 'Mất mát', donGiaBoiThuong: gia.TS0002, moTa: 'Không thấy nệm trong phòng' },
        { maTaiSan: 'TS0003', thuTuTaiSan: 1, soLuong: 1, mucDoHuHong: 'Hư hỏng nặng', donGiaBoiThuong: gia.TS0003, moTa: 'Cửa tủ gãy bản lề' },
      ];
      await quanLy('POST', '/kiem-tra-tra-phong/quan-ly/kiem-tra', { maPhieuTra: s.maPhieuTra, ngayTraThucTe: isoDay(0), tinhTrangPhong: 'Phòng thiếu giường, nệm; tủ hư', dsHuHong });
      s.kiemTra = true; save(); console.log(key, 'quản lý lập biên bản kiểm tra');
    }
    if (!s.maDoiSoat) {
      const xem = await keToan('GET', `/accountant/doi-soat/phieu-tra-phong/${s.maPhieuTra}`);
      const tong = xem.tongChiPhiSuaChua ?? xem.data?.tongChiPhiSuaChua ?? xem.tinhToanTam?.tongChiPhiSuaChua ?? 0;
      const out = await keToan('POST', '/accountant/doi-soat', { maPhieuTra: s.maPhieuTra, tongChiPhiSuaChua: tong, tienThueConNo: 0, tienDichVuConNo: 0, tienPhat: 0 });
      s.maDoiSoat = out.maDoiSoat || out.doiSoat?.maDoiSoat || out.data?.maDoiSoat; save();
      console.log(key, 'đối soát', s.maDoiSoat, short(out).slice(0, 300));
    }
  }
}

const [stage, ...rest] = process.argv.slice(2);
const stages = { chang1, chang2, chang3, chang4, chang5 };
if (!stages[stage]) { console.log('Chặng có:', Object.keys(stages).join(', ')); process.exit(1); }
await stages[stage](rest.length ? rest : Object.keys(CUSTOMERS));
console.log('Xong', stage);
process.exit(0);
