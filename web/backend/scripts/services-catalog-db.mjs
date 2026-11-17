import { pathToFileURL } from 'node:url';

// Danh mục dịch vụ công khai (trang Dịch vụ & tiện ích): thêm 3 cột Nhom, MoTa, TrangThai vào dbo.DichVu (có giá trị mặc định,
// dữ liệu cũ giữ nguyên), bổ sung các dịch vụ còn thiếu và để danh sách chọn dịch vụ khi lập hợp đồng chỉ lấy dịch vụ "Đang cung cấp".
// Chạy lại được nhiều lần. Chỉ chạy trên HOMEDORM4 khi Vy cho phép.
export const ACTIVE = 'Đang cung cấp';

export const ADD_COLUMNS = `
IF COL_LENGTH(N'dbo.DichVu', N'Nhom') IS NULL ALTER TABLE dbo.DichVu ADD Nhom NVARCHAR(30) NULL;
IF COL_LENGTH(N'dbo.DichVu', N'MoTa') IS NULL ALTER TABLE dbo.DichVu ADD MoTa NVARCHAR(300) NULL;
IF COL_LENGTH(N'dbo.DichVu', N'TrangThai') IS NULL ALTER TABLE dbo.DichVu ADD TrangThai NVARCHAR(20) NOT NULL CONSTRAINT DF_DichVu_TrangThai DEFAULT N'${ACTIVE}';`;

// Dịch vụ đã có: chỉ bổ sung nhóm và mô tả khi còn trống.
export const EXISTING = [
  ['Điện', 'Thiết yếu', 'Tiền điện sinh hoạt tính theo chỉ số đồng hồ riêng của phòng.'],
  ['Nước', 'Thiết yếu', 'Tiền nước sinh hoạt tính theo chỉ số đồng hồ riêng của phòng.'],
  ['Wifi', 'Thiết yếu', 'Internet tốc độ cao không giới hạn dung lượng.'],
  ['Gửi xe', 'Thiết yếu', 'Phí giữ xe máy hàng tháng tại bãi xe của tòa nhà.'],
  ['Vệ sinh', 'Tiện ích', 'Dọn dẹp, giữ vệ sinh khu vực chung định kỳ hằng tháng.'],
];

// [tên, nhóm, mô tả, đơn vị tính, đơn giá, trạng thái]
export const NEW_SERVICES = [
  ['Rác sinh hoạt', 'Tiện ích', 'Phí thu gom rác sinh hoạt hằng ngày.', 'tháng', 30000, ACTIVE],
  ['Giặt sấy quần áo', 'Tiện ích', 'Giặt và sấy khô quần áo theo cân (tối đa 5kg mỗi lần).', 'lần', 30000, ACTIVE],
  ['Vệ sinh máy lạnh', 'Tiện ích', 'Vệ sinh, bơm gas và bảo trì máy lạnh định kỳ.', 'lần', 150000, ACTIVE],
  ['Gửi xe ô tô', 'Tiện ích', 'Giữ xe ô tô dưới hầm (đang tạm ngưng do hết chỗ).', 'tháng', 1500000, 'Tạm ngưng'],
  ['Thuê tủ lạnh mini', 'Tiện nghi', 'Cho thuê tủ lạnh mini 90L trang bị riêng cho phòng.', 'tháng', 200000, ACTIVE],
  ['Nước tinh khiết 20L', 'Tiện nghi', 'Giao nước uống đóng bình tinh khiết 20 lít đến tận phòng.', 'bình', 45000, ACTIVE],
  ['Đổi nệm cao su non', 'Tiện nghi', 'Nâng cấp từ nệm mút thông thường sang nệm cao su non êm ái hơn.', 'lần', 500000, 'Sắp ra mắt'],
  ['Gói dọn phòng định kỳ', 'Tiện nghi', 'Dọn phòng 2 lần mỗi tuần xuyên suốt 1 tháng.', 'tháng', 350000, 'Sắp ra mắt'],
  ['Phòng Gym / Fitness', 'Cao cấp', 'Sử dụng không giới hạn phòng tập Gym ở tầng trệt tòa nhà (giá mỗi người).', 'tháng', 300000, 'Sắp ra mắt'],
  ['Hồ bơi chân mây', 'Cao cấp', 'Đặc quyền sử dụng hồ bơi trên sân thượng (giá mỗi người).', 'tháng', 500000, 'Sắp ra mắt'],
];

