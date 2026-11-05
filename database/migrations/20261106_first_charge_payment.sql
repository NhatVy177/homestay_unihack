-- D-018: add first-charge orders and a distinct simulated-wallet method without changing existing invoices.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.PaymentSimOrder', 'MaHoaDon') IS NULL
  ALTER TABLE dbo.PaymentSimOrder ADD MaHoaDon varchar(6) NULL;

DECLARE @purposeCheck sysname = (
  SELECT TOP (1) name FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('dbo.PaymentSimOrder') AND definition LIKE '%Purpose%'
);
IF @purposeCheck IS NOT NULL
BEGIN
  DECLARE @dropPurposeSql nvarchar(max) = N'ALTER TABLE dbo.PaymentSimOrder DROP CONSTRAINT ' + QUOTENAME(@purposeCheck);
  EXEC sys.sp_executesql @dropPurposeSql;
END;
ALTER TABLE dbo.PaymentSimOrder ADD CONSTRAINT CK_PaymentSimOrder_Purpose
  CHECK (Purpose IN ('dat-coc', 'thu-nhan-phong'));

IF EXISTS (SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.PaymentSimOrder') AND name = 'AmountVnd' AND system_type_id = 127)
BEGIN
  DECLARE @amountCheck sysname = (
    SELECT TOP (1) name FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.PaymentSimOrder') AND definition LIKE '%AmountVnd%'
  );
  IF @amountCheck IS NOT NULL
  BEGIN
    DECLARE @dropAmountSql nvarchar(max) = N'ALTER TABLE dbo.PaymentSimOrder DROP CONSTRAINT ' + QUOTENAME(@amountCheck);
    EXEC sys.sp_executesql @dropAmountSql;
  END;
  ALTER TABLE dbo.PaymentSimOrder ALTER COLUMN AmountVnd decimal(15,2) NOT NULL;
END;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.PaymentSimOrder')
  AND definition LIKE '%AmountVnd%')
  ALTER TABLE dbo.PaymentSimOrder ADD CONSTRAINT CK_PaymentSimOrder_Amount CHECK (AmountVnd > 0);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_PaymentSimOrder_HoaDon')
  ALTER TABLE dbo.PaymentSimOrder ADD CONSTRAINT FK_PaymentSimOrder_HoaDon
    FOREIGN KEY (MaHoaDon) REFERENCES dbo.HoaDon(MaHoaDon);

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.HoaDon')
  AND name = 'CHK_HD_PhuongThuc')
  ALTER TABLE dbo.HoaDon DROP CONSTRAINT CHK_HD_PhuongThuc;
ALTER TABLE dbo.HoaDon ADD CONSTRAINT CHK_HD_PhuongThuc
  CHECK (PhuongThucThanhToan IN (N'Tiền mặt', N'Chuyển khoản', N'Ví điện tử'));

COMMIT TRANSACTION;
