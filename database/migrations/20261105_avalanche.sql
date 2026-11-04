-- Additive only. Run against the existing HomeStayDorm SQL Server database.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.AvalancheWallet', 'U') IS NULL
CREATE TABLE dbo.AvalancheWallet (
  UserId varchar(6) NOT NULL PRIMARY KEY,
  Address varchar(42) NOT NULL UNIQUE,
  LinkedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
IF OBJECT_ID('dbo.AvalancheChallenge', 'U') IS NULL
CREATE TABLE dbo.AvalancheChallenge (
  Id varchar(64) NOT NULL PRIMARY KEY, UserId varchar(6) NOT NULL,
  Address varchar(42) NOT NULL, Message nvarchar(2000) NOT NULL,
  ExpiresAt datetime2 NOT NULL, Used bit NOT NULL DEFAULT 0
);
IF OBJECT_ID('dbo.AvalancheCase', 'U') IS NULL
CREATE TABLE dbo.AvalancheCase (
  Id varchar(66) NOT NULL PRIMARY KEY,
  ContractId varchar(6) NOT NULL UNIQUE,
  CustomerId varchar(6) NOT NULL, BranchId varchar(6) NOT NULL,
  Data nvarchar(max) NOT NULL CHECK (ISJSON(Data) = 1),
  Revision int NOT NULL DEFAULT 0
);
COMMIT;
