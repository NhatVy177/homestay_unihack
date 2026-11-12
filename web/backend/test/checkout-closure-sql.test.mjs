import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

test('C4 SQL: D-041 money gate, scoped key return, idempotency and stale snapshots', {skip:process.env.C4_SQL_TEST!=='true'},async()=>{
  process.env.DB_NAME='master';
  const {getPool,sql}=await import('../database/connection.js');
  const master=await getPool(),database=`HOMEDORM_C4_TEST_${Date.now()}`;
  let pool,created=false;
  try {
    assert.match(database,/^HOMEDORM_C4_TEST_\d+$/);
    await master.request().query(`CREATE DATABASE [${database}]`);created=true;
    const config={...master.config,database};
    if(config.connectionString)config.connectionString=config.connectionString.replace(/Database=[^;]*;/i,`Database=${database};`);
    pool=await new sql.ConnectionPool(config).connect();
    await pool.request().batch(`
      CREATE TABLE dbo.HopDongThue(MaHopDong varchar(6) PRIMARY KEY,MaKhachHang varchar(6),MaPhieuCoc varchar(6),TrangThai nvarchar(30));
      CREATE TABLE dbo.PhieuTraPhong(MaPhieuTra varchar(6) PRIMARY KEY,MaHopDong varchar(6),TrangThai nvarchar(30),NgayDangKyTra datetime);
      CREATE TABLE dbo.DoiSoat(MaDoiSoat varchar(6) PRIMARY KEY,MaPhieuTra varchar(6),SoTienHoanThucTe decimal(15,2),SoTienKhachPhaiTT decimal(15,2),TrangThai nvarchar(30),NgayThanhToan date,ChungTuThanhToan varchar(500));
      CREATE TABLE dbo.NhanVien(MaNhanVien varchar(6),MaChiNhanh varchar(6),ChucVu nvarchar(30));
      CREATE TABLE dbo.TaiKhoan(MaNguoiDung varchar(6),TrangThai nvarchar(30));
      CREATE TABLE dbo.Phong(MaPhong varchar(6) PRIMARY KEY,MaChiNhanh varchar(6),TinhTrang nvarchar(30),GioiTinhChoPhep nvarchar(30));
      CREATE TABLE dbo.Giuong(MaGiuong varchar(6),MaPhong varchar(6),TinhTrang nvarchar(30),PRIMARY KEY(MaGiuong,MaPhong));
      CREATE TABLE dbo.ChiTietDatCoc(MaPhieuDatCoc varchar(6),MaPhong varchar(6),MaGiuong varchar(6));
      CREATE TABLE dbo.AvalancheCase(ContractId varchar(6) PRIMARY KEY,Data nvarchar(max),Revision int);
      INSERT dbo.NhanVien VALUES('NV0001','CN0001',N'Quản lý'),('NV0002','CN0002',N'Quản lý'),('NV0003','CN0001',N'Kế toán');
      INSERT dbo.TaiKhoan VALUES('NV0001',N'Hoạt động'),('NV0002',N'Hoạt động'),('NV0003',N'Hoạt động');
      INSERT dbo.Phong VALUES('P0001','CN0001',N'Đầy',N'Nữ'),('P0002','CN0002',N'Đầy',N'Nam');
      INSERT dbo.Giuong VALUES('G0001','P0001',N'Đang thuê'),('G0002','P0001',N'Đang thuê'),('G0001','P0002',N'Đang thuê');
      INSERT dbo.HopDongThue VALUES('HD0001','KH0001','DC0001',N'Hiệu lực'),('HD0002','KH0002','DC0002',N'Hiệu lực'),('HD0003','KH0003','DC0003',N'Hiệu lực'),('HD0004','KH0004','DC0004',N'Hiệu lực');
      INSERT dbo.ChiTietDatCoc VALUES('DC0001','P0001','G0001'),('DC0002','P0001','G0002'),('DC0003','P0002','G0001');
      INSERT dbo.PhieuTraPhong VALUES('PT0001','HD0001',N'Chờ đối soát',GETDATE()),('PT0002','HD0002',N'Chờ đối soát',GETDATE()),('PT0003','HD0003',N'Chờ đối soát',GETDATE()),('PT0004','HD0004',N'Chờ đối soát',GETDATE());
      INSERT dbo.DoiSoat VALUES('DS0001','PT0001',100,0,N'Chờ xác nhận',NULL,NULL),('DS0002','PT0002',0,0,N'Chờ xác nhận',NULL,NULL),('DS0003','PT0003',0,50,N'Chờ xác nhận',NULL,NULL),('DS0004','PT0004',0,0,N'Chờ xác nhận',NULL,NULL);
    `);
    const ddl=await readFile(new URL('../../../database/migrations/20261112_checkout_lifecycle.sql',import.meta.url),'utf8');
    for(let n=0;n<2;n++)for(const batch of ddl.split(/^\s*GO\s*$/mi).filter(s=>s.trim()))await pool.request().batch(batch);
    const setCase=async(id,value,revision=1)=>pool.request().input('id',sql.VarChar(6),id).input('data',sql.NVarChar(sql.MAX),JSON.stringify(value)).input('revision',sql.Int,revision)
      .query('MERGE dbo.AvalancheCase AS t USING(SELECT @id AS id) AS s ON t.ContractId=s.id WHEN MATCHED THEN UPDATE SET Data=@data,Revision=@revision WHEN NOT MATCHED THEN INSERT(ContractId,Data,Revision) VALUES(@id,@data,@revision);');
    await setCase('HD0001',{state:'disputed',versions:[{sourceId:'DS0001'}]});
    await setCase('HD0002',{state:'accepted',versions:[{sourceId:'DS0002',accepted:true}]});
    await setCase('HD0003',{state:'accepted',versions:[{sourceId:'DS0003',accepted:true}]});
    await setCase('HD0004',{state:'review',drafts:[{publishedAt:new Date(Date.now()-86400000).toISOString()}]});
    const advance=(id,ds,mode='accepted',actor='NV0001')=>pool.request().input('ContractId',sql.VarChar(6),id).input('SettlementId',sql.VarChar(6),ds).input('Mode',sql.VarChar(24),mode)
      .input('Actor',sql.VarChar(6),actor).input('Reason',sql.NVarChar(2000),'Đã liên hệ khách').input('ContactProof',sql.NVarChar(sql.MAX),JSON.stringify({id:'proof',sha256:'a'.repeat(64)})).execute('dbo.SP_C4_AdvanceMoney');
    const keys=(id,actor='NV0001')=>pool.request().input('ContractId',sql.VarChar(6),id).input('Actor',sql.VarChar(6),actor).execute('dbo.SP_C4_ReturnKeys');
    const state=async id=>(await pool.request().input('id',sql.VarChar(6),id).query('SELECT * FROM dbo.HopDongThue WHERE MaHopDong=@id')).recordset[0];
    const bed=async id=>(await pool.request().input('id',sql.VarChar(6),id).query("SELECT TinhTrang FROM dbo.Giuong WHERE MaPhong='P0001' AND MaGiuong=@id")).recordset[0].TinhTrang;
    const close=async(id,ds,mode='accepted',extra={})=>{
      const row=(await pool.request().input('id',sql.VarChar(6),ds).query("SELECT d.*,CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT d.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER)),2) AS digest FROM dbo.DoiSoat d WHERE MaDoiSoat=@id")).recordset[0];
      const bundle={web2:{contractId:id,settlementId:ds,mode,refundDueVnd:String(row.SoTienHoanThucTe),topUpDueVnd:String(row.SoTienKhachPhaiTT),paymentProofs:[{sha256:'b'.repeat(64)}]}};
      return pool.request().input('ContractId',sql.VarChar(6),id).input('SettlementId',sql.VarChar(6),ds).input('Mode',sql.VarChar(24),mode).input('Bundle',sql.NVarChar(sql.MAX),JSON.stringify(bundle))
        .input('SourceDigest',sql.VarChar(66),'0x'+'c'.repeat(64)).input('ExpectedRowHash',sql.VarChar(64),extra.digest||row.digest)
        .input('ExpectedRefund',sql.Decimal(15,2),row.SoTienHoanThucTe).input('ExpectedTopUp',sql.Decimal(15,2),row.SoTienKhachPhaiTT)
        .input('PaymentReference',sql.VarChar(500),row.ChungTuThanhToan).input('CaseRevision',sql.Int,extra.revision||1).input('Actor',sql.VarChar(6),'NV0001').execute('dbo.SP_C4_Close');
    };
    await assert.rejects(advance('HD0001','DS0001','without-consent','NV0002'),e=>e.number===50900);
    await assert.rejects(advance('HD0004','DS0004','without-consent'),e=>e.number===50902);
    await advance('HD0001','DS0001','without-consent');
    await assert.rejects(close('HD0001','DS0001','without-consent'),e=>e.number===50902);
    await assert.rejects(keys('HD0001','NV0002'),e=>e.number===50900);
    await keys('HD0001');assert.equal(await bed('G0001'),'Trống');assert.equal(await bed('G0002'),'Đang thuê');
    assert.equal((await state('HD0001')).TrangThai,'Hiệu lực','unpaid contract remains open after keys');
    await pool.request().query("UPDATE dbo.Giuong SET TinhTrang=N'Đang thuê' WHERE MaPhong='P0001' AND MaGiuong='G0001'");
    await keys('HD0001');assert.equal(await bed('G0001'),'Đang thuê','repeat key action cannot release rerented bed');
    await pool.request().query("UPDATE dbo.DoiSoat SET TrangThai=N'Đã quyết toán',NgayThanhToan=GETDATE(),ThoiDiemThanhToan=SYSUTCDATETIME(),ChungTuThanhToan='/uploads/proof.pdf' WHERE MaDoiSoat='DS0001'");
    await close('HD0001','DS0001','without-consent');assert.equal((await state('HD0001')).TrangThai,'Đã thanh lý');
    assert.equal((await close('HD0001','DS0001','without-consent')).recordset[0].duplicate,true);
    await advance('HD0002','DS0002');
    await assert.rejects(close('HD0002','DS0002','accepted',{digest:'0'.repeat(64)}),e=>e.number===50902);
    await assert.rejects(close('HD0002','DS0002','accepted',{revision:2}),e=>e.number===50902);
    await close('HD0002','DS0002');assert.equal((await state('HD0002')).TrangThai,'Đã thanh lý');
    assert.equal(await bed('G0002'),'Đang thuê','closing alone never frees bed');
    await advance('HD0003','DS0003');await assert.rejects(close('HD0003','DS0003'),e=>e.number===50902);
    console.log('C4 SQL verified only in disposable database; HOMEDORM4 unchanged.');
  } finally {
    if(pool)await pool.close();
    if(created){assert.match(database,/^HOMEDORM_C4_TEST_\d+$/);await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`);}
    await master.close();
  }
});
