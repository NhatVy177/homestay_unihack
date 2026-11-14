import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { migrateViewingConfirmation } from '../scripts/viewing-confirmation-db.mjs';
import { attachViewingConfirmations } from '../services/viewingConfirmation.service.js';

test('D-045 SQL: versioned consent, replay, ownership, reset and attendance gate are atomic in a disposable database',
  {skip:process.env.VIEWING_CONFIRM_SQL_TEST!=='true'},async()=>{
    process.env.DB_NAME='master';
    const {getPool,sql}=await import('../database/connection.js');
    const master=await getPool(),database=`HOMEDORM_CONFIRM_TEST_${Date.now()}`;
    assert.match(database,/^HOMEDORM_CONFIRM_TEST_\d+$/);let pool,created=false;
    try{
      await master.request().query(`CREATE DATABASE [${database}]`);created=true;
      const config={...master.config,database};
      if(config.connectionString)config.connectionString=config.connectionString.replace(/Database=[^;]*;/i,`Database=${database};`);
      pool=await new sql.ConnectionPool(config).connect();
      assert.equal((await pool.request().query('SELECT DB_NAME() AS name')).recordset[0].name,database);
      await pool.request().batch(`
        CREATE TABLE dbo.NhanVien(MaNhanVien varchar(6) PRIMARY KEY,MaChiNhanh varchar(6),ChucVu nvarchar(30));
        CREATE TABLE dbo.TaiKhoan(MaNguoiDung varchar(6) PRIMARY KEY,TrangThai nvarchar(30));
        CREATE TABLE dbo.Phong(MaPhong varchar(6) PRIMARY KEY,MaChiNhanh varchar(6));
        CREATE TABLE dbo.PhieuDangKy(MaDangKy varchar(6) PRIMARY KEY,MaKhachHang varchar(6),MaNhanVienSale varchar(6),TrangThai nvarchar(30));
        CREATE TABLE dbo.LichXemPhong(MaDangKy varchar(6),STTLich int,ThoiGianHen datetime,TrangThai nvarchar(30),GhiChu nvarchar(500),PRIMARY KEY(MaDangKy,STTLich),
          CONSTRAINT CHK_LXP_TrangThai CHECK(TrangThai IN(N'Chờ xem',N'Đã xem',N'Đã hủy',N'Yêu cầu đổi lịch',N'Yêu cầu hủy')));
        CREATE TABLE dbo.ChiTietXemPhong(MaDangKy varchar(6),STTLich int,MaPhong varchar(6));
        CREATE TABLE dbo.PhieuDatCoc(MaPhieuYeuCauDangKy varchar(6),TrangThaiCoc nvarchar(30));
        INSERT dbo.NhanVien VALUES('NV0001','CN0001',N'Sale');
        INSERT dbo.TaiKhoan VALUES('NV0001',N'Hoạt động'),('KH0001',N'Hoạt động'),('KH0002',N'Khóa');
        INSERT dbo.Phong VALUES('P101','CN0001');
        INSERT dbo.PhieuDangKy SELECT CONCAT('DK000',n),'KH0001','NV0001',N'Đã tiếp nhận' FROM(VALUES(1),(2),(3),(4),(5),(6))v(n);
        INSERT dbo.LichXemPhong SELECT MaDangKy,1,DATEADD(HOUR,-2,GETDATE()),CASE WHEN MaDangKy='DK0004' THEN N'Đã xem' ELSE N'Chờ xem' END,NULL FROM dbo.PhieuDangKy;
        INSERT dbo.ChiTietXemPhong SELECT MaDangKy,1,'P101' FROM dbo.PhieuDangKy;
      `);
      const source=await readFile(new URL('../../../database/migrations/20261111_manual_viewing_outcome.sql',import.meta.url),'utf8');
      for(const batch of source.split(/^\s*GO\s*$/mi).filter(s=>s.trim()))await pool.request().batch(batch);
      const states=async()=> (await pool.request().query('SELECT MaDangKy,TrangThai FROM dbo.LichXemPhong ORDER BY MaDangKy')).recordset;
      const before=await states();
      await migrateViewingConfirmation(pool,sql,database);await migrateViewingConfirmation(pool,sql,database);
      assert.deepEqual(await states(),before,'migration does not alter historical outcomes');
      const query=async(text,params=[])=>{const request=pool.request();for(const p of params)request.input(p.name,p.type,p.value);return request.query(text);};
      const unreadied=await attachViewingConfirmations([{id:'DK0001-1',coTheGhiNhanKetQua:true}],query);
      assert.equal(unreadied[0].xacNhanLichSanSang,true);assert.equal(unreadied[0].coTheGhiNhanKetQua,false);
      await assert.rejects(pool.request().query("UPDATE dbo.LichXemPhong SET ThoiGianKhachXacNhan=SYSUTCDATETIME() WHERE MaDangKy='DK0002'"),e=>e.number===547,'timestamp without a confirmed version is invalid');
      await pool.request().query("UPDATE dbo.LichXemPhong SET ThoiGianHen=NULL WHERE MaDangKy='DK0003'; UPDATE dbo.LichXemPhong SET ThoiGianHen=DATEADD(HOUR,-2,GETDATE()) WHERE MaDangKy='DK0003';");
      assert.equal((await pool.request().query("SELECT PhienBanLich FROM dbo.LichXemPhong WHERE MaDangKy='DK0003'")).recordset[0].PhienBanLich,3);
      const get=async id=>(await pool.request().input('id',sql.VarChar(6),id).query('SELECT * FROM dbo.LichXemPhong WHERE MaDangKy=@id')).recordset[0];
      const confirm=(id,version=1,owner='KH0001')=>pool.request().input('MaKhachHang',sql.VarChar(6),owner).input('MaDangKy',sql.VarChar(6),id).input('STTLich',sql.Int,1).input('PhienBanLich',sql.Int,version).execute('dbo.SP_KhachXacNhanLichXem');
      const record=(id,outcome='Đã xem')=>pool.request().input('MaNhanVien',sql.VarChar(6),'NV0001').input('MaDangKy',sql.VarChar(6),id).input('STTLich',sql.Int,1).input('KetQua',sql.NVarChar(30),outcome).execute('dbo.SP_GhiNhanKetQuaBuoiXem');
      for(const outcome of ['Đã xem','Khách không đến'])await assert.rejects(record('DK0001',outcome),e=>e.number===50403);
      await assert.rejects(confirm('DK0001',1,'KH0002'),e=>e.number===50401);
      await assert.rejects(confirm('DK9999'),e=>e.number===50401);
      const first=(await confirm('DK0001')).recordset[0];const repeat=(await confirm('DK0001')).recordset[0];
      assert.equal(first.thoiGianKhachXacNhan.getTime(),repeat.thoiGianKhachXacNhan.getTime(),'repeat confirmation preserves the first timestamp');
      assert.equal((await attachViewingConfirmations([{id:'DK0001-1',coTheGhiNhanKetQua:true}],query))[0].coTheGhiNhanKetQua,true);
      await pool.request().query("UPDATE dbo.LichXemPhong SET ThoiGianHen=DATEADD(MINUTE,1,ThoiGianHen) WHERE MaDangKy='DK0001'");
      const changed=await get('DK0001');assert.equal(changed.PhienBanLich,2);assert.equal(changed.ThoiGianKhachXacNhan,null);
      await assert.rejects(confirm('DK0001',1),e=>e.number===50402);await assert.rejects(record('DK0001'),e=>e.number===50403);
      await Promise.all([confirm('DK0001',2),confirm('DK0001',2)]);await record('DK0001');
      assert.equal((await get('DK0001')).TrangThai,'Đã xem');
      assert.equal((await get('DK0004')).ThoiGianKhachXacNhan,null,'old completed record is not retroactively confirmed');
      await assert.rejects(confirm('DK0004'),e=>e.number===50402);
      await confirm('DK0005');await record('DK0005','Khách không đến');
      const race=await Promise.allSettled([confirm('DK0006'),pool.request().query("UPDATE dbo.LichXemPhong SET ThoiGianHen=DATEADD(MINUTE,2,ThoiGianHen) WHERE MaDangKy='DK0006'")]);
      assert.equal(race[1].status,'fulfilled');const raced=await get('DK0006');assert.equal(raced.PhienBanLich,2);assert.equal(raced.ThoiGianKhachXacNhan,null);
      if(race[0].status==='rejected')assert.equal(race[0].reason.number,50402);
      await assert.rejects(record('DK0006'),e=>e.number===50403);
      await pool.request().query("UPDATE dbo.LichXemPhong SET ThoiGianHen=DATEADD(MINUTE,-2,ThoiGianHen) WHERE MaDangKy='DK0006'");
      assert.equal((await get('DK0006')).PhienBanLich,3);await assert.rejects(confirm('DK0006',1),e=>e.number===50402);
    }finally{
      if(pool)await pool.close();
      if(created){assert.match(database,/^HOMEDORM_CONFIRM_TEST_\d+$/);await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`);}
      await master.close();
    }
  });
