-- C1 / D-034. Apply only after Vy approves HOMEDORM4 migration.
-- No change to Solidity or existing financial records. Repeatable; legacy policy history is NOT invented.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.DepositPolicySnapshot', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DepositPolicySnapshot (
        DepositId varchar(6) NOT NULL PRIMARY KEY REFERENCES dbo.PhieuDatCoc(MaPhieuDatCoc),
        PolicyText nvarchar(max) NULL,
        PolicyVersion char(8) NULL,
        RequiresConfirmation bit NOT NULL DEFAULT 0,
        CapturedAt datetime2 NULL,
        ConfirmedAt datetime2 NULL,
        ConfirmedBy varchar(6) NULL REFERENCES dbo.NguoiDung(MaNguoiDung)
    );
    -- Existing slips need an explicit customer acknowledgment of the supplemental policy.
    -- Only seed at table creation, so rerunning does not mark later slips as legacy.
    INSERT dbo.DepositPolicySnapshot(DepositId, RequiresConfirmation)
        SELECT MaPhieuDatCoc, 1 FROM dbo.PhieuDatCoc;
END;
IF OBJECT_ID(N'dbo.SignedContractEvidence', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SignedContractEvidence (
        ContractId varchar(6) NOT NULL PRIMARY KEY REFERENCES dbo.HopDongThue(MaHopDong),
        StoredName varchar(100) NOT NULL,
        MediaType varchar(40) NOT NULL,
        Sha256 char(64) NOT NULL,
        UploadedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UploadedBy varchar(6) NOT NULL REFERENCES dbo.NguoiDung(MaNguoiDung)
    );
END;
COMMIT TRANSACTION;
