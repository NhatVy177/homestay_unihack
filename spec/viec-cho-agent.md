# Việc giao cho AI (Codex hoặc AI khác)

Lập 2026-11-11 (J-C059), cập nhật 09:40 cùng ngày (J-C060), kèm [audit-2026-11-11.md](audit-2026-11-11.md). Mỗi khối dưới đây là một prompt dán nguyên văn. Thứ tự và mức ưu tiên theo **D-037** (Vy đã chốt).

**Đã xong:** A1 (J-X058), C1 (J-X061, J-X062), không gian Sale (D-035, D-036), B0 khung chung (J-C061), C2 + B3 (J-C064); **A2 funding/deploy/source verification thật (J-X068)**, config riêng tại worktree A2 và kiểm route config/read roles khớp. **Tiếp A3:** đưa cấu hình vào phiên ứng dụng đầy đủ, chuẩn bị hợp đồng demo và chạy trọn luồng SQL/SMTP/OTP Privy; chưa chạy các bước đó. Song song B1, C6.

**Ai làm việc nào:** mỗi file chỉ một người sửa. **Chia lại 2026-11-11 15:3x (Vy chọn, J-C064)** vì Codex đang chờ AVAX cho A2 nên chuỗi trả phòng đứng yên; thay bảng chia lúc 10:11 (J-C061).
- **Claude:** chuỗi trả phòng C2 (gộp B3, **xong**), C3 (gộp B4), C4; D1–D3 (bản nháp xong). C5: chưa đổi người, đề xuất Claude làm sau C4 vì backend đã viết ở `feat/t22-backend`. Codex **không** sửa: `pages/nhanVienQuanLy/{KiemTraTraPhong,XuLyTraPhongTab,thanhlytraphong,GhiNhanBanGiaoRa,XacNhanPhanHoi}.jsx`, `pages/nhanVienKeToan/QuyetToanTraPhongTab.jsx`, `components/xacNhan/KeToanXacNhanTab.jsx`, `web/backend/services/{doiSoat*,khauTruDoiSoat,thuThemDoiSoat,hoanCocDoiSoat,kiemTraTraPhong,traPhongSoSanh,thanhlytraphong}*.js`, `styles/lists.css` (chỉ thêm ở cuối nếu cần).
- **Codex:** A2, A3 (Fuji, làm trước); **C5-a lịch xem để gỡ A3-01 (Vy giao tại J-C067)**; sau đó B1, B2, B5, B7, C6; E1–E3. Được sửa `components/common/WorkspaceShell.jsx`, `styles/shell.css`, `KhachHangPortalPage.jsx`, các file còn lại trong `components/xacNhan/`, `pages/avalanche/*`, `pages/thanhToanMoPhong/*`, `BanGiaoPhongTab.jsx` khi làm B1/B2/B5.

**Bộ danh sách chung (J-C062, Claude):** `ListSearch`, `TableState`, `ListPagination`, `OverviewCards` lọc được, `StatusBadge` có icon; CSS ở `styles/lists.css` (Claude giữ file này, Codex chỉ thêm quy tắc ở cuối file nếu cần). Codex dùng chúng khi làm B3, B4, B7, C4.

**Quy tắc D-039:** chức năng đã bỏ thì bỏ luôn tab, mục menu, trang, route; nếu chức năng thay thế chưa xong thì bỏ trong cùng việc làm chức năng thay thế.

## Cách dùng

- Mỗi việc một nhánh riêng, một thư mục riêng: `git worktree add ../HomeStayDorm-<ten> -b <nhanh> origin/main`. **Chỉ tạo từ `origin/main` sau khi Vy đã merge nhánh `integration/2026-11-11`**; nếu chưa merge thì tạo từ `origin/integration/2026-11-11`. Không tạo từ `main` cũ (`dcc1a59`): nhánh Sale đã làm vậy nên thiếu AGENTS.md mới và xung đột 6 file.
- Việc cùng nhóm B có thể chạy song song (mỗi việc một file). Nhóm A làm tuần tự. C1 phải xong trước khi tạo hồ sơ demo trên Fuji.
- Mọi prompt đều ngầm định dòng mở đầu sau, **dán kèm ở đầu**:

```
Đọc AGENTS.md và spec/progress.md rồi làm đúng quy trình trong đó (nhánh riêng, không push main, commit bằng NhatVy177, không Co-Authored-By, hỏi Vy trước khi chạy SQL lên HOMEDORM4, nhật ký mã J-X###). Gặp chỗ quyết định D-xxx không rõ hoặc mâu thuẫn với code: dừng, ghi câu hỏi, hỏi Vy; không tự quyết.
```

