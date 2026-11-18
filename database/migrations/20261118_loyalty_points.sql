SET XACT_ABORT ON;
GO

IF OBJECT_ID('dbo.LoyaltyOperation', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LoyaltyOperation (
        Id VARCHAR(66) NOT NULL PRIMARY KEY,
        Kind VARCHAR(6) NOT NULL CHECK (Kind IN ('Award', 'Redeem')),
        CustomerId VARCHAR(6) NOT NULL,
        ContractId VARCHAR(6) NOT NULL,
        EarnedInvoiceId VARCHAR(6) NULL,
        Wallet VARCHAR(42) NULL,
        Status VARCHAR(10) NOT NULL CHECK (Status IN ('Quoted', 'Queued', 'Sent', 'Confirmed', 'Failed')),
        Deadline BIGINT NULL,
        Signature VARCHAR(MAX) NULL,
        PendingTx NVARCHAR(MAX) NULL,
        TxHash VARCHAR(66) NULL,
        ChainId INT NOT NULL,
        TokenAddress VARCHAR(42) NOT NULL,
        DiscountVnd INT NULL,
        AppliedInvoiceId VARCHAR(6) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ConfirmedAt DATETIME2 NULL,
        CONSTRAINT CK_LoyaltyOperation_Kind CHECK (
            (Kind = 'Award' AND EarnedInvoiceId IS NOT NULL AND DiscountVnd IS NULL AND AppliedInvoiceId IS NULL)
            OR (Kind = 'Redeem' AND EarnedInvoiceId IS NULL AND DiscountVnd > 0 AND Deadline IS NOT NULL AND Wallet IS NOT NULL)
        )
    );
    CREATE UNIQUE INDEX UX_LoyaltyOperation_Invoice ON dbo.LoyaltyOperation(EarnedInvoiceId) WHERE EarnedInvoiceId IS NOT NULL;
    CREATE UNIQUE INDEX UX_LoyaltyOperation_AppliedInvoice ON dbo.LoyaltyOperation(AppliedInvoiceId) WHERE AppliedInvoiceId IS NOT NULL;
    CREATE INDEX IX_LoyaltyOperation_Queue ON dbo.LoyaltyOperation(ChainId, TokenAddress, Status, CreatedAt);
    CREATE INDEX IX_LoyaltyOperation_Customer ON dbo.LoyaltyOperation(CustomerId, CreatedAt);
    CREATE INDEX IX_LoyaltyOperation_Vouchers ON dbo.LoyaltyOperation(ContractId, Kind, Status, AppliedInvoiceId, ConfirmedAt);
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Loyalty_ApplyVoucher
    @MaHoaDon VARCHAR(6),
    @MaHopDong VARCHAR(6),
    @Giam INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF @@TRANCOUNT = 0 THROW 51003, N'Voucher phải áp dụng trong giao dịch lập hóa đơn.', 1;
    SET @Giam = ISNULL((SELECT DiscountVnd FROM dbo.LoyaltyOperation WHERE AppliedInvoiceId = @MaHoaDon), 0);
    IF @Giam > 0 RETURN;

    DECLARE @id VARCHAR(66), @amount INT;
    SELECT TOP (1) @id = op.Id, @amount = op.DiscountVnd
    FROM dbo.LoyaltyOperation op WITH (UPDLOCK, HOLDLOCK)
    JOIN dbo.HoaDon hd ON hd.MaHoaDon = @MaHoaDon AND hd.MaHopDong = @MaHopDong
    JOIN dbo.HopDongThue h ON h.MaHopDong = op.ContractId AND h.MaKhachHang = op.CustomerId
    WHERE op.Kind = 'Redeem' AND op.Status = 'Confirmed' AND op.AppliedInvoiceId IS NULL
        AND op.ContractId = @MaHopDong AND hd.TrangThai = N'Chưa TT'
        AND hd.KyThanhToan > CONVERT(CHAR(7), h.NgayBatDau, 126)
        AND hd.TongTien > op.DiscountVnd
    ORDER BY op.ConfirmedAt, op.Id;

    IF @id IS NOT NULL
    BEGIN
        UPDATE dbo.LoyaltyOperation SET AppliedInvoiceId = @MaHoaDon WHERE Id = @id;
        UPDATE dbo.HoaDon SET TongTien = TongTien - @amount WHERE MaHoaDon = @MaHoaDon;
        SET @Giam = @amount;
    END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Loyalty_InvoiceDiscounts
    @MaHopDong VARCHAR(6) = NULL,
    @MaHoaDon VARCHAR(6) = NULL,
    @MaKhachHang VARCHAR(6) = NULL,
    @ChoApDung BIT = 0,
    @MinhChung BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    IF @MinhChung = 1
    BEGIN
        SELECT Kind AS kind, ChainId AS chainId, TxHash AS txHash
        FROM dbo.LoyaltyOperation
        WHERE @MaHoaDon IS NOT NULL AND Status = 'Confirmed' AND TxHash IS NOT NULL
            AND (EarnedInvoiceId = @MaHoaDon OR AppliedInvoiceId = @MaHoaDon);
        RETURN;
    END;
    IF @ChoApDung = 1
    BEGIN
        SELECT TOP (1) CAST(NULL AS VARCHAR(6)) AS maHoaDon, DiscountVnd AS giamDiemThuong
        FROM dbo.LoyaltyOperation
        WHERE ContractId = @MaHopDong AND Kind = 'Redeem' AND Status = 'Confirmed' AND AppliedInvoiceId IS NULL
        ORDER BY ConfirmedAt, Id;
        RETURN;
    END;
    SELECT AppliedInvoiceId AS maHoaDon, DiscountVnd AS giamDiemThuong
    FROM dbo.LoyaltyOperation
    WHERE AppliedInvoiceId IS NOT NULL
        AND (@MaHopDong IS NULL OR ContractId = @MaHopDong)
        AND (@MaHoaDon IS NULL OR AppliedInvoiceId = @MaHoaDon)
        AND (@MaKhachHang IS NULL OR CustomerId = @MaKhachHang);
END;
GO
