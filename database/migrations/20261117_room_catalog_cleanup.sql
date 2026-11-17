-- D-056 / J-X085. Run through room-catalog-db.mjs, inside its backed-up transaction.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'HOMEDORM4' THROW 51800, 'This maintenance is scoped to HOMEDORM4.', 1;
IF @@TRANCOUNT = 0 THROW 51801, 'Use the maintenance runner with backup and transaction.', 1;

DECLARE @Targets TABLE (MaPhong VARCHAR(4) PRIMARY KEY, TenPhong NVARCHAR(100), MaChiNhanh VARCHAR(6));
INSERT @Targets VALUES
('P921', N'Phòng test HD thu thêm', 'CN0001'),
('P922', N'Phòng test HD không phát sinh', 'CN0001'),
('P923', N'Phòng test HD hoàn cọc', 'CN0001'),
('P924', N'Phòng test cọc hoàn toàn bộ', 'CN0001'),
('P925', N'Phòng test cọc hoàn một phần', 'CN0001'),
('P926', N'Phòng test cọc hoàn cọc', 'CN0001'),
('P927', N'Phòng test yêu cầu trả HĐ 9207', 'CN0001'),
('P928', N'Phòng test yêu cầu trả cọc 9208', 'CN0001'),
('P941', N'Phong test hoan coc con cho', 'CN0003'),
('P942', N'Phong test hoan coc ve trong', 'CN0003');

IF EXISTS (SELECT 1 FROM dbo.Phong p JOIN @Targets t ON t.MaPhong=p.MaPhong
           WHERE p.TenPhong<>t.TenPhong OR p.MaChiNhanh<>t.MaChiNhanh OR p.TinhTrang<>N'Trống')
  THROW 51802, 'A targeted room changed name, branch or occupancy; inspect before deleting.', 1;
IF EXISTS (SELECT 1 FROM dbo.Phong p
           WHERE (p.TenPhong COLLATE Latin1_General_100_CI_AI LIKE N'%test%'
               OR p.TenPhong COLLATE Latin1_General_100_CI_AI LIKE N'%thu nghiem%')
             AND NOT EXISTS (SELECT 1 FROM @Targets t WHERE t.MaPhong=p.MaPhong))
  THROW 51803, 'Additional test rooms found outside the reviewed allowlist.', 1;
IF EXISTS (SELECT 1 FROM dbo.Giuong g JOIN @Targets t ON t.MaPhong=g.MaPhong WHERE g.TinhTrang<>N'Trống')
  THROW 51804, 'A test bed is no longer empty.', 1;

-- Block references in every room-key table, including future tables. Never cascade into customer records.
DECLARE @Ids NVARCHAR(MAX) = N'''P921'',''P922'',''P923'',''P924'',''P925'',''P926'',''P927'',''P928'',''P941'',''P942''';
DECLARE @Table SYSNAME, @Schema SYSNAME, @Check NVARCHAR(MAX);
DECLARE RoomReferences CURSOR LOCAL FAST_FORWARD FOR
  SELECT s.name,t.name FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
  JOIN sys.columns c ON c.object_id=t.object_id
  WHERE c.name=N'MaPhong' AND NOT (s.name=N'dbo' AND t.name IN (N'Phong',N'Giuong'));
OPEN RoomReferences;
FETCH NEXT FROM RoomReferences INTO @Schema,@Table;
WHILE @@FETCH_STATUS=0
BEGIN
  SET @Check=N'IF EXISTS (SELECT 1 FROM '+QUOTENAME(@Schema)+N'.'+QUOTENAME(@Table)
    +N' WITH (HOLDLOCK) WHERE MaPhong IN ('+@Ids+N')) THROW 51805, ''A test room has dependent records; no rows were deleted.'', 1;';
  EXEC sys.sp_executesql @Check;
  FETCH NEXT FROM RoomReferences INTO @Schema,@Table;
END;
CLOSE RoomReferences;
DEALLOCATE RoomReferences;

DECLARE @New TABLE (MaPhong VARCHAR(4) PRIMARY KEY, TemplateId VARCHAR(4), TenPhong NVARCHAR(100), MaChiNhanh VARCHAR(6));
INSERT @New VALUES
('P107','P104',N'Phòng P301','CN0001'),('P108','P105',N'Phòng P302','CN0001'),('P109','P106',N'Phòng P303','CN0001'),
('P207','P204',N'Phòng P301','CN0002'),('P208','P205',N'Phòng P302','CN0002'),('P209','P206',N'Phòng P303','CN0002'),
('P307','P304',N'Phòng P301','CN0003'),('P308','P305',N'Phòng P302','CN0003'),('P309','P306',N'Phòng P303','CN0003');
IF EXISTS (SELECT 1 FROM @New n LEFT JOIN dbo.Phong p ON p.MaPhong=n.TemplateId
           LEFT JOIN dbo.LoaiPhong lp ON lp.MaLoaiPhong=p.MaLoaiPhong
           WHERE p.MaPhong IS NULL OR p.MaChiNhanh<>n.MaChiNhanh OR lp.SucChuaToiDa NOT BETWEEN 1 AND 99 OR lp.SucChuaToiDa IS NULL)
  THROW 51806, 'A third-floor room template is missing or invalid.', 1;
