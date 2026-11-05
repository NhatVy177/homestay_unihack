-- Additive only (D-013). Simulated e-wallet payment orders for deposits.
-- Not a real payment provider: no money moves, no external API is called.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.PaymentSimOrder', 'U') IS NULL
CREATE TABLE dbo.PaymentSimOrder (
  Id varchar(32) NOT NULL PRIMARY KEY,
  Purpose varchar(20) NOT NULL CHECK (Purpose IN ('dat-coc')),
  RefId varchar(6) NOT NULL,
  CustomerId varchar(6) NOT NULL,
  AmountVnd bigint NOT NULL CHECK (AmountVnd > 0),
  Status varchar(12) NOT NULL DEFAULT 'Pending'
    CHECK (Status IN ('Pending', 'Processing', 'Paid', 'Cancelled', 'Failed')),
  GatewayTransId varchar(40) NULL,
  LastError nvarchar(500) NULL,
  CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  PaidAt datetime2 NULL
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PaymentSimOrder_OnePaid')
  EXEC('CREATE UNIQUE INDEX UX_PaymentSimOrder_OnePaid ON dbo.PaymentSimOrder(Purpose, RefId) WHERE Status = ''Paid''');
COMMIT;
