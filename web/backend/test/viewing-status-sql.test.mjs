import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { patchAutoViewed } from '../scripts/viewing-status-db.mjs';

// Opt-in integration test, exclusively in a disposable database. Never inserts
// fixtures into HOMEDORM4 and never restores its rows after the fact.
test('C5-a SQL: read leaves schedules unchanged; outcome is scoped, time-checked and atomic',
  { skip: process.env.C5A_SQL_TEST !== 'true' }, async () => {
    process.env.DB_NAME = 'master';
    const { getPool, sql } = await import('../database/connection.js');
    const master = await getPool();
    const database = `HOMEDORM_C5A_TEST_${Date.now()}`;
    assert.match(database, /^HOMEDORM_C5A_TEST_\d+$/);
    let pool, created = false;
    try {
      await master.request().query(`CREATE DATABASE [${database}]`); created = true;
      const config = { ...master.config, database };
      if (config.connectionString) config.connectionString = config.connectionString.replace(/Database=[^;]*;/i, `Database=${database};`);
      pool = await new sql.ConnectionPool(config).connect();
      await pool.request().batch(`
        CREATE TABLE dbo.NhanVien (MaNhanVien varchar(6) PRIMARY KEY, MaChiNhanh varchar(6), ChucVu nvarchar(30));
        CREATE TABLE dbo.TaiKhoan (MaNguoiDung varchar(6) PRIMARY KEY, TrangThai nvarchar(30));
        CREATE TABLE dbo.Phong (MaPhong varchar(6) PRIMARY KEY, MaChiNhanh varchar(6));
        CREATE TABLE dbo.PhieuDangKy (MaDangKy varchar(6) PRIMARY KEY, MaNhanVienSale varchar(6), TrangThai nvarchar(30));
        CREATE TABLE dbo.LichXemPhong (MaDangKy varchar(6), STTLich int, ThoiGianHen datetime, TrangThai nvarchar(30), GhiChu nvarchar(500),
          PRIMARY KEY(MaDangKy,STTLich), CONSTRAINT CHK_LXP_TrangThai CHECK (TrangThai IN (N'Chờ xem',N'Đã xem',N'Đã hủy',N'Yêu cầu đổi lịch',N'Yêu cầu hủy')));
        CREATE TABLE dbo.ChiTietXemPhong (MaDangKy varchar(6), STTLich int, MaPhong varchar(6));
        CREATE TABLE dbo.PhieuDatCoc (MaPhieuYeuCauDangKy varchar(6), TrangThaiCoc nvarchar(30));
        INSERT dbo.NhanVien VALUES ('NV0001','CN0001',N'Sale'),('NV0002','CN0001',N'Sale'),('NV0003','CN0001',N'Kế toán'),('NV0004','CN0001',N'Sale');
        INSERT dbo.TaiKhoan VALUES ('NV0001',N'Hoạt động'),('NV0002',N'Hoạt động'),('NV0003',N'Hoạt động'),('NV0004',N'Khóa');
        INSERT dbo.Phong VALUES ('P101','CN0001'),('P201','CN0002');
        INSERT dbo.PhieuDangKy VALUES ('DK0001','NV0001',N'Đã tiếp nhận'),('DK0002','NV0001',N'Đã tiếp nhận'),
          ('DK0003','NV0002',N'Đã tiếp nhận'),('DK0004','NV0001',N'Đã tiếp nhận'),('DK0005','NV0001',N'Đã tiếp nhận'),
          ('DK0006','NV0001',N'Đã tiếp nhận'),('DK0007','NV0001',N'Đã tiếp nhận'),('DK0008','NV0001',N'Từ chối');
        INSERT dbo.LichXemPhong SELECT MaDangKy,1,DATEADD(HOUR,CASE WHEN MaDangKy='DK0002' THEN 1 ELSE -1 END,GETDATE()),
          CASE WHEN MaDangKy='DK0007' THEN N'Đã hủy' ELSE N'Chờ xem' END,NULL FROM dbo.PhieuDangKy;
        INSERT dbo.ChiTietXemPhong SELECT MaDangKy,1,CASE WHEN MaDangKy='DK0004' THEN 'P201' ELSE 'P101' END FROM dbo.PhieuDangKy;
        INSERT dbo.PhieuDatCoc VALUES ('DK0005',N'Hiệu lực');
      `);
      const migration = await readFile(new URL('../../../database/migrations/20261111_manual_viewing_outcome.sql', import.meta.url), 'utf8');
      for (let i=0;i<2;i++) for (const batch of migration.split(/^\s*GO\s*$/mi).filter(s=>s.trim())) await pool.request().batch(batch);
      const record = (id, outcome='Đã xem', actor='NV0001') => pool.request()
        .input('MaNhanVien',sql.VarChar(6),actor).input('MaDangKy',sql.VarChar(6),id)
        .input('STTLich',sql.Int,1).input('KetQua',sql.NVarChar(30),outcome).execute('dbo.SP_GhiNhanKetQuaBuoiXem');
      const states = async()=> (await pool.request().query('SELECT MaDangKy,TrangThai FROM dbo.LichXemPhong ORDER BY MaDangKy')).recordset;
      const before = await states();
      const legacyRead = `CREATE PROCEDURE dbo.TestRead AS
        BEGIN
          UPDATE dbo.LichXemPhong
          SET TrangThai = N'Đã xem'
          WHERE TrangThai IN (N'Chờ xem', N'Yêu cầu đổi lịch', N'Yêu cầu hủy')
            AND ThoiGianHen <= GETDATE();
          SELECT MaDangKy, TrangThai FROM dbo.LichXemPhong;
        END;\n`;
      await pool.request().batch(patchAutoViewed(legacyRead).definition);
      await pool.request().execute('dbo.TestRead');
      assert.deepEqual(await states(),before,'reading never marks due appointments viewed');
      for (const [id,actor,number] of [['DK0002','NV0001',50332],['DK0003','NV0001',50331],['DK0004','NV0001',50330],
        ['DK0005','NV0001',50332],['DK0007','NV0001',50332],['DK0008','NV0001',50332],['DK0001','NV0003',50330],['DK0001','NV0004',50330]]) {
        await assert.rejects(record(id,'Đã xem',actor),e=>e.number===number);
      }
      assert.deepEqual(await states(),before,'denied mutations leave every row intact');
      const race = await Promise.allSettled([record('DK0001'),record('DK0001','Khách không đến')]);
      assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'only one terminal outcome wins');
      assert.equal(race.find(r=>r.status==='rejected').reason.number,50332);
      await record('DK0006','Khách không đến');
      assert.equal((await pool.request().query("SELECT TrangThai FROM dbo.PhieuDangKy WHERE MaDangKy='DK0006'")).recordset[0].TrangThai,'Đã tiếp nhận','no-show does not auto-close the profile');
      const after=await states();
      assert.equal(after.find(r=>r.MaDangKy==='DK0006').TrangThai,'Khách không đến');
      assert.deepEqual(after.filter(r=>!['DK0001','DK0006'].includes(r.MaDangKy)), before.filter(r=>!['DK0001','DK0006'].includes(r.MaDangKy)));
      console.log('C5-a SQL verified in disposable database only; HOMEDORM4 untouched.');
    } finally {
      if (pool) await pool.close();
      if (created) {
        assert.match(database,/^HOMEDORM_C5A_TEST_\d+$/);
        await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`);
      }
      await master.close();
    }
  });
