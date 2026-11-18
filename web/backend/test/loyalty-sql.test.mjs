import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { hostname } from 'node:os';

test('loyalty SQL: award eligibility, duplicate quote and applying a voucher exactly once', {
  skip: process.env.LOYALTY_SQL_TEST !== 'true',
}, async () => {
  process.env.DB_NAME = 'master';
  const { getPool: masterPool } = await import('../database/connection.js?loyalty-test');
  const master = await masterPool();
  const name = `HOMEDORM_LOYALTY_TEST_${process.pid}_${Date.now()}`;
  assert.match(name, /^HOMEDORM_LOYALTY_TEST_\d+_\d+$/);
  let pool, created = false;
  try {
    const [server] = (await master.request().query("SELECT CONVERT(nvarchar(200), SERVERPROPERTY('MachineName')) AS machine")).recordset;
    assert.equal(server.machine.toLowerCase(), hostname().toLowerCase(), 'Use the local SQL instance');
    await master.request().query(`CREATE DATABASE [${name}]`);
    created = true;
    process.env.DB_NAME = name;
    const { getPool } = await import('../database/connection.js');
    const { LoyaltyStore } = await import('../integrations/loyalty/store.js');
    const { getHoaDonCuaKhach } = await import('../services/khachHoaDon.service.js');
    pool = await getPool();
    assert.equal((await pool.request().query('SELECT DB_NAME() AS name')).recordset[0].name, name);
    await pool.request().batch(`
      CREATE TABLE dbo.HopDongThue (MaHopDong varchar(6) PRIMARY KEY, MaKhachHang varchar(6), TrangThai nvarchar(20), NgayBatDau date, NgayKetThuc date);
      CREATE TABLE dbo.HoaDon (MaHoaDon varchar(6) PRIMARY KEY, MaHopDong varchar(6), KyThanhToan varchar(7), NgayHanTT date, NgayLap date, NgayThanhToan date, TrangThai nvarchar(20), TongTien decimal(15,2));
      CREATE TABLE dbo.AvalancheWallet (UserId varchar(6) PRIMARY KEY, Address varchar(42));
      CREATE TABLE dbo.ChungTuHoaDon (MaHoaDon varchar(6));
      INSERT dbo.HopDongThue VALUES ('HD0001','KH0001',N'Hiệu lực','2026-08-01','2090-01-31'), ('HD0002','KH0002',N'Hiệu lực','2026-08-01','2090-01-31');
      INSERT dbo.HoaDon VALUES ('HO0001','HD0001','2026-08','2026-09-20',NULL,'2026-09-20',N'Đã TT',1000000),
        ('HO0002','HD0001','2026-09','2026-10-10',NULL,'2026-10-11',N'Đã TT',1000000),
        ('HO0003','HD0001','2026-10','2026-11-20',NULL,'2026-11-18',N'Đã TT',1000000),
        ('HO0004','HD0001','2026-11','2026-12-10',NULL,NULL,N'Chưa TT',1000000),
        ('HO0005','HD0001','2026-12','2027-01-10',NULL,NULL,N'Chưa TT',1000000);
    `);
    const user = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
    assert.equal((await getHoaDonCuaKhach(user)).length, 5);
    const migration = await readFile(new URL('../../../database/migrations/20261118_loyalty_points.sql', import.meta.url), 'utf8');
    for (let repeat = 0; repeat < 2; repeat++) {
      for (const batch of migration.split(/^\s*GO\s*$/im).filter(part => part.trim())) await pool.request().batch(batch);
    }
    const store = new LoyaltyStore();
    const address = '0x' + '12'.repeat(20);
    const deployment = { chainId: 31337, address, startDate: '2026-08-01' };
    for (let repeat = 0; repeat < 2; repeat++) {
      await store.locked('test-discovery', tx => store.discoverAwards(deployment, tx));
    }
    assert.deepEqual((await store.history('KH0001', deployment)).map(row => row.invoiceId), ['HO0003']);
    assert.equal(await store.next(deployment), undefined);
    await pool.request().input('wallet', address).query("INSERT dbo.AvalancheWallet VALUES('KH0001',@wallet)");
    assert.equal((await store.next(deployment)).invoiceId, 'HO0003');
    const row = { id: '0x' + '13'.repeat(32), customerId: 'KH0001', contractId: 'HD0001', wallet: address,
      deadline: Math.floor(Date.now() / 1000) + 900 };
    await assert.rejects(store.quote({ ...row, contractId: 'HD0002' }, deployment), /Hợp đồng/);
    const quotes = await Promise.all([store.quote(row, deployment), store.quote({ ...row, id: '0x' + '77'.repeat(32) }, deployment)]);
    assert.equal(quotes[0].id, quotes[1].id);
    const queued = await store.queueRedemption(quotes[0], '0x1234', Math.floor(Date.now() / 1000), deployment);
    await store.markSent(queued, { hash: '0x' + '15'.repeat(32) }, address);
    assert.equal((await store.next(deployment)).id, queued.id);
    await store.finish(queued.id, 'Confirmed');
    await store.finish(queued.id, 'Confirmed');
    const apply = invoiceId => pool.request().input('invoice', invoiceId).query(
      "SET XACT_ABORT ON; BEGIN TRAN; DECLARE @g INT; EXEC dbo.SP_Loyalty_ApplyVoucher @invoice, 'HD0001', @g OUTPUT; COMMIT; SELECT @g AS applied;",
    );
    const results = await Promise.all([apply('HO0004'), apply('HO0005')]);
    assert.equal(results.reduce((n, result) => n + result.recordset[0].applied, 0), 20000);
    const bills = (await getHoaDonCuaKhach(user)).filter(item => item.giamDiemThuong > 0);
    assert.equal(bills.length, 1);
    assert.equal(Number(bills[0].tongTien), 980000);
    assert.equal((await apply(bills[0].maHoaDon)).recordset[0].applied, 20000);
    assert.equal(Number((await getHoaDonCuaKhach(user)).find(item => item.maHoaDon === bills[0].maHoaDon).tongTien), 980000);
  } finally {
    if (pool) await pool.close();
    if (created) await master.request().query(`ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}];`);
    await master.close();
  }
});
