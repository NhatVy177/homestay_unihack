// Integration checks against HOMEDORM4. All synthetic rows are rolled back.
import assert from 'node:assert/strict';
import { getPool, sql } from '../database/connection.js';
import { managers } from '../integrations/mail/datCocNotifications.js';

const pool = await getPool();
const request = tx => new sql.Request(tx);
async function seed(tx, id, customer, room) {
  await request(tx).input('id', sql.VarChar(6), id)
    .input('customer', sql.VarChar(6), customer)
    .input('room', sql.VarChar(4), room).query(`
      IF EXISTS(SELECT 1 FROM dbo.PhieuDangKy WHERE MaDangKy=@id)
        THROW 50990,N'Synthetic registration ID already exists.',1;
      IF EXISTS(SELECT 1 FROM dbo.NguoiDung WHERE MaNguoiDung=@customer)
        THROW 50991,N'Synthetic customer ID already exists.',1;
      INSERT dbo.NguoiDung(MaNguoiDung,HoTen,NgaySinh,GioiTinh,SDT,Email,UrlAvt,LoaiNguoiDung)
        VALUES(@customer,N'Khách kiểm thử','2000-01-01',N'Nam','0900000000',
          CONCAT(@customer,'@example.invalid'),NULL,'KhachHang');
      INSERT dbo.KhachHang(MaKhachHang,QuocTich,CCCD)
        VALUES(@customer,N'Việt Nam',CONCAT('099999',@customer));
      INSERT dbo.PhieuDangKy(MaDangKy,NgayDangKy,SoNam,SoNu,SoNguoiDuKienO,
        KhuVucMongMuon,LoaiPhongYeuCau,MucGiaToiDa,ThoiGianDuKienVaoO,ThoiHanThue,
        YeuCauKhac,TrangThai,MaKhachHang,MaNhanVienSale)
        VALUES(@id,CAST(GETDATE() AS date),1,0,1,N'Quận 1',N'Phòng kiểm thử',
          10000000,DATEADD(DAY,7,GETDATE()),6,N'Kiểm thử rollback',N'Đã tiếp nhận',@customer,'NV0001');
      INSERT dbo.PDK_LoaiPhong(MaDangKy,MaLoaiPhong)
        SELECT @id,MaLoaiPhong FROM dbo.Phong WHERE MaPhong=@room;
      INSERT dbo.LichXemPhong(MaDangKy,STTLich,ThoiGianHen,TrangThai,GhiChu)
        VALUES(@id,1,DATEADD(HOUR,-1,GETDATE()),N'Đã xem',N'Kiểm thử rollback');
      INSERT dbo.ChiTietXemPhong(MaDangKy,MaPhong,STTLich,KhachChon)
        VALUES(@id,@room,1,1);`);
}
async function call(tx, procedure, params = {}) {
  const req = request(tx);
  for (const [name, [type, value]] of Object.entries(params)) req.input(name, type, value);
  return req.execute(procedure);
}
const send = (tx, id, bed = null) => call(tx, 'dbo.SP_GuiYeuCauCocKemLuaChon', {
  MaDangKy: [sql.VarChar(6), id], MaNhanVienSale: [sql.VarChar(6), 'NV0001'],
  HinhThucThue: [sql.NVarChar(20), bed ? 'Ghép giường' : 'Nguyên phòng'],
  DanhSachGiuong: [sql.NVarChar(100), bed],
});
const approve = (tx, id) => call(tx, 'dbo.SP_DuyetVaPhatHanhPhieuCoc', {
  MaDangKy: [sql.VarChar(6), id], MaQuanLy: [sql.VarChar(6), 'NV0003'],
});
async function run(name, fn) {
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try { await fn(tx); console.log(`${name}: PASS (rolled back)`); }
  finally { await tx.rollback().catch(() => {}); }
}

