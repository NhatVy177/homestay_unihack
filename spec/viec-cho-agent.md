# Việc giao cho AI (Codex hoặc AI khác)

Lập 2026-11-11 (J-C059), kèm [audit-2026-11-11.md](audit-2026-11-11.md). Mỗi khối dưới đây là một prompt dán nguyên văn. **Thứ tự và mức ưu tiên là đề xuất, chờ Vy chốt.**

## Cách dùng

- Mỗi việc một nhánh riêng, một thư mục riêng: `git worktree add ../HomeStayDorm-<ten> -b <nhanh> origin/main`.
- Việc cùng nhóm B có thể chạy song song (mỗi việc một file). Nhóm A làm tuần tự. C1 phải xong trước khi tạo hồ sơ demo trên Fuji.
- Mọi prompt đều ngầm định dòng mở đầu sau, **dán kèm ở đầu**:

```
Đọc AGENTS.md và spec/progress.md rồi làm đúng quy trình trong đó (nhánh riêng, không push main, commit bằng NhatVy177, không Co-Authored-By, hỏi Vy trước khi chạy SQL lên HOMEDORM4, nhật ký mã J-X###). Gặp chỗ quyết định D-xxx không rõ hoặc mâu thuẫn với code: dừng, ghi câu hỏi, hỏi Vy; không tự quyết.
```

## Thứ tự đề xuất

| Ngày | Việc |
|---|---|
| 11/11 | A1, C1 (song song) |
| 12/11 | A2 → A3; B1 |
| 13–15/11 | B2 → B5; C2, C3, C4 |
| 16–17/11 | B6, C5, E1; dự phòng |
| 18–19/11 | D1, D2, D3; E2, E3 nếu còn thời gian |

---

## Nhóm A — Đưa lên Fuji (làm trước mọi việc khác)

### A1 — Tạo ví vận hành và chuẩn bị deploy

```
Việc: chuẩn bị ví thử cho Fuji mà không để khóa bí mật lộ ra màn hình hay Git. Nhánh: chore/fuji-setup.

1. Viết blockchain/scripts/fuji-keygen.mjs: tạo 3 khóa mới bằng viem (deployer kiêm manager, accountant, relayer).
   - Ghi vào blockchain/.env: FUJI_DEPLOYER_PRIVATE_KEY, FUJI_MANAGER_ADDRESS, FUJI_ACCOUNTANT_ADDRESS.
   - Ghi vào blockchain/.fuji-backend-env.local các dòng AVALANCHE_MANAGER_PRIVATE_KEY, AVALANCHE_ACCOUNTANT_PRIVATE_KEY, AVALANCHE_RELAYER_PRIVATE_KEY để Vy tự chép sang web/backend/.env.
   - Console chỉ in 3 ĐỊA CHỈ ví, không in khóa. Từ chối chạy nếu blockchain/.env đã có khóa.
   - Bảo đảm blockchain/.env và *.local nằm trong .gitignore.
2. Viết blockchain/scripts/fuji-fund.mjs: từ ví deployer chuyển 0,3 AVAX thử cho accountant và relayer; in số dư 3 ví. Dừng với thông báo rõ nếu deployer chưa có AVAX.
3. Thêm npm script: fuji:keygen, fuji:fund. Cập nhật blockchain/README.md: các bước, link faucet (https://build.avax.network/console và https://team1vn.xyz/faucet.html).
4. Không deploy trong việc này. Kiểm tra: npm test trong blockchain vẫn qua; chạy fuji:keygen trong thư mục tạm để chắc không in khóa.
Xong thì báo Vy địa chỉ ví deployer để xin faucet (hai ví còn lại nhận AVAX từ fuji:fund).
```

### A2 — Deploy, verify source, chuyển cấu hình sang Fuji