## Thứ tự đề xuất

| Ngày | Việc |
|---|---|
| 11/11 | ~~A1~~, ~~C1~~ (xong); Vy xin faucet; A2 |
| 12/11 | A3 (Codex + Vy); C6, B7 (Codex); B1 (Claude) |
| 13–15/11 | C2+B3, C3+B4, C4 (Codex); B5, B2, giao diện C5 (Claude) |
| 16–17/11 | backend C5, E1 (Codex); B6 nếu kịp (Claude); dự phòng |
| 18–19/11 | D1, D2, D3; E2, E3 nếu còn thời gian |

---

## Nhóm A — Đưa lên Fuji (làm trước mọi việc khác)

### A1 — Tạo ví vận hành và chuẩn bị deploy (ĐÃ XONG, J-X058)

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

### A2 — Deploy, verify source, chuyển cấu hình sang Fuji (J-X068: deploy/source đã xác minh; env riêng đã chuẩn bị, chưa restart app đầy đủ)

```
Điều kiện: ví deployer 0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f đã có AVAX thử (Vy xin faucet). Nhánh: chore/fuji-deploy. File khóa nằm ở D:\HomeStayDorm-fuji\blockchain (.env và .fuji-backend-env.local, bị Git bỏ qua): chạy các lệnh Fuji tại thư mục đó hoặc nhờ Vy chép hai file sang thư mục làm việc mới; không in nội dung file.

0. Sửa blockchain/scripts/fuji-fund.mjs trước khi chạy: mỗi ví phụ chỉ cần 0,1 AVAX; bỏ qua ví đã có từ 0,1 AVAX trở lên để chạy lại không gửi tiếp; cập nhật test fuji-setup. Sửa npm script deploy:fuji để nạp blockchain/.env (node --env-file=.env …). Rồi chạy npm run fuji:fund.

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
4. Kết thúc: cập nhật T-08 trong spec/progress.md và bảng giao dịch ở README mục 3.4 với link 6 giao dịch (ghi biên bản, khách xác nhận, đối soát bản 1, phản đối, đối soát bản 2, đồng ý bản 2); ghi phí gas đo được.
```

---

## Nhóm B — Làm lại giao diện 6 màn trên đường demo

Mẫu chung, thay `<…>` theo bảng:

```
Việc: làm lại trình bày màn <TÊN MÀN> theo skill .agents/skills/homestaydorm-ui/SKILL.md. Nhánh: feat/ui-<ma>.
File chính: <FILE>. Tham khảo bố cục (chỉ xem, không chép code): màn tương ứng trong D:\Nam4\Contest\Homestay-Dorm\apps\frontend\src\features\<VAI TRÒ>.

1. Chụp ảnh màn hiện tại ở 1440px và 390px với dữ liệu thật trên máy (nhờ Vy đăng nhập nếu cần), lưu vào web/frontend/.ui-screens/.
2. Bỏ toàn bộ style={{…}} trong file: chuyển sang lớp chung (ui-btn, ui-card, ui-table, ui-badge, ui-form-field…) và component chung (PageHeader, StatusBadge, EmptyState, OverviewCards, FormInput). Danh sách làm theo mẫu trong skill (J-C062): OverviewCards có onSelect, ListSearch, StatusFilterTabs, TableState, ListPagination; xem XacNhanThanhToanTab.jsx làm ví dụ. Thiếu lớp thì thêm vào src/styles/, không viết riêng trong trang.
3. Một tiêu đề, một nút chính mỗi màn; đủ trạng thái đang tải / rỗng / lỗi / thành công; bảng cuộn trong thẻ ở màn hẹp.
4. KHÔNG đổi: API, state, điều kiện hiển thị, chữ nghiệp vụ, logic trong components/xacNhan và lib/avalanche. Nếu file quá dài, được tách component con trong cùng thư mục nhưng giữ nguyên hành vi.
5. Kiểm tra: npm run build; npm run test:avalanche-ui; chụp lại ảnh sau; báo số style={{ trước và sau.
```

