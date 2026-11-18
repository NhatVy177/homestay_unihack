import test from 'node:test';
import assert from 'node:assert/strict';

test('Bộ demo SQL: khách mới, tháng thuê thứ hai, báo hỏng và lập hóa đơn', { skip: process.env.DEMO_SQL_TEST !== 'true' }, async (t) => {
  const db = process.env.DB_NAME || '';
  assert.match(db, /^HOMEDORM_DEMO_[A-Z0-9_]{1,25}$/);
  const password = process.env.DEMO_SEED_PASSWORD;
  assert.ok(password, 'Cần DEMO_SEED_PASSWORD của bộ demo.');

  const { getPool, sql } = await import('../database/connection.js');
  const { dangNhap } = await import('../services/auth.service.js');
  const { getTongQuan, getDatCoc } = await import('../services/khachMoi.service.js');
  const { getHoaDonCuaKhach } = await import('../services/khachHoaDon.service.js');
  const { getChiTietPhong } = await import('../services/phongKhamPha.service.js');
  const repair = await import('../services/suaChuaBaoTri.service.js');
  const invoices = await import('../services/hoaDonDinhKy.service.js');
  const pool = await getPool();
  t.after(() => pool.close());
  const { recordset: [target] } = await pool.request().query("SELECT DB_NAME() AS db, OBJECT_ID('dbo.HomeDormDemoSeed', 'U') AS seed;");
  assert.equal(target.db, db);
  assert.ok(target.seed, 'Chạy demo:db:migrate trước khi kiểm tra.');

  async function login(tenDangNhap) {
    const { user } = await dangNhap({ tenDangNhap, matKhau: password }) || {};
    assert.ok(user?.maNguoiDung, `Cần đăng nhập được tài khoản ${tenDangNhap}.`);
    return user;
  }

  for (const suffix of ['', '-02', '-03', '-04']) {
    const customer = await login(`demo-moi${suffix}`);
    const overview = await getTongQuan(customer);
    assert.equal(overview.trangThai.coQuyTrinhThueDangHoatDong, false);
    assert.deepEqual(overview.hoSo, []);
    assert.deepEqual(overview.lichXem, []);
    assert.deepEqual(await getDatCoc(customer), []);
    assert.deepEqual(await getHoaDonCuaKhach(customer), []);
    assert.deepEqual(await repair.hopDongCuaKhach(customer), []);
    await assert.rejects(repair.taoYeuCau(customer, { loai: repair.LOAI[0], moTa: 'Ổ cắm bị lỏng.' }), { statusCode: 404 });
  }

  const { recordset: leases } = await pool.request().query(`
    SELECT MaHopDong, GiaThue,
      CONVERT(char(7), NgayBatDau, 126) AS firstPeriod,
      CONVERT(char(7), DATEADD(month, 1, NgayBatDau), 126) AS secondPeriod,
      DATEDIFF(month, NgayBatDau, (SELECT SeededAt FROM dbo.HomeDormDemoSeed)) AS elapsed,
      DATEDIFF(month, NgayBatDau, DATEADD(day, 1, NgayKetThuc)) AS duration
    FROM dbo.HopDongThue WHERE MaHopDong BETWEEN 'HD9001' AND 'HD9004' ORDER BY MaHopDong;`);
  assert.equal(leases.length, 4);
  let slot = 0;
  for (const suffix of ['', '-02', '-03', '-04']) {
    const resident = await login(`demo-dang-o${suffix}`);
    const lease = leases[slot++];
    assert.equal(lease.duration, 6);
    assert.equal(lease.elapsed, 1);
    const contracts = await repair.hopDongCuaKhach(resident);
    assert.deepEqual(contracts.map(item => item.maHopDong), [lease.MaHopDong]);
    const bills = await getHoaDonCuaKhach(resident);
    assert.deepEqual(bills.map(item => [item.kyThanhToan, item.trangThai, item.loai, Number(item.tongTien)]), [
      [lease.secondPeriod, 'Chưa TT', 'Hàng tháng', Number(lease.GiaThue) + 43 * 4000 + 4 * 18000 + 180000],
      [lease.firstPeriod, 'Đã TT', 'Kỳ đầu', Number(lease.GiaThue) + 38 * 4000 + 3 * 18000 + 180000],
    ]);
  }

  const room = await getChiTietPhong('P101');
  assert.match(room.moTa, /bàn học/);
  assert.ok(room.tienNghi.length >= 4);

  const resident = await login('demo-dang-o');
  const manager = await login('demo-quan-ly');
  const accountant = await login('demo-ke-toan');
  const otherManager = await login('demo-quan-ly-02');
  const [seededRepair] = await repair.danhSach(resident);
  assert.equal(seededRepair.trangThai, repair.STATUS.DONE);
  assert.equal(seededRepair.loai, repair.LOAI[4]);
  assert.ok((await repair.danhSach(manager)).some(item => item.maYeuCau === 'SC9002' && item.trangThai === repair.STATUS.NEW));

  const tx = new sql.Transaction(pool);
  await tx.begin();
  // Các service có Promise.all cho truy vấn đọc. Một kết nối transaction chỉ chạy từng câu.
  let lastQuery = Promise.resolve();
  const query = (statement, parameters = []) => {
    const pending = lastQuery.then(() => {
      const request = tx.request();
      for (const { name, type, value } of parameters) request.input(name, type, value);
      return request.query(statement);
    });
    lastQuery = pending.catch(() => {});
    return pending;
  };
  try {
    const report = await repair.taoYeuCau(resident, { loai: repair.LOAI[0], moTa: 'Công tắc bị nứt.' }, { query, save: async () => [] });
    assert.equal(report.trangThai, repair.STATUS.NEW);
    await assert.rejects(repair.tiepNhan(otherManager, report.maYeuCau, {}, { query }), { statusCode: 404 });
    const assigned = await repair.tiepNhan(manager, report.maYeuCau, {}, { query });
    assert.equal(assigned.trangThai, repair.STATUS.DOING);
    const finished = await repair.hoanTat(manager, report.maYeuCau, { chiPhi: 80000, loiDoKhach: true, ghiChu: 'Đã thay công tắc bị nứt.' }, { query });
    assert.equal(finished.trangThai, repair.STATUS.DONE);
    const draft = await invoices.chiTietLapHoaDon(accountant, 'HD9001', { query });
    assert.deepEqual(draft.phiPhatSinh.map(item => item.soTien).sort((a, b) => a - b), [80000, 120000]);
    assert.equal(draft.kyThanhToan, invoices.nextPeriod(leases[0].secondPeriod));
    assert.equal(draft.chiSo.previous.dienCuoi, 201);
    assert.equal(draft.chiSo.previous.nuocCuoi, 27);
    const bill = await invoices.lapHoaDon(accountant, { maHopDong: 'HD9001', chiSoDienMoi: 245, chiSoNuocMoi: 31 }, { query });
    assert.equal(bill.tongTien, Number(leases[0].GiaThue) + 44 * 4000 + 4 * 18000 + 180000 + 200000);
    const posted = (await getHoaDonCuaKhach(resident, query)).find(item => item.maHoaDon === bill.maHoaDon);
    assert.equal(posted?.kyThanhToan, draft.kyThanhToan);
    assert.equal(Number(posted?.tongTien), bill.tongTien);
  } finally {
    await lastQuery;
    await tx.rollback();
  }
  assert.equal((await getHoaDonCuaKhach(resident)).length, 2);
  assert.equal((await repair.danhSach(resident)).length, 1);
});