try {
  await run('approve + duplicate rejection + cash + fund idempotency', async tx => {
    await seed(tx, 'DK9998', 'KH9998', 'P102');
    await seed(tx, 'DK9999', 'KH9999', 'P102');
    const beds = (await request(tx).query(`SELECT MaGiuong FROM dbo.Giuong WHERE MaPhong='P102' ORDER BY MaGiuong`)).recordset;
    assert.equal(beds.length, 2);
    await send(tx, 'DK9998', beds[0].MaGiuong);
    await send(tx, 'DK9999', beds[0].MaGiuong);
    const recipients = await managers('DK9998', (statement, params) => {
      const req = request(tx);
      for (const p of params) req.input(p.name, p.type, p.value);
      return req.query(statement);
    });
    assert.ok(recipients.some(x => x.id === 'NV0003'));
    assert.ok(recipients.every(x => x.id !== 'NV0007' && x.id !== 'NV0011'));
    const result = await approve(tx, 'DK9998');
    const slip = result.recordsets.at(-2)?.[0];
    assert.ok(slip?.maPhieuDatCoc);
    assert.ok(result.recordsets.at(-1).some(x => x.maDangKy === 'DK9999'));
    const state = (await request(tx).input('id', sql.VarChar(6), slip.maPhieuDatCoc).query(`
      SELECT d.TrangThaiThanhToan,d.MaNhanVienKeToan,d.SoTienCoc,
        (SELECT COUNT(*) FROM dbo.Giuong g JOIN dbo.ChiTietDatCoc c
          ON c.MaPhong=g.MaPhong AND c.MaGiuong=g.MaGiuong
          WHERE c.MaPhieuDatCoc=@id AND g.TinhTrang=N'Giữ chỗ') AS held
      FROM dbo.PhieuDatCoc d WHERE d.MaPhieuDatCoc=@id`)).recordset[0];
    assert.equal(state.MaNhanVienKeToan, 'NVAUTO');
    assert.equal(state.TrangThaiThanhToan, 'Chờ TT');
    assert.ok(Number(state.SoTienCoc) > 0);
    assert.equal(state.held, 1);
    await call(tx, 'dbo.SP_ChonPhuongThucThanhToanCoc', {
      PhieuId: [sql.NVarChar(30), slip.maPhieuDatCoc],
      PhuongThucThanhToan: [sql.NVarChar(20), 'Tiền mặt'],
    });
    await call(tx, 'dbo.SP_CapNhatMinhChungThanhToanCoc', {
      PhieuId: [sql.NVarChar(30), slip.maPhieuDatCoc],
      ChungTuThanhToan: [sql.NVarChar(500), '/uploads/test-rollback.jpg'],
    });
    await call(tx, 'dbo.SP_XacNhanThanhToanCoc', {
      PhieuId: [sql.NVarChar(30), slip.maPhieuDatCoc], HopLe: [sql.Bit, true],
      GhiChu: [sql.NVarChar(sql.MAX), null],
      QuanLyXacNhanThanhToanId: [sql.NVarChar(20), 'NV0001'],
    });
    const fund = { MaPhieu: [sql.VarChar(6), slip.maPhieuDatCoc], MaKeToan: [sql.VarChar(6), 'NV0004'] };
    const first = (await call(tx, 'dbo.SP_GhiNhanNopQuyCoc', fund)).recordset[0];
    const second = (await call(tx, 'dbo.SP_GhiNhanNopQuyCoc', fund)).recordset[0];
    assert.equal(first.daNopQuy, true);
    assert.equal(new Date(first.nopQuyLuc).getTime(), new Date(second.nopQuyLuc).getTime());
    const paid = (await request(tx).input('id', sql.VarChar(6), slip.maPhieuDatCoc)
      .query(`SELECT TrangThaiThanhToan FROM dbo.PhieuDatCoc WHERE MaPhieuDatCoc=@id`)).recordset[0];
    assert.equal(paid.TrangThaiThanhToan, 'Đã TT');
  });

  await run('later request needs reason; auto-rejection carries it', async tx => {
    await seed(tx, 'DK9998', 'KH9998', 'P102');
    await seed(tx, 'DK9999', 'KH9999', 'P102');
    const bed = (await request(tx).query(`SELECT TOP 1 MaGiuong FROM dbo.Giuong WHERE MaPhong='P102' ORDER BY MaGiuong`)).recordset[0].MaGiuong;
    await send(tx, 'DK9998', bed);
    await send(tx, 'DK9999', bed);
    // A savepoint cannot survive XACT_ABORT/THROW in the procedure, so check the
    // required-reason path in the separate failure scenario below.
    const result = await call(tx, 'dbo.SP_DuyetVaPhatHanhPhieuCoc', {
      MaDangKy: [sql.VarChar(6), 'DK9999'], MaQuanLy: [sql.VarChar(6), 'NV0003'],
      LyDoVuotLuot: [sql.NVarChar(500), 'Khách gửi trước đã đổi nhu cầu'],
    });
    assert.ok(result.recordsets.at(-2)?.[0]?.maPhieuDatCoc);
    assert.match(result.recordsets.at(-1)[0].lyDo, /Khách gửi trước đã đổi nhu cầu/);
  });

  await run('12-hour expiry only once', async tx => {
    await seed(tx, 'DK9998', 'KH9998', 'P103');
    await seed(tx, 'DK9999', 'KH9999', 'P103');
    await send(tx, 'DK9998');
    await send(tx, 'DK9999');
    await request(tx).query(`UPDATE dbo.YeuCauDatCocChiTiet SET GuiLuc=DATEADD(HOUR,-13,GETDATE()) WHERE MaDangKy='DK9998'`);
    const one = (await call(tx, 'dbo.SP_TuChoiYeuCauCocQuaHan')).recordset;
    const two = (await call(tx, 'dbo.SP_TuChoiYeuCauCocQuaHan')).recordset;
    assert.ok(one.some(x => x.maDangKy === 'DK9998'));
    assert.ok(!one.some(x => x.maDangKy === 'DK9999'));
    assert.ok(!two.some(x => x.maDangKy === 'DK9998'));
  });

  // The approval procedure rolls back its own transaction on failure.
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let failed = false;
  try {
    await seed(tx, 'DK9998', 'KH9998', 'P102');
    const bed = (await request(tx).query(`SELECT TOP 1 MaGiuong FROM dbo.Giuong WHERE MaPhong='P102' ORDER BY MaGiuong`)).recordset[0].MaGiuong;
    await send(tx, 'DK9998', bed);
    await request(tx).input('bed', sql.VarChar(3), bed)
      .query(`UPDATE dbo.Giuong SET TinhTrang=N'Giữ chỗ' WHERE MaPhong='P102' AND MaGiuong=@bed`);
    await approve(tx, 'DK9998');
  } catch (error) {
    failed = /giường|chỗ|phòng/i.test(error.message);
  } finally { await tx.rollback().catch(() => {}); }
  assert.ok(failed, 'Approval must fail clearly when selected bed was held');
  const residue = (await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.PhieuDangKy WHERE MaDangKy='DK9998'`)).recordset[0].n;
  assert.equal(residue, 0);
  console.log('selected bed taken -> full rollback: PASS');

  const fairnessTx = new sql.Transaction(pool);
  await fairnessTx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  let reasonRequired = false;
  try {
    await seed(fairnessTx, 'DK9998', 'KH9998', 'P102');
    await seed(fairnessTx, 'DK9999', 'KH9999', 'P102');
    const bed = (await request(fairnessTx).query(`SELECT TOP 1 MaGiuong FROM dbo.Giuong WHERE MaPhong='P102' ORDER BY MaGiuong`)).recordset[0].MaGiuong;
    await send(fairnessTx, 'DK9998', bed);
    await send(fairnessTx, 'DK9999', bed);
    await approve(fairnessTx, 'DK9999');
  } catch (error) { reasonRequired = error.number === 50312; }
  finally { await fairnessTx.rollback().catch(() => {}); }
  assert.ok(reasonRequired, 'Later request without reason must be rejected by SQL');
  console.log('later request without reason: PASS (rolled back)');
} finally { await pool.close(); }