| Mã | Màn | File chính | `style` hiện có | Vai trò mẫu |
|---|---|---|---|---|
| B1 (Codex, sau Fuji) | Khách: tab Hợp đồng + khu xác nhận biên bản/đối soát | `pages/khachHang/KhachHangPortalPage.jsx` (chỉ phần tab Hợp đồng), `components/xacNhan/HopDongXacNhanSection.jsx`, `DocumentView.jsx` | 78 (cả file) | customer |
| B2 (Codex, sau Fuji) | Quản lý: Bàn giao phòng + "Khách xác nhận biên bản" | `pages/nhanVienQuanLy/BanGiaoPhongTab.jsx`, `components/xacNhan/QuanLyXacNhanTab.jsx` | 140 | manager |
| B3 (Claude, cùng C2, **xong J-C064**) | Quản lý: Kiểm tra trả phòng | `pages/nhanVienQuanLy/KiemTraTraPhong.jsx` | 144 → 0 | manager |
| B4 (Claude, cùng C3) | Kế toán: Quyết toán trả phòng + "Khách xác nhận đối soát" | `pages/nhanVienKeToan/QuyetToanTraPhongTab.jsx`, `components/xacNhan/KeToanXacNhanTab.jsx` | 46 | accountant |
| B5 (Codex, sau Fuji) | Trang kiểm chứng + cổng ví mô phỏng | `pages/avalanche/AvalancheVerifyPage.jsx`, `pages/thanhToanMoPhong/ThanhToanMoPhongPage.jsx` | — | landing |
| B6 (Claude, nếu kịp) | Trang chủ + đăng nhập/đăng ký (rà lần cuối) | `pages/TrangChu.jsx` | 0 | landing, auth |

| B7 (Codex) | Sale: việc nhỏ còn lại sau D-036 (prompt riêng bên dưới) | `pages/nhanVienSale/*` | — | sale |

Ghi chú B1: `KhachHangPortalPage.jsx` dài 4.346 dòng. Chỉ sửa phần tab Hợp đồng; tách phần đó thành component riêng nếu cần, không đụng các tab khác.
Ghi chú B5: trang kiểm chứng là màn giám khảo nhìn kỹ nhất. Phải rõ 3 kết quả: khớp, file bị sửa, không đọc được chuỗi; có link explorer.

### B0 — Khung chung (ĐÃ XONG, J-C061)

Tất cả vai trò dùng `components/common/WorkspaceShell.jsx`; CSS ở `styles/shell.css` (lớp `.ui-workspace`). Kiểm tra: `npm run test:shell-ui`.

### B7 — Việc nhỏ còn lại của không gian Sale

```
Việc: sửa các điểm còn lại sau đợt xem nhánh feat/ui-sale-workspace (J-C060). Nhánh: feat/ui-sale-followup.
1. Tổng quan: "Xử lý đặt cọc / thu tiền tại quầy" đang là một dòng chữ nhỏ; đưa thành thẻ hành động thứ năm ngang hàng 4 thẻ còn lại. Màn Lập hợp đồng: "Hỗ trợ khai thông tin người ở" đưa thành nút phụ cạnh "Hợp đồng đã lập".
2. Ô chọn ngày đang hiện mm/dd/yyyy theo trình duyệt: hiện dd/mm/yyyy (đặt lang="vi" cho thẻ html hoặc dùng cách hiển thị sẵn có của dự án).
3. web/frontend/src/styles/contractPresentation.css có 170 lớp đánh số (lhd-display-001…) sinh ra khi chuyển style viết tay: gộp các lớp trùng nội dung, đổi tên theo ý nghĩa cho các lớp dùng từ 3 lần trở lên; bản in hợp đồng (window.print) phải giữ nguyên hình thức. Không cần xử lý hết nếu quá 2 giờ.
4. Theo D-039, xóa các tab Sale đã bỏ khỏi nghiệp vụ mà file vẫn còn: DangKyTraPhongTab.jsx (trả phòng, D-036), TraCuuPhongTab.jsx (Kiểm tra phòng/giường, D-035) cùng CSS chỉ chúng dùng; tìm import trước khi xóa; giữ API backend.
5. Nhờ Vy đăng nhập tài khoản Sale thật, đi một lượt: tiếp nhận hồ sơ → lập lịch → thu cọc tiền mặt → lập hợp đồng → tải ảnh hợp đồng đã ký. Ghi lỗi gặp phải và sửa.
Kiểm tra: build, test:avalanche-ui, test:handover-ui, ui-sale-workspace.mjs.
```

---

## Nhóm C — Phần T-22 phải có

### C1 — Điều khoản hợp đồng và phiên bản chính sách trong gói bàn giao (ĐÃ XONG, J-X061)

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

### C2 — Màn kiểm tra trả phòng so trước/sau (D-030 mục 1) (ĐÃ XONG, Claude, J-C064; nhánh `feat/t22-checkout`)