export const CONTRACT_SERVICE_LIST = `
CREATE OR ALTER PROCEDURE dbo.SP_LayDanhSachDichVu
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MaDichVu,
        TenDichVu,
        DonViTinh,
        DonGia,
        CASE
            WHEN TenDichVu LIKE N'%Điện%' OR TenDichVu LIKE N'%Nước%'
            THEN CAST(1 AS BIT)
            ELSE CAST(0 AS BIT)
        END AS BatBuoc
    FROM dbo.DichVu
    WHERE TrangThai = N'${ACTIVE}'
    ORDER BY
        CASE
            WHEN TenDichVu LIKE N'%Điện%' OR TenDichVu LIKE N'%Nước%' THEN 0
            ELSE 1
        END,
        TenDichVu;
END;`;

async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: services-catalog-db.mjs check|migrate');
  const { getPool, sql } = await import('../database/connection.js');
  const pool = await getPool();
  const db = (await pool.request().query('SELECT DB_NAME() AS n')).recordset[0]?.n;
  if (!/^(HOMEDORM4|HOMEDORM_CONFIRM_TEST_\d+)$/.test(db)) throw new Error('Unexpected migration database.');
  if (mode === 'migrate') {
    await pool.request().batch(ADD_COLUMNS);
    for (const [name, group, text] of EXISTING) {
      await pool.request().input('n', sql.NVarChar(100), name).input('g', sql.NVarChar(30), group).input('t', sql.NVarChar(300), text)
        .query('UPDATE dbo.DichVu SET Nhom = ISNULL(Nhom, @g), MoTa = ISNULL(MoTa, @t) WHERE TenDichVu = @n');
    }
    for (const [name, group, text, unit, price, status] of NEW_SERVICES) {
      await pool.request().input('n', sql.NVarChar(100), name).input('g', sql.NVarChar(30), group).input('t', sql.NVarChar(300), text)
        .input('u', sql.VarChar(20), unit).input('p', sql.Decimal(15, 2), price).input('s', sql.NVarChar(20), status).query(`
IF NOT EXISTS (SELECT 1 FROM dbo.DichVu WHERE TenDichVu = @n)
BEGIN
  DECLARE @ma VARCHAR(6) = CONCAT('DV', RIGHT(CONCAT('0000', (SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(MaDichVu, 3, 4))), 0) + 1 FROM dbo.DichVu WHERE MaDichVu LIKE 'DV[0-9][0-9][0-9][0-9]')), 4));
  INSERT INTO dbo.DichVu (MaDichVu, TenDichVu, DonViTinh, DonGia, Nhom, MoTa, TrangThai) VALUES (@ma, @n, @u, @p, @g, @t, @s);
END`);
    }
    await pool.request().batch(CONTRACT_SERVICE_LIST);
  }
  const columns = (await pool.request().query("SELECT COUNT(*) AS c FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.DichVu') AND name IN (N'Nhom', N'MoTa', N'TrangThai')")).recordset[0].c;
  const total = columns === 3 ? (await pool.request().query('SELECT COUNT(*) AS c, SUM(CASE WHEN TrangThai = N\'' + ACTIVE + '\' THEN 1 ELSE 0 END) AS a FROM dbo.DichVu')).recordset[0] : null;
  console.log(JSON.stringify({ mode, databaseName: db, ready: columns === 3 && total.c >= EXISTING.length + NEW_SERVICES.length, services: total?.c ?? null, active: total?.a ?? null }));
  if (columns !== 3) process.exitCode = 1;
  await pool.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
