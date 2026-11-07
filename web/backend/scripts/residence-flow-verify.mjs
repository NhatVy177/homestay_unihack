// SQL integration check; synthetic data is rolled back.
import assert from 'node:assert/strict';
import { getPool, sql } from '../database/connection.js';
import { branchManagers } from '../integrations/mail/nhanPhongNotifications.js';

const pool = await getPool();
const request = tx => new sql.Request(tx);
const room = (await pool.request().query(`SELECT TOP (1) p.MaPhong,p.GioiTinhChoPhep
  FROM dbo.Phong p JOIN dbo.Giuong g ON g.MaPhong=p.MaPhong
  WHERE p.MaChiNhanh='CN0001' AND NOT EXISTS (
    SELECT 1 FROM dbo.PhieuDangKy d JOIN dbo.ChiTietXemPhong c ON c.MaDangKy=d.MaDangKy
    WHERE d.TrangThai=N'Chờ xác nhận cọc' AND c.KhachChon=1 AND c.MaPhong=p.MaPhong)
  GROUP BY p.MaPhong,p.GioiTinhChoPhep
  HAVING COUNT(*)>=2 AND COUNT(*)=SUM(CASE WHEN g.TinhTrang=N'Trống' THEN 1 ELSE 0 END)
  ORDER BY p.MaPhong`)).recordset[0];