```
Việc: trên màn Kiểm tra trả phòng của quản lý, hiện cạnh nhau tình trạng lúc bàn giao vào (biên bản khách đã xác nhận, kèm ảnh nếu có) và ô nhập tình trạng hiện tại cho từng tài sản. Nhánh: feat/t22-checkout-compare.
1. Khảo sát trước: API và SP hiện có của kiemTraTraPhong; dữ liệu biên bản vào lấy từ đâu (BienBanBanGiao hay hồ sơ AvalancheCase). Báo Vy phương án ngắn trước khi code.
2. Món nào khác đi thì đánh dấu, nhập tiền bồi thường, đính ảnh. Hư hỏng đã ghi lúc vào không được tính cho khách (hiện cảnh báo nếu nhập tiền cho món đó).
3. Làm sau hoặc cùng B3 để tránh hai nhánh cùng sửa KiemTraTraPhong.jsx.
```

### C3 — Bản nháp đối soát tự soạn (D-030 mục 2, 3) (Claude, ĐÃ XONG CODE J-C066; còn chạy migration và B4)

Ghi chú cho Codex: C3 đã thêm `pages/khachHang/ThuThemDoiSoatWalletCard.jsx` và **một dòng** gắn thẻ này ngay dưới `ThuNhanPhongWalletCard` trong `KhachHangPortalPage.jsx` (tab Hợp đồng), và sửa 2 chỗ chữ trong `pages/thanhToanMoPhong/ThanhToanMoPhongPage.jsx` cho loại đơn `thu-them-doi-soat`. Khi làm B1/B5 giữ nguyên hai thay đổi này.


```
Việc: khảo sát rồi bổ sung. Nhánh: feat/t22-settlement-draft.
1. Khảo sát và báo lại: services/doiSoat*.js, khauTruDoiSoat, thuThemDoiSoat, hoanCocDoiSoat hiện đã tự tính những gì; kế toán đang phải nhập tay gì; phiếu thu thêm và phiếu hoàn cọc đã là hai loại riêng chưa.
2. Chỉ làm phần còn thiếu để: bản nháp tự điền tỷ lệ hoàn theo chính sách, nợ thuê/dịch vụ, chi phí sửa chữa từ kết quả kiểm tra, tiền phạt; kế toán rà, chỉnh, bấm gửi.
3. Thu thêm trả được qua ví mô phỏng: thêm loại đơn mới trong integrations/payment-sim theo cách của đơn thu-nhan-phong; IPN lặp chỉ ghi nhận một lần.
4. Test SQL chạy trong transaction rồi rollback, theo mẫu scripts/deposit-flow-verify.mjs.
```

### C4 — Tự thanh lý và gói bằng chứng cuối (D-030 mục 5, D-031 mục 1, D-041) (Vy giao lại Codex 12/11)

D-041: thanh lý không có xác nhận vẫn phải đủ thu/hoàn/chứng từ; nút đóng khóa và báo khoản thiếu. Thu chìa khóa/nhả phòng không phụ thuộc đóng hợp đồng. C4 làm ở nhánh/worktree riêng `feat/t22-auto-liquidation`/`D:\HomeStayDorm-c4`, không sửa Solidity. Quyền giữ file của Claude trước đây được chuyển cho Codex trong phạm vi C4 theo yêu cầu mới của Vy; giữ C3/B4 và ghi chú B1/B5. Migration C4 cần xin riêng.