```
Điều kiện: Vy đã chạy fuji:keygen, xin faucet cho ví deployer, chạy fuji:fund. Nhánh: chore/fuji-deploy.

1. cd blockchain && npm test && npm run deploy:fuji (script đọc .env; nếu thiếu --env-file thì sửa npm script cho đúng). Kết quả ghi vào blockchain/deployments/fuji.json — file này commit được vì không có bí mật.
2. Verify source trên explorer Fuji bằng artifacts/standard-input.json (solc 0.8.38, optimizer 200, evmVersion cancun, constructor args manager + accountant). Tra tài liệu hiện hành của Snowtrace/Routescan hoặc Sourcify trước khi làm; viết thành blockchain/scripts/verify-fuji.mjs. Xong thì sửa sourceVerification trong fuji.json thành "verified" kèm link.
3. Hướng dẫn Vy (không tự ghi giá trị bí mật qua chat) đổi web/backend/.env: AVALANCHE_CHAIN_ID=43113, AVALANCHE_RPC_URL, AVALANCHE_CONTRACT_ADDRESS, 3 khóa vận hành lấy từ blockchain/.fuji-backend-env.local; và web/frontend/.env: VITE_AVALANCHE_CHAIN_ID=43113, VITE_AVALANCHE_RPC_URL, VITE_AVALANCHE_CONTRACT_ADDRESS. Giữ một bản .env.local-chain để quay lại chain local.
4. Kiểm tra chỉ đọc: GET /api/avalanche/config trả chainId 43113; đọc manager() và accountant() trên contract khớp fuji.json.
5. README gốc: thêm mục "Triển khai Fuji" với địa chỉ contract và link explorer. Màn quản lý/kế toán và trang kiểm chứng phải hiện link explorer khi chainId = 43113 (kiểm tra XacThucChiTiet.jsx và AvalancheVerifyPage.jsx; sửa nếu thiếu).
Lưu ý: hồ sơ xác nhận tạo trên chain local sẽ báo "Deployment đã đổi" — đúng thiết kế, không sửa dữ liệu cũ.
```

### A3 — Chạy trọn luồng thật một lần (Vy thao tác, AI hỗ trợ)

```
Việc: soạn bảng kiểm và sửa lỗi phát sinh khi Vy chạy luồng thật trên Fuji. Nhánh: fix/fuji-e2e.

1. Viết spec/kiem-thu-fuji.md: bảng các bước Vy bấm trên giao diện, mỗi bước có cột "kết quả mong đợi" và ô ghi link giao dịch:
   hợp đồng ở trạng thái chờ bàn giao → quản lý lập biên bản (có ảnh) → khách mở tab Hợp đồng, yêu cầu chỉnh sửa → quản lý phát hành bản mới → khách xác nhận (nhập OTP Privy thật) → kế toán lập đối soát bản 1 → khách phản đối có lý do → kế toán lập bản 2 → khách đồng ý → tải bản lưu → trang /kiem-chung-avalanche báo khớp → sửa một số trong file, trang báo lệch.
2. Ghi rõ cách chuẩn bị một hợp đồng demo (dùng luồng Web2 thật hoặc script có sẵn; không sửa dữ liệu khác trong HOMEDORM4).
3. Khi Vy báo lỗi ở bước nào: tìm nguyên nhân, sửa, thêm test nếu được. Ghi lại thời hạn phiên Privy quan sát được (D-028).
4. Kết thúc: cập nhật T-08 trong spec/progress.md với link 5 giao dịch (ghi biên bản, khách xác nhận, đối soát bản 1, phản đối, đồng ý bản 2).
```

---

## Nhóm B — Làm lại giao diện 6 màn trên đường demo

Mẫu chung, thay `<…>` theo bảng:

```
Việc: làm lại trình bày màn <TÊN MÀN> theo skill .agents/skills/homestaydorm-ui/SKILL.md. Nhánh: feat/ui-<ma>.
File chính: <FILE>. Tham khảo bố cục (chỉ xem, không chép code): màn tương ứng trong D:\Nam4\Contest\Homestay-Dorm\apps\frontend\src\features\<VAI TRÒ>.

1. Chụp ảnh màn hiện tại ở 1440px và 390px với dữ liệu thật trên máy (nhờ Vy đăng nhập nếu cần), lưu vào web/frontend/.ui-screens/.
2. Bỏ toàn bộ style={{…}} trong file: chuyển sang lớp chung (ui-btn, ui-card, ui-table, ui-badge, ui-form-field…) và component chung (PageHeader, StatusBadge, EmptyState, OverviewCards, FormInput). Thiếu lớp thì thêm vào src/styles/, không viết riêng trong trang.
3. Một tiêu đề, một nút chính mỗi màn; đủ trạng thái đang tải / rỗng / lỗi / thành công; bảng cuộn trong thẻ ở màn hẹp.
4. KHÔNG đổi: API, state, điều kiện hiển thị, chữ nghiệp vụ, logic trong components/xacNhan và lib/avalanche. Nếu file quá dài, được tách component con trong cùng thư mục nhưng giữ nguyên hành vi.
5. Kiểm tra: npm run build; npm run test:avalanche-ui; chụp lại ảnh sau; báo số style={{ trước và sau.
```

