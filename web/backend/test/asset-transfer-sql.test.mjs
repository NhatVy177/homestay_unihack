import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('D-076 SQL: six operations are scoped, logged once and atomic',
  { skip: process.env.ASSET_TRANSFER_SQL_TEST !== 'true' }, async () => {
    process.env.DB_NAME = 'master';
    const { getPool, sql } = await import('../database/connection.js');
    const master = await getPool();
    const database = `HOMEDORM_ASSET_TEST_${Date.now()}`;
    assert.match(database, /^HOMEDORM_ASSET_TEST_\d+$/);
    let pool;
    let created = false;
    try {
      await master.request().query(`CREATE DATABASE [${database}]`);
      created = true;
      const config = { ...master.config, database };
      if (config.connectionString) {
        config.connectionString = config.connectionString.replace(/Database=[^;]*;/i, `Database=${database};`);
      }
      pool = await new sql.ConnectionPool(config).connect();
      await pool.request().batch(`
        CREATE TABLE dbo.ChiNhanh (MaChiNhanh varchar(6) PRIMARY KEY, TenChiNhanh nvarchar(100));
        CREATE TABLE dbo.NguoiDung (MaNguoiDung varchar(6) PRIMARY KEY, HoTen nvarchar(100));
        CREATE TABLE dbo.NhanVien (MaNhanVien varchar(6) PRIMARY KEY, MaChiNhanh varchar(6), ChucVu nvarchar(20));
        CREATE TABLE dbo.Phong (MaPhong varchar(4) PRIMARY KEY, TenPhong nvarchar(100), MaChiNhanh varchar(6));
        CREATE TABLE dbo.TaiSan (
          MaPhong varchar(4), MaTaiSan varchar(6), TenTaiSan nvarchar(100), SoLuong int, DonGia decimal(15,2),
          LoaiTaiSan nvarchar(20) NOT NULL DEFAULT N'Chung', MaGiuong varchar(3) NULL,
          PRIMARY KEY (MaPhong, MaTaiSan)
        );
        CREATE TABLE dbo.PhieuDatCoc (MaPhieuDatCoc varchar(6) PRIMARY KEY);
        CREATE TABLE dbo.ChiTietDatCoc (MaChiTietDC varchar(6) PRIMARY KEY, MaPhieuDatCoc varchar(6), MaPhong varchar(4));
        CREATE TABLE dbo.HopDongThue (MaHopDong varchar(6) PRIMARY KEY, MaPhieuCoc varchar(6), TrangThai nvarchar(20));
        INSERT dbo.ChiNhanh VALUES ('CN0001',N'Chi nhánh 1'),('CN0002',N'Chi nhánh 2');
        INSERT dbo.NguoiDung VALUES ('NV0001',N'Quản lý Một'),('NV0002',N'Quản lý Hai');
        INSERT dbo.NhanVien VALUES ('NV0001','CN0001',N'Quản lý'),('NV0002','CN0002',N'Quản lý');
        INSERT dbo.Phong VALUES ('P101',N'Phòng 101','CN0001'),('P102',N'Phòng 102','CN0001'),
          ('P103',N'Phòng 103','CN0001'),('P201',N'Phòng 201','CN0002');
        INSERT dbo.TaiSan VALUES
          ('P101','TS0001',N'Giường',6,1800000,N'Chung',NULL),
          ('P102','TS0001',N'Giường',1,1800000,N'Chung',NULL),
          ('P103','TS0001',N'Giường',2,1800000,N'Chung',NULL),
          ('P201','TS0001',N'Giường',2,1800000,N'Chung',NULL);
        INSERT dbo.PhieuDatCoc VALUES ('DC0001');
        INSERT dbo.ChiTietDatCoc VALUES ('CT0001','DC0001','P103');
        INSERT dbo.HopDongThue VALUES ('HD0001','DC0001',N'Hiệu lực');
      `);

      const migration = await readFile(new URL('../../../database/migrations/20261119_asset_transfer.sql', import.meta.url), 'utf8');
      const batches = migration.split(/^\s*GO\s*$/mi).filter((batch) => batch.trim());
      for (let run = 0; run < 2; run += 1) {
        for (const batch of batches) await pool.request().batch(batch);
      }
      await pool.request().query(`
        INSERT dbo.KhoTaiSanChiNhanh
          (MaChiNhanh,MaTaiSan,TenTaiSan,DonGia,SoLuongDungDuoc,SoLuongChoSua)
        VALUES ('CN0001','TS0001',N'Giường',1800000,10,5);
      `);

      const transfer = (operation, options = {}) => pool.request()
        .input('MaChiNhanh', sql.VarChar(6), options.branch || 'CN0001')
        .input('LoaiThaoTac', sql.NVarChar(30), operation)
        .input('MaPhongNguon', sql.VarChar(4), options.source || null)
        .input('MaPhongDich', sql.VarChar(4), options.destination || null)
        .input('MaTaiSan', sql.VarChar(6), 'TS0001')
        .input('SoLuong', sql.Int, options.quantity ?? 1)
        .input('LyDo', sql.NVarChar(500), options.reason === undefined ? 'Kiểm thử điều phối' : options.reason)
        .input('MaNhanVien', sql.VarChar(6), options.actor || 'NV0001')
        .execute('dbo.SP_DieuPhoiTaiSan_Chuyen');
      const state = async () => (await pool.request().query(`
        SELECT SoLuongDungDuoc,SoLuongChoSua FROM dbo.KhoTaiSanChiNhanh WHERE MaChiNhanh='CN0001' AND MaTaiSan='TS0001';
        SELECT MaPhong,SoLuong FROM dbo.TaiSan WHERE MaTaiSan='TS0001' ORDER BY MaPhong;
        SELECT COUNT(*) AS historyCount FROM dbo.PhieuDieuChuyenTaiSan;
      `)).recordsets;

      const operations = [
        ['PHONG_KHO', { source: 'P101' }],
        ['KHO_PHONG', { destination: 'P102' }],
        ['PHONG_PHONG', { source: 'P101', destination: 'P102' }],
        ['DUNGDUOC_CHO_SUA', { quantity: 2 }],
        ['CHOSUA_DUNGDUOC', { quantity: 1 }],
        ['CHOSUA_THANHLY', { quantity: 1 }],
      ];
      for (let index = 0; index < operations.length; index += 1) {
        await transfer(operations[index][0], operations[index][1]);
        const [, , history] = await state();
        assert.equal(history[0].historyCount, index + 1, 'each successful operation writes exactly one history row');
      }

      const beforeDenied = await state();
      await assert.rejects(transfer('KHO_PHONG', { destination: 'P102', quantity: 999 }), (error) => error.number === 51415);
      await assert.rejects(transfer('PHONG_KHO', { source: 'P103' }), (error) => error.number === 51411);
      await assert.rejects(transfer('PHONG_KHO', { source: 'P101', reason: ' ' }), (error) => error.number === 51403);
      await assert.rejects(transfer('PHONG_KHO', { source: 'P201' }), (error) => error.number === 51409);
      assert.deepEqual(await state(), beforeDenied, 'denied transfers change neither stock, rooms nor history');

      await pool.request().batch(`
        CREATE TRIGGER dbo.trg_Test_BlockAssetHistory ON dbo.PhieuDieuChuyenTaiSan AFTER INSERT AS
        BEGIN THROW 51999, N'Giả lập lỗi ghi lịch sử', 1; END;
      `);
      const beforeFailure = await state();
      await assert.rejects(transfer('DUNGDUOC_CHO_SUA'), (error) => error.number === 51999);
      assert.deepEqual(await state(), beforeFailure, 'failure after stock update rolls the whole transaction back');
      await pool.request().query('DROP TRIGGER dbo.trg_Test_BlockAssetHistory');

      const [warehouse, rooms, history] = await state();
      assert.equal(history[0].historyCount, 6);
      assert.equal(warehouse[0].SoLuongDungDuoc, 9);
      assert.equal(warehouse[0].SoLuongChoSua, 5);
      assert.deepEqual(rooms.map((row) => [row.MaPhong, row.SoLuong]), [
        ['P101', 4], ['P102', 3], ['P103', 2], ['P201', 2],
      ]);
      console.log('D-076 SQL verified in disposable database only; HOMEDORM4 untouched.');
    } finally {
      if (pool) await pool.close();
      if (created) {
        assert.match(database, /^HOMEDORM_ASSET_TEST_\d+$/);
        await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`);
      }
      await master.close();
    }
  });