```
Việc: tự thanh lý hợp đồng khi tiền đã xong. Nhánh: feat/t22-auto-liquidation. KHÔNG sửa contract.
1. Điều kiện, tách 3 trường hợp: khách trả thêm → khách đã đồng ý trên chuỗi + đã trả đủ; khách được hoàn → đã đồng ý + kế toán đã chi và có chứng từ; bằng 0 → đã đồng ý. Đủ thì hệ thống tự chuyển hợp đồng sang đã thanh lý. Bỏ nút thanh lý tay.
2. Quản lý bấm "Đã thu chìa khóa" → phòng/giường về Trống.
3. Gói bằng chứng cuối (Web2): thêm mã băm chứng từ chi/thu, số tiền, thời điểm; khách tải được; gửi email. Trang kiểm chứng hiện phần này và ghi rõ "thông tin do bên cho thuê ghi nhận, không nằm trên chuỗi".
4. Khách không phản hồi: email nhắc sau 24 giờ và 72 giờ; quá 7 ngày đánh dấu "Quá hạn phản hồi". Không bao giờ tự chấp nhận thay trên chuỗi.
6. Theo D-039: khi tự thanh lý đã chạy, bỏ tab con "Thanh lý trả phòng" trong pages/nhanVienQuanLy/XuLyTraPhongTab.jsx (và file thanhlytraphong.jsx nếu không còn ai dùng); nếu "Ghi nhận bàn giao ra" được thay bằng nút "Đã thu chìa khóa" thì bỏ luôn tab con đó. Không để lại tab chết.
5. Theo D-038 (đã chốt): thêm thao tác "Thanh lý không có xác nhận của khách" cho quản lý, chỉ bật khi đã quá 7 ngày kể từ lúc gửi (biên bản bàn giao hoặc đối soát) hoặc đối soát đang bị phản đối; bắt buộc lý do và file bằng chứng đã liên hệ. Không gọi contract; gói bằng chứng cuối và trang kiểm chứng ghi rõ "đóng không có xác nhận của khách". Trường hợp bàn giao chưa từng được xác nhận: đối soát chỉ chạy ở Web2, không ghi lên chuỗi.
```

### C5 — Hoàn tất phần giữ chỗ đã có code (D-026)

**C5-a / A3-01 — Codex, J-X070:** code ở `fix/c5a-viewing-status` từ main `0b42fb2`, worktree `D:\HomeStayDorm-c5a`. Bỏ hàm tự chuyển Đã xem, các lời gọi JS và scheduler; bỏ 8 khối tự UPDATE trong SQL nguồn. Thêm hai thao tác Sale **Đã xem / Khách không đến** qua route cập nhật lịch đang có; SP `SP_GhiNhanKetQuaBuoiXem` kiểm nhân viên đang hoạt động, phụ trách hồ sơ, cùng chi nhánh, đã đến giờ, chưa có kết quả/chuyển bước cọc; khóa để hai yêu cầu đồng thời không ghi đè nhau. Khách không đến không tự đóng hồ sơ. Không nới điều kiện đặt lịch từ ngày mai 07:00–17:00.

Migration `viewing-status:db:migrate` giữ nguyên phần khác của SP đã triển khai, chỉ gỡ khối tự đánh dấu, mở rộng ràng buộc cho Khách không đến và cài SP mới; tất cả trong một transaction, chạy lại được, không UPDATE dữ liệu cũ. **J-X071 (12/11): Vy cho tiếp tục sau câu hỏi SQL, đã migrate HOMEDORM4.** Trước còn 4 khối trong 8 SP, sau check cả 8 đều 0; SP mới khớp nguồn, ràng buộc trạng thái enabled/trusted, số dòng/checksum ba bảng lịch/đăng ký/cọc khớp trước–sau. Không ghi kết quả trên lịch cũ. Sau migration/merge phải restart các backend đang dùng code cũ trước khi A3 tiếp tục; SQL migration không thể đổi hàm JS đã nạp trong tiến trình cũ. Phần giữ chỗ/Không thuê nữa/chặn lịch thứ hai của C5 vẫn chưa làm trong C5-a.

Kiểm tra mới: backend 45 pass/2 skip; blockchain 25 pass/1 skip; SQL tích hợp 1 pass riêng trên CSDL tạm `HOMEDORM_C5A_TEST_*` (đã xóa sau test, không seed HOMEDORM4); build + avalanche smoke qua; `node scripts/ui-viewing-outcomes.mjs` qua ở 1440/390 (API giả, 6 ảnh tại `.ui-screens/c5a-viewing-status/`, không commit). Chưa nghiệm thu thao tác thật với hồ sơ demo A3/Fuji. Các thay đổi C3 ghi chú cho B1/B5 phía trên được giữ nguyên.

```
Việc: tiếp nhánh feat/t22-backend (đã có SP_KhachGiuCho, SP_KhachKhongThueNua, SP_GhiNhanKhachKhongDen, sửa nhánh từ chối của SP_XacNhanKhaNangNhanCoc).
1. Đọc lại 3 file SQL trong database/SP_DatCoc/ ngày 20261110; hỏi Vy rồi chạy npm run khach-giu-cho:db:migrate.
2. Viết scripts/khach-giu-cho-verify.mjs: thử từng SP trong transaction rồi rollback (gửi được; phòng ngoài buổi xem bị chặn; từ chối đưa hồ sơ về "Đã tiếp nhận"; khách không đến; không thuê nữa).
3. Bổ sung: Sale cũng bấm được "Không thuê nữa"; chặn tạo buổi xem thứ hai cho một hồ sơ (dời giờ vẫn được).
4. Giao diện khách: nút "Giữ chỗ" trên thẻ buổi đã xem (chọn phòng, hình thức, giường), lời nhắn chờ quản lý tối đa 12 giờ, nút "Không thuê nữa"; thanh tiến trình Đã lên lịch → Đã xác nhận → Đã xem → Giữ chỗ. Giao diện Sale: nút "Khách không đến".
```