| Mã | Màn | File chính | `style` hiện có | Vai trò mẫu |
|---|---|---|---|---|
| B1 | Khách: tab Hợp đồng + khu xác nhận biên bản/đối soát | `pages/khachHang/KhachHangPortalPage.jsx` (chỉ phần tab Hợp đồng), `components/xacNhan/HopDongXacNhanSection.jsx`, `DocumentView.jsx` | 78 (cả file) | customer |
| B2 | Quản lý: Bàn giao phòng + "Khách xác nhận biên bản" | `pages/nhanVienQuanLy/BanGiaoPhongTab.jsx`, `components/xacNhan/QuanLyXacNhanTab.jsx` | 140 | manager |
| B3 | Quản lý: Kiểm tra trả phòng | `pages/nhanVienQuanLy/KiemTraTraPhong.jsx` | 144 | manager |
| B4 | Kế toán: Quyết toán trả phòng + "Khách xác nhận đối soát" | `pages/nhanVienKeToan/QuyetToanTraPhongTab.jsx`, `components/xacNhan/KeToanXacNhanTab.jsx` | 46 | accountant |
| B5 | Trang kiểm chứng + cổng ví mô phỏng | `pages/avalanche/AvalancheVerifyPage.jsx`, `pages/thanhToanMoPhong/ThanhToanMoPhongPage.jsx` | — | landing |
| B6 | Trang chủ + đăng nhập/đăng ký (rà lần cuối) | `pages/TrangChu.jsx` | 0 | landing, auth |

Ghi chú B1: `KhachHangPortalPage.jsx` dài 4.346 dòng. Chỉ sửa phần tab Hợp đồng; tách phần đó thành component riêng nếu cần, không đụng các tab khác.
Ghi chú B5: trang kiểm chứng là màn giám khảo nhìn kỹ nhất. Phải rõ 3 kết quả: khớp, file bị sửa, không đọc được chuỗi; có link explorer.

---

## Nhóm C — Phần T-22 phải có

### C1 — Điều khoản hợp đồng và phiên bản chính sách trong gói bàn giao (D-027, D-031)

```
Việc: bổ sung nội dung gói bằng chứng bàn giao. Nhánh: feat/t22-handover-bundle. KHÔNG sửa contract.

Hiện trạng: web/backend/integrations/avalanche/sources.js (handover) trả inventory, notes, policy; service.js (draft) tạo payload schema homestaydorm.handover.v1.
1. Thêm vào payload bàn giao mục contractTerms: mã hợp đồng, giá thuê, ngày bắt đầu, kỳ hạn, tiền cọc. Lấy từ SQL (HopDongThue và bảng liên quan); KHÔNG đưa họ tên, CCCD, số điện thoại.
2. Thêm policyVersion = 8 ký tự đầu của mã băm SHA-256 của nội dung chính sách (hàm policyText). Hiện mã này cùng nội dung chính sách trên phiếu cọc của khách và trong email cọc (integrations/mail/datCocNotifications.js).
3. Ảnh hợp đồng đã ký: Sale tải lên ở màn lập hợp đồng (dùng cơ chế upload có sẵn). Gói bàn giao chỉ chứa mã băm SHA-256 của file và tên file, không nhúng file (file có dữ liệu cá nhân).
4. Tăng schema lên homestaydorm.handover.v2; DocumentView.jsx và trang kiểm chứng hiển thị được cả v1 và v2.
5. Test: thêm ca vào blockchain/test và web/backend/test cho payload v2; npm test hai nơi; build frontend; test:avalanche-ui.
Chưa rõ tên cột nào thì đọc database/CreateDB/app.sql trước, không đoán.
```

### C2 — Màn kiểm tra trả phòng so trước/sau (D-030 mục 1)

```
Việc: trên màn Kiểm tra trả phòng của quản lý, hiện cạnh nhau tình trạng lúc bàn giao vào (biên bản khách đã xác nhận, kèm ảnh nếu có) và ô nhập tình trạng hiện tại cho từng tài sản. Nhánh: feat/t22-checkout-compare.
1. Khảo sát trước: API và SP hiện có của kiemTraTraPhong; dữ liệu biên bản vào lấy từ đâu (BienBanBanGiao hay hồ sơ AvalancheCase). Báo Vy phương án ngắn trước khi code.
2. Món nào khác đi thì đánh dấu, nhập tiền bồi thường, đính ảnh. Hư hỏng đã ghi lúc vào không được tính cho khách (hiện cảnh báo nếu nhập tiền cho món đó).
3. Làm sau hoặc cùng B3 để tránh hai nhánh cùng sửa KiemTraTraPhong.jsx.
```