IF EXISTS (SELECT 1 FROM @New n JOIN dbo.Phong p ON p.MaPhong=n.MaPhong
           JOIN dbo.Phong template ON template.MaPhong=n.TemplateId
           WHERE p.MaChiNhanh<>n.MaChiNhanh OR p.TenPhong<>n.TenPhong OR p.MaLoaiPhong<>template.MaLoaiPhong)
  THROW 51807, 'A proposed new room ID is already used by a different room.', 1;
IF EXISTS (SELECT 1 FROM @New n JOIN dbo.Phong p ON p.MaChiNhanh=n.MaChiNhanh AND p.TenPhong=n.TenPhong WHERE p.MaPhong<>n.MaPhong)
  THROW 51808, 'A third-floor room name already exists with another ID.', 1;

-- Preserve all later edits to the deployed procedure, changing only its old floor expression.
DECLARE @Definition NVARCHAR(MAX)=REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.SP_KhachMoi_ChiTietPhong')),CHAR(13),N'');
DECLARE @OldFloor NVARCHAR(MAX)=N'CASE
            WHEN TRY_CONVERT(INT, SUBSTRING(p.MaPhong, 2, 1)) IS NULL THEN NULL
            ELSE TRY_CONVERT(INT, SUBSTRING(p.MaPhong, 2, 1))
        END AS tang';
DECLARE @NewFloor NVARCHAR(MAX)=N'CASE -- D-056: floor from display number, not branch-based database ID.
            WHEN PATINDEX(N''%P[0-9][0-9][0-9]%'', UPPER(p.TenPhong))=0 THEN NULL
            ELSE COALESCE(
                TRY_CONVERT(INT,SUBSTRING(p.TenPhong,PATINDEX(N''%P[0-9][0-9][0-9]%'',UPPER(p.TenPhong))+1,4)),
                TRY_CONVERT(INT,SUBSTRING(p.TenPhong,PATINDEX(N''%P[0-9][0-9][0-9]%'',UPPER(p.TenPhong))+1,3))
            ) / 100
        END AS tang';
IF @Definition IS NULL OR (CHARINDEX(@OldFloor,@Definition)=0 AND CHARINDEX(N'D-056: floor from display number',@Definition)=0)
  THROW 51810, 'Unexpected room detail procedure; inspect its floor expression before changing it.', 1;

DECLARE @RemovedBeds INT, @RemovedRooms INT, @AddedRooms INT, @AddedBeds INT;
DELETE g FROM dbo.Giuong g JOIN @Targets t ON t.MaPhong=g.MaPhong;
SET @RemovedBeds=@@ROWCOUNT;
DELETE p FROM dbo.Phong p JOIN @Targets t ON t.MaPhong=p.MaPhong;
SET @RemovedRooms=@@ROWCOUNT;

DECLARE @Inserted TABLE (MaPhong VARCHAR(4) PRIMARY KEY);
INSERT dbo.Phong (MaPhong,TenPhong,GioiTinhChoPhep,TinhTrang,MaChiNhanh,MaLoaiPhong)
OUTPUT inserted.MaPhong INTO @Inserted
SELECT n.MaPhong,n.TenPhong,template.GioiTinhChoPhep,N'Trống',n.MaChiNhanh,template.MaLoaiPhong
FROM @New n JOIN dbo.Phong template ON template.MaPhong=n.TemplateId
WHERE NOT EXISTS (SELECT 1 FROM dbo.Phong p WHERE p.MaPhong=n.MaPhong);
SET @AddedRooms=@@ROWCOUNT;

;WITH Numbers AS (SELECT TOP (99) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.all_objects)
INSERT dbo.Giuong (MaPhong,MaGiuong,SoGiuong,TinhTrang)
SELECT i.MaPhong,'G'+RIGHT('00'+CONVERT(VARCHAR(2),numbers.n),2),numbers.n,N'Trống'
FROM @Inserted i JOIN dbo.Phong p ON p.MaPhong=i.MaPhong JOIN dbo.LoaiPhong lp ON lp.MaLoaiPhong=p.MaLoaiPhong
JOIN Numbers numbers ON numbers.n<=lp.SucChuaToiDa;
SET @AddedBeds=@@ROWCOUNT;
IF EXISTS (SELECT 1 FROM @New n JOIN dbo.Phong p ON p.MaPhong=n.MaPhong JOIN dbo.LoaiPhong lp ON lp.MaLoaiPhong=p.MaLoaiPhong
           WHERE (SELECT COUNT(*) FROM dbo.Giuong g WHERE g.MaPhong=p.MaPhong)<>lp.SucChuaToiDa)
  THROW 51809, 'Third-floor bed counts do not match room capacities.', 1;

IF CHARINDEX(@OldFloor,@Definition)>0
BEGIN
  SET @Definition=REPLACE(@Definition,@OldFloor,@NewFloor);
  SET @Definition=N'CREATE OR ALTER'+SUBSTRING(@Definition,CHARINDEX(N' PROCEDURE',UPPER(@Definition)),LEN(@Definition));
  EXEC sys.sp_executesql @Definition;
END;

SELECT @RemovedRooms AS removedRooms,@RemovedBeds AS removedBeds,@AddedRooms AS addedRooms,@AddedBeds AS addedBeds;