### C6 — Điều khoản xác nhận điện tử và ô đồng ý dữ liệu cá nhân (D-038) (Codex, sau Fuji)

```
Việc nhỏ, chỉ sửa chữ và một ô tích. Nhánh: feat/t22-consent-wording.
1. Mẫu hợp đồng in trong web/frontend/src/pages/nhanVienSale/LapHopDongTab.jsx (khối #print-area-wrapper): thêm một điều khoản, đặt trước phần chữ ký: "Hai bên đồng ý sử dụng xác nhận điện tử trên hệ thống HomeStayDorm cho biên bản bàn giao phòng và bảng đối soát tiền cọc. Bên thuê có 7 ngày kể từ khi nhận thông báo để xác nhận hoặc phản hồi; quá thời hạn này Bên cho thuê được xử lý theo hợp đồng và ghi nhận rõ là chưa có xác nhận của Bên thuê." Hỏi Vy nếu muốn đổi câu chữ.
2. Rà chữ hiển thị ở frontend và email: chỗ nào gọi "chữ ký số", "ký số", "ký blockchain" thì đổi thành "xác nhận điện tử". Không đổi tên biến, API, chữ trong test đang so khớp (nếu test so khớp chuỗi đó thì sửa cả test).
3. Màn khai người ở (NhanPhongTab.jsx và màn khách tự khai nếu đã có): thêm ô tích bắt buộc "Tôi xác nhận các thành viên có tên trên đây đồng ý cung cấp thông tin để làm thủ tục thuê phòng và đăng ký tạm trú." Chưa tích thì không gửi được. Chỉ chặn ở giao diện, không đổi SP.
4. Kiểm tra: build, test:avalanche-ui, test:handover-ui; chụp ảnh hợp đồng in và màn khai người ở.
```

---

## Nhóm D — Hồ sơ nộp

### D1 — README nộp bài (BẢN NHÁP XONG, J-C063; điền số liệu Fuji sau A2/A3, ghi công sau Q-07)

```
Việc: viết lại README.md gốc cho giám khảo. Nhánh: docs/submission.
Thứ tự: một đoạn bài toán và người dùng → ảnh hoặc sơ đồ luồng → phần trên Avalanche (địa chỉ contract, link explorer, link 6 giao dịch mẫu từ spec/progress.md, vì sao on-chain) → cách chạy từ đầu (dùng lệnh của việc E1) → kiểm thử → phần MÔ PHỎNG (cổng thanh toán, dữ liệu giả) → giới hạn (pháp lý, mất ví, một cặp khóa vận hành) → phần có sẵn từ đồ án nhóm trước cuộc thi và phần làm trong cuộc thi, ghi công (hỏi Vy nội dung Q-07) → thư viện bên thứ ba.
Không viết điều chưa có bằng chứng; không nói đã kiểm toán hay có người dùng thật. Chuyển phần cấu hình chi tiết hiện có sang docs/cau-hinh.md.
```

### D2 — Dàn ý slide (BẢN NHÁP XONG, J-C063: `hackathon/slides.md`)

```
Việc: soạn nội dung slide (8–10 trang) thành hackathon/slides.md để Vy dựng trên Canva/Google Slides.
Trang 1 nói ngay phần nào là mô phỏng. Các trang: người dùng và nỗi đau → luồng một hình (Web2 mờ, hai mốc on-chain đậm) → demo → vì sao on-chain, vì sao Avalanche → kiến trúc (ví nhúng, EIP-712, relayer, contract, trang kiểm chứng) → tiền từ đâu (bản thi không giữ tiền; mô hình nếu làm thật) → giới hạn pháp lý và kỹ thuật → việc tiếp theo.
Mỗi trang tối đa 3 ý, kèm lời nói 2–3 câu. Số liệu nào chưa kiểm chứng thì ghi rõ là giả định.
```

### D3 — Kịch bản video 2:30–2:50 (BẢN NHÁP XONG, J-C063: `hackathon/video-script.md`)

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