### C3 — Bản nháp đối soát tự soạn (D-030 mục 2, 3)

```
Việc: khảo sát rồi bổ sung. Nhánh: feat/t22-settlement-draft.
1. Khảo sát và báo lại: services/doiSoat*.js, khauTruDoiSoat, thuThemDoiSoat, hoanCocDoiSoat hiện đã tự tính những gì; kế toán đang phải nhập tay gì; phiếu thu thêm và phiếu hoàn cọc đã là hai loại riêng chưa.
2. Chỉ làm phần còn thiếu để: bản nháp tự điền tỷ lệ hoàn theo chính sách, nợ thuê/dịch vụ, chi phí sửa chữa từ kết quả kiểm tra, tiền phạt; kế toán rà, chỉnh, bấm gửi.
3. Thu thêm trả được qua ví mô phỏng: thêm loại đơn mới trong integrations/payment-sim theo cách của đơn thu-nhan-phong; IPN lặp chỉ ghi nhận một lần.
4. Test SQL chạy trong transaction rồi rollback, theo mẫu scripts/deposit-flow-verify.mjs.
```

### C4 — Tự thanh lý và gói bằng chứng cuối (D-030 mục 5, D-031 mục 1)

```
Việc: tự thanh lý hợp đồng khi tiền đã xong. Nhánh: feat/t22-auto-liquidation. KHÔNG sửa contract.
1. Điều kiện, tách 3 trường hợp: khách trả thêm → khách đã đồng ý trên chuỗi + đã trả đủ; khách được hoàn → đã đồng ý + kế toán đã chi và có chứng từ; bằng 0 → đã đồng ý. Đủ thì hệ thống tự chuyển hợp đồng sang đã thanh lý. Bỏ nút thanh lý tay.
2. Quản lý bấm "Đã thu chìa khóa" → phòng/giường về Trống.
3. Gói bằng chứng cuối (Web2): thêm mã băm chứng từ chi/thu, số tiền, thời điểm; khách tải được; gửi email. Trang kiểm chứng hiện phần này và ghi rõ "thông tin do bên cho thuê ghi nhận, không nằm trên chuỗi".
4. Khách không phản hồi: email nhắc sau 24 giờ và 72 giờ; quá 7 ngày đánh dấu "Quá hạn phản hồi". Không bao giờ tự chấp nhận thay trên chuỗi.
5. Nếu Vy đã chốt đề xuất P-01 trong audit: thêm thao tác "Thanh lý không có xác nhận của khách" cho quản lý, bắt buộc lý do và file bằng chứng; gói bằng chứng ghi rõ trạng thái này. Chưa chốt thì không làm.
```

### C5 — Hoàn tất phần giữ chỗ đã có code (D-026)

```
Việc: tiếp nhánh feat/t22-backend (đã có SP_KhachGiuCho, SP_KhachKhongThueNua, SP_GhiNhanKhachKhongDen, sửa nhánh từ chối của SP_XacNhanKhaNangNhanCoc).
1. Đọc lại 3 file SQL trong database/SP_DatCoc/ ngày 20261110; hỏi Vy rồi chạy npm run khach-giu-cho:db:migrate.
2. Viết scripts/khach-giu-cho-verify.mjs: thử từng SP trong transaction rồi rollback (gửi được; phòng ngoài buổi xem bị chặn; từ chối đưa hồ sơ về "Đã tiếp nhận"; khách không đến; không thuê nữa).
3. Bổ sung: Sale cũng bấm được "Không thuê nữa"; chặn tạo buổi xem thứ hai cho một hồ sơ (dời giờ vẫn được).
4. Giao diện khách: nút "Giữ chỗ" trên thẻ buổi đã xem (chọn phòng, hình thức, giường), lời nhắn chờ quản lý tối đa 12 giờ, nút "Không thuê nữa"; thanh tiến trình Đã lên lịch → Đã xác nhận → Đã xem → Giữ chỗ. Giao diện Sale: nút "Khách không đến".
```

---

## Nhóm D — Hồ sơ nộp

### D1 — README nộp bài