assert.ok(room, 'Need an empty branch-1 room without pending requests');
const gender = room.GioiTinhChoPhep === 'Nữ' ? 'Nữ' : 'Nam';
async function call(tx, name, fields) {
  const req = request(tx);
  for (const [key, [type, value]] of Object.entries(fields)) req.input(key, type, value);
  return req.execute(name);
}
async function seedPaidDeposit(tx) {
  await request(tx).input('room', sql.VarChar(4), room.MaPhong).input('gender', sql.NVarChar(4), gender).query(`
    IF EXISTS(SELECT 1 FROM dbo.PhieuDangKy WHERE MaDangKy='DK9998')
      THROW 50990,N'Synthetic registration ID already exists.',1;
    INSERT dbo.NguoiDung(MaNguoiDung,HoTen,NgaySinh,GioiTinh,SDT,Email,UrlAvt,LoaiNguoiDung)
      VALUES('KH9998',N'Khách kiểm thử','2000-01-01',@gender,'0900000000','synthetic@example.invalid',NULL,'KhachHang');
    INSERT dbo.KhachHang(MaKhachHang,QuocTich,CCCD) VALUES('KH9998',N'Việt Nam','099999999998');
    INSERT dbo.PhieuDangKy(MaDangKy,NgayDangKy,SoNam,SoNu,SoNguoiDuKienO,
      KhuVucMongMuon,LoaiPhongYeuCau,MucGiaToiDa,ThoiGianDuKienVaoO,ThoiHanThue,
      YeuCauKhac,TrangThai,MaKhachHang,MaNhanVienSale)
      VALUES('DK9998',CAST(GETDATE() AS date),CASE WHEN @gender=N'Nam' THEN 1 ELSE 0 END,
        CASE WHEN @gender=N'Nữ' THEN 1 ELSE 0 END,1,N'Quận 1',N'Phòng kiểm thử',
        10000000,DATEADD(DAY,7,GETDATE()),6,N'Kiểm thử rollback',N'Đã tiếp nhận','KH9998','NV0001');
    INSERT dbo.PDK_LoaiPhong(MaDangKy,MaLoaiPhong)
      SELECT 'DK9998',MaLoaiPhong FROM dbo.Phong WHERE MaPhong=@room;
    INSERT dbo.LichXemPhong(MaDangKy,STTLich,ThoiGianHen,TrangThai,GhiChu)
      VALUES('DK9998',1,DATEADD(HOUR,-1,GETDATE()),N'Đã xem',N'Kiểm thử rollback');
    INSERT dbo.ChiTietXemPhong(MaDangKy,MaPhong,STTLich,KhachChon) VALUES('DK9998',@room,1,1);`);
  await call(tx, 'dbo.SP_GuiYeuCauCocKemLuaChon', {
    MaDangKy: [sql.VarChar(6), 'DK9998'], MaNhanVienSale: [sql.VarChar(6), 'NV0001'],
    HinhThucThue: [sql.NVarChar(20), 'Nguyên phòng'], DanhSachGiuong: [sql.NVarChar(100), null],
  });
  const approval = await call(tx, 'dbo.SP_DuyetVaPhatHanhPhieuCoc', {
    MaDangKy: [sql.VarChar(6), 'DK9998'], MaQuanLy: [sql.VarChar(6), 'NV0003'],
  });
  const id = approval.recordsets.at(-2)?.[0]?.maPhieuDatCoc;
  assert.ok(id);
  await call(tx, 'dbo.SP_ChonPhuongThucThanhToanCoc', {
    PhieuId: [sql.NVarChar(30), id], PhuongThucThanhToan: [sql.NVarChar(20), 'Tiền mặt'],
  });
  await call(tx, 'dbo.SP_CapNhatMinhChungThanhToanCoc', {
    PhieuId: [sql.NVarChar(30), id], ChungTuThanhToan: [sql.NVarChar(500), '/uploads/test-rollback.jpg'],
  });
  await call(tx, 'dbo.SP_XacNhanThanhToanCoc', {
    PhieuId: [sql.NVarChar(30), id], HopLe: [sql.Bit, true],
    GhiChu: [sql.NVarChar(sql.MAX), null], QuanLyXacNhanThanhToanId: [sql.NVarChar(20), 'NV0001'],
  });
  return id;
}
async function run(name, member, inspect) {
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const depositId = await seedPaidDeposit(tx);
    const saved = await call(tx, 'dbo.SP_LuuHoSoCuTru', {
      MaPhieuDatCoc: [sql.VarChar(6), depositId], MaNhanVienSale: [sql.VarChar(6), 'NV0001'],
      DaDoiChieuGiayTo: [sql.Bit, true], GhiChu: [sql.NVarChar(500), null],
      DanhSachThanhVienJson: [sql.NVarChar(sql.MAX), JSON.stringify(
        (Array.isArray(member) ? member : [member]).map((details, index) => ({
          hoTen: `Thành viên kiểm thử ${index + 1}`, ngaySinh: '2000-01-01', gioiTinh: gender,
          cccd: `09999999999${index}`, sdt: '0900000000', quocTich: 'Việt Nam', ...details,
        })))],
    });
    const profileId = saved.recordsets[0]?.[0]?.MaHoSoCuTru;
    assert.ok(profileId);
    const sent = await call(tx, 'dbo.SP_GuiDuyetHoSoCuTru', { MaHoSoCuTru: [sql.VarChar(6), profileId] });
    await inspect(sent.recordset[0], tx, profileId);
    console.log(`${name}: PASS (rolled back)`);
  } finally { await tx.rollback().catch(() => {}); }
}
try {
  await run('complete adult Vietnamese profile auto-approved', {}, async (row, tx, id) => {
    assert.equal(row.TrangThaiHoSo, 'Đã duyệt cư trú');
    assert.equal(row.MaNhanVienQuanLy, 'NVAUTO');
    const members = (await request(tx).input('id', sql.VarChar(6), id)
      .query('SELECT TrangThai FROM dbo.ThanhVienHopDong WHERE MaHoSoCuTru=@id')).recordset;
    assert.deepEqual(members.map(item => item.TrangThai), ['Đủ điều kiện']);
  });
  await run('minor and foreign national queued with reasons', { ngaySinh: '2015-01-01', quocTich: 'Khác' }, async (row, tx, id) => {
    assert.equal(row.TrangThaiHoSo, 'Chờ duyệt cư trú');
    assert.match(row.GhiChuQuanLy, /Quốc tịch/);
    assert.match(row.GhiChuQuanLy, /18 tuổi/);
    const recipients = await branchManagers('residence-review', id, (statement, params) => {
      const req = request(tx);
      for (const field of params) req.input(field.name, field.type, field.value);
      return req.query(statement);
    });
    assert.ok(recipients.some(item => item.id === 'NV0003'));
    assert.ok(recipients.every(item => item.id !== 'NV0007' && item.id !== 'NV0011'));
  });
  await run('manager can reject one member and approve remaining members', [{}, {
    quocTich: 'Khác', cccd: '099999999997',
  }], async (row, tx, id) => {
    assert.equal(row.TrangThaiHoSo, 'Chờ duyệt cư trú');
    const members = (await request(tx).input('id', sql.VarChar(6), id)
      .query('SELECT MaThanhVien FROM dbo.ThanhVienHopDong WHERE MaHoSoCuTru=@id ORDER BY MaThanhVien')).recordset;
    assert.equal(members.length, 2);
    const result = await call(tx, 'dbo.SP_DuyetHoSoCuTru', {
      MaHoSoCuTru: [sql.VarChar(6), id], MaNhanVienQuanLy: [sql.VarChar(6), 'NV0003'],
      KetQua: [sql.NVarChar(30), 'Đã duyệt cư trú'], GhiChuQuanLy: [sql.NVarChar(500), 'Chỉ duyệt thành viên đủ điều kiện'],
      DanhSachKetQuaThanhVienJson: [sql.NVarChar(sql.MAX), JSON.stringify([
        { maThanhVien: members[0].MaThanhVien, trangThaiDuyet: 'Đủ điều kiện' },
        { maThanhVien: members[1].MaThanhVien, trangThaiDuyet: 'Bị từ chối', lyDoTuChoi: 'Quốc tịch cần kiểm tra' },
      ])],
    });
    assert.equal(result.recordsets[0][0].TrangThaiHoSo, 'Đã duyệt cư trú');
    assert.deepEqual(result.recordsets[1].map(item => item.TrangThai), ['Đủ điều kiện', 'Bị từ chối']);
  });
  const residue = (await pool.request().query("SELECT COUNT(*) AS n FROM dbo.PhieuDangKy WHERE MaDangKy='DK9998'")).recordset[0].n;
  assert.equal(residue, 0);
} finally { await pool.close(); }