```
Việc: viết lại README.md gốc cho giám khảo. Nhánh: docs/submission.
Thứ tự: một đoạn bài toán và người dùng → ảnh hoặc sơ đồ luồng → phần trên Avalanche (địa chỉ contract, link explorer, link 5 giao dịch mẫu từ spec/progress.md, vì sao on-chain) → cách chạy từ đầu (dùng lệnh của việc E1) → kiểm thử → phần MÔ PHỎNG (cổng thanh toán, dữ liệu giả) → giới hạn (pháp lý, mất ví, một cặp khóa vận hành) → phần có sẵn từ đồ án nhóm trước cuộc thi và phần làm trong cuộc thi, ghi công (hỏi Vy nội dung Q-07) → thư viện bên thứ ba.
Không viết điều chưa có bằng chứng; không nói đã kiểm toán hay có người dùng thật. Chuyển phần cấu hình chi tiết hiện có sang docs/cau-hinh.md.
```

### D2 — Dàn ý slide

```
Việc: soạn nội dung slide (8–10 trang) thành hackathon/slides.md để Vy dựng trên Canva/Google Slides.
Trang 1 nói ngay phần nào là mô phỏng. Các trang: người dùng và nỗi đau → luồng một hình (Web2 mờ, hai mốc on-chain đậm) → demo → vì sao on-chain, vì sao Avalanche → kiến trúc (ví nhúng, EIP-712, relayer, contract, trang kiểm chứng) → tiền từ đâu (bản thi không giữ tiền; mô hình nếu làm thật) → giới hạn pháp lý và kỹ thuật → việc tiếp theo.
Mỗi trang tối đa 3 ý, kèm lời nói 2–3 câu. Số liệu nào chưa kiểm chứng thì ghi rõ là giả định.
```

### D3 — Kịch bản video 2:30–2:50

```
Việc: viết hackathon/video-script.md theo D-018 và luồng trong spec/kiem-thu-fuji.md: bảng 3 cột (giây, hình trên màn, lời nói). Mở đầu 10 giây nêu vấn đề và nói rõ phần mô phỏng; 110 giây demo liền mạch từ hợp đồng chờ bàn giao đến trang kiểm chứng và explorer; 30 giây vì sao Avalanche và giới hạn. Liệt kê dữ liệu cần chuẩn bị trước khi quay.
```

---

## Nhóm E — Dọn dẹp (khi còn thời gian)

### E1 — Dựng CSDL từ đầu bằng một lệnh

```
Việc: viết web/backend/scripts/db-setup.mjs và npm run db:setup tạo CSDL mới (tên lấy từ DB_NAME) từ database/: CreateDB → GenData → SP_* → Trigger → migrations → các script db:migrate hiện có, đúng thứ tự phụ thuộc. Nhánh: chore/db-setup.
Từ chối chạy nếu CSDL đã có bảng (trừ khi có cờ --force và tên CSDL khác HOMEDORM4). Thử trên một CSDL tên mới, KHÔNG chạy lên HOMEDORM4. Ghi thứ tự vào database/README.md. Báo file SQL nào lỗi hoặc không còn dùng.
```

### E2 — Xóa file frontend không dùng

```
Việc: xóa các file trong web/frontend/src không được import từ đâu. Nhánh: chore/frontend-dead-code.
Danh sách nghi ngờ (17 file, khoảng 3.300 dòng): pages/home/HomePage.jsx, pages/khachDangThue/KhachDangThuePage.jsx, pages/khachMoi/KhachMoiPage.jsx, pages/nhanVienQuanLy/{ThanhLyHopDongTab,xacnhanketqua}.jsx, pages/nhanVienSale/TongQuanTab.jsx, pages/suaChuaBaoTri/*, pages/nhanPhong/nhanPhong.api.js, pages/nhanVienKeToan/nhanVienKeToan.css, components/common/EmployeeAccount.jsx cùng CSS chỉ các file này dùng.
GIỮ LẠI: HoaDonDinhKyTab.jsx, BaoTriSuaChuaTab.jsx, CapNhatDichVuTab.jsx (cần cho D-029), EmptyState, FormInput, StatusBadge (sẽ dùng ở nhóm B).
Tự kiểm lại từng file bằng tìm kiếm import trước khi xóa; npm run build và test:avalanche-ui phải qua. Làm sau khi các nhánh giao diện đã merge.
```

### E3 — Việc nhỏ

```
Việc: (1) gỡ thư viện pg không dùng khỏi web/backend; (2) đổi tên gói happyroom-* thành homestaydorm-*; (3) nén ảnh trong web/frontend/public/images/phong xuống dưới 300 KB mỗi ảnh, giữ tên file; (4) sửa câu "một chi nhánh, ba vai trò" trong spec/scope.md theo mục H1 của audit. Nhánh: chore/small-fixes. Build và test phải qua.
```
