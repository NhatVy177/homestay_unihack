# Tiến độ hiện tại

Cập nhật: **2026-11-18 00:17:17 +07:00** (J-A001: đồng bộ giao diện & tính năng Admin từ Nam4 sang theo tone xanh). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Quản trị viên (Admin) — đồng bộ Nam4 trên main (J-A001)

- Đã tích hợp các màn hình và chức năng quản trị từ `D:\Nam4\Contest\Homestay-Dorm` sang `web/frontend`:
  + Thêm 3 tab mới: **Khách hàng** (`customers`), **Tài sản** (`assets`), **Điều kiện lưu trú** (`conditions`).
  + Tạo `admin-nam4.css` chuyển đổi toàn bộ màu nâu be của Nam4 sang màu xanh thương hiệu hệ thống (`--color-primary: #4A6549`, tokens.css).
  + Thêm các thành phần giao diện chuẩn: KPI cards, Drawer trượt bên phải (slideInRight), bộ lọc tìm kiếm và lọc danh mục, các badge mức độ (Bắt buộc, Quan trọng, Khuyến nghị), thanh tiến độ lấp đầy, modal thêm/sửa.
  + Kiểm thử: Frontend build PASS, `test:avalanche-ui` PASS, `web/backend` 127 PASS / 0 FAIL / 4 SKIP, `blockchain` 25 PASS / 0 FAIL / 1 SKIP.


## Trang chủ/nhà3D trên main

- **J-X087:** Vy hỏi “sửa đâu, push main chưa”; cho phép gộp nhánh `fix/home-3d-branch-layout` (`f6f8dc5`, gồm D-055/J-X084 và bỏ nhãn tầng J-X086) vào main mới nhất `f9954b6`. Làm trong nhánh/worktree riêng `integration/house-main`/`D:\HomeStayDorm-house-main`, giữ thay đổi main J-C173/J-C174/J-C175. `main` dùng nhà dựng theo tầng/phòng từng chi nhánh, không vẽ nhãnTầng trên mặt nhà, giữ bộ chọn tầng/số đếm và tên phòng khi mở.
- Mọi nút phòng mở route hiện hành **`/phong/<mã phòng>`**; nút bản đồ mở **`/phong?khuVuc=...`**. Test ui-house-layout đã đổi kỳ vọng điều hướng theo J-C174; không khôi phục liên kết khám phá cũ. Journal hợp nhất giữ cả lịch sử main và UI, sắp theo thời gian; không đổi quy tắc thuê.
- **Kiểm mới bản gộp:**3 helper pass; frontend build pass (cảnh báo dependencies/chunk lớn), ui-house-layout pass1440/390 (4→2→1→empty→unknown, đầy đủ phòng, expand và route mới); ui-home pass1440/1024/768/390/320 + empty/error, gồm route nút bản đồ. Smoke xác nhận chạy lại pass Verify/D-017/D-018/D-023/D-024 trong đợtJ-X087. Lượt build song song đầu bị VirtualAlloc1455/out-of-memory, đã chạy tuần tự vớiGOMAXPROCS2 và build lại pass; npm.ps1 có NullReference ở lượt song song nên chạy script Node trực tiếp. Đây là cấu hình kiểm thử tạm, không đổi env/source app.
- DB hiện có43 phòng sau đợt D-056/J-X085 đã áp dụng thật (Quận1/Bình Thạnh15, Thủ Đức13, có3 phòng tầng3/chi nhánh). Nhánh SQL bảo trì `chore/room-catalog-cleanup`/`e30296a` vẫn riêng; đợt gộp này không chạy lại migration hoặc backend/blockchaintest, không coi kết quả cũ là kiểm mới.
- Cuối đợt: commit merge NhatVy177, push `HEAD:main`, đối chiếu hash remote; fast-forward checkout gốc `D:\HomeStayDorm` khi vẫn sạch/đúngmain để Vite5173 phục vụ code đã gộp. Bản build kiểm ở5201; bản review cũ5200 vẫn trên nhánh riêng. Không ghi DB/SMTP/Privy/Fuji trong đợt này.


Cập nhật: **2026-11-15 01:10:30 +07:00** (J-C105: chặn lệch giới tính sớm, D-047; J-C103: tab khách "Thông tin cư trú", chờ migration; J-C099: tab "Hóa đơn của tôi" khớp mẫu nhóm; J-C093: tab khách "Hóa đơn & thanh toán" nhiều kỳ; J-C092: D-046 thư mời thành viên cư trú; trước đó J-C090: khách tự gửi giữ chỗ "Tôi muốn đặt cọc", Sale "Lập lịch xem phòng mới"; D-045 đã migrate và gộp ở `integration/d043-d045`). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Tóm tắt

**Cách làm tạm thời D-061:** Vy xác nhận hiện chỉ Codex sửa code; hoàn tất/kiểm tra rồi chủ động commit/gộp/push main, không chờ lệnh merge mỗi đợt. AGENTS đã cập nhật ngoại lệ; có người/AI khác cùng sửa hoặc Vy yêu cầu review/chưa push thì quay về quy trình nhánh riêng. Không tự gộp các nhánh cũ ngoài phạm vi.

**Quay lại cổng khách từ danh sách phòng (J-X090/J-X091, gộp main):** gộp `fix/rooms-portal-back`/`9a54038` vào main `82200b3` theo yêu cầu Vy, không xung đột. Có Quay lại khi vào danh sách bằng tab Khám phá phòng, về đúng activeTab, giữ dấu nguồn qua reload/xóa tìm kiếm/vòng chi tiết→list; nguồn trực tiếp/trang chủ không có nút. Sourcefrontend/backend/blockchain bản gộp đối chiếu giống code9a54038 đã kiểm build/smoke/customer/public-pages1440/390 ởJ-X090; không chạy lại toàn bộ bộ kiểm khi không đổi source. Kiểm thêm flowprofile/return trên local5173 PASS1440/390 trước push bằngAPIfixture; không ghiDB. Previewnhánh5203 vẫn có; code đã gộp nằm ở rootmain dùng5173.

**Hồ sơ/ảnh đại diện (J-X088/J-X089, gộp vào main):** theo yêu cầu “merge lun” của Vy, gộp `fix/avatar-pencil`/`95178e7` từ main `ba4831a` trong worktree riêng `D:\HomeStayDorm-avatar-main`/`integration/avatar-main`, không xung đột. `AccountSecurity.jsx`/`accountSecurity.css` dùng cây bút ở góc ảnh, bỏ hai nút chữ/dòng hướng dẫn, giữ upload/validation/mật khẩu; testprofile cập nhật tương ứng. Đã đối chiếu toàn bộ sourcefrontend/backend/blockchain bản gộp giống nhánh95178e7 vừa kiểm ở J-X088 (build+smoke pass, customer1440/390 vàSale mobile pass); không chạy lại bộ kiểm không có thay đổi code. Các sửa dở TrustStrip/xác nhận tại root không đưa vào commit. Push main/xác nhận hash rồi fast-forward root khi không trùng file đang sửa; backend/DB không đổi.

D-045 có code trên `feat/customer-viewing-confirmation` từ origin/main `45c63f7`, worktree riêng `D:\HomeStayDorm-ui-small-fixes`: trang lịch khách theo ảnh, API xác nhận đúng phiên bản, reset khi đổi giờ, chặn Đã xem/Khách không đến tới khi khách xác nhận. Build + avalanche UI qua; backend 61 pass/4 skip SQL, blockchain local 25 pass/1 skip; SQL D-045 riêng 1 pass trên DB tạm tự xóa, đã thử migration hai lần/race/quyền/guard. UI fixture qua 1440/390 với 18 ảnh `.ui-screens/customer-viewing-confirmation/`, C5-a có thêm ca chưa xác nhận và vẫn giữ đổi/hủy/ghi kết quả. Không phải nghiệm thu A3/Fuji hay xác nhận trên hồ sơ thật.

**Đã migrate (J-C086, 2026-11-14 15:53:57 +07:00):** Vy cho chạy `viewing-confirmation:db:migrate` lên HOMEDORM4; đã chạy, `ready:true` (3 cột PhienBanLich/KhachXacNhanPhienBan/ThoiGianKhachXacNhan, SP xác nhận, trigger đổi giờ, guard ghi kết quả). 3 lịch có sẵn giữ nguyên, chưa ai xác nhận. Còn lại: khách tự đăng nhập và bấm xác nhận để nghiệm thu thật; Claude đã commit/push hộ code D-045 của Codex theo ý Vy.

**Bản xem thống nhất của Codex:** `http://localhost:5199`, backend riêng 5002 (scheduler tắt). Đã đưa code UI của chính Codex từ J-X079/J-X080 vào nhánh D-045: khung phòng rộng 320px, danh sách dưới lịch Sale, thẻ 24h/tiến trình bên phải và bước xác nhận mới. Không merge main/nhánh Claude, không đổi frontend Claude 5173 hoặc backend đang dùng của Claude. Các nhánh UI cũ vẫn có trên remote; nhánh D-045 đã chứa phần code UI đó để Vy review cùng nhau.

C4 đã merge PR #10/#11 và migrate HOMEDORM4 (J-C069/J-C070). Bản vá bổ sung `fix/c4-refund-before-close` gỡ điều kiện danh sách hoàn cọc đòi hợp đồng đã thanh lý (D-041); backend 53 pass/3 skip, SQL C4 riêng 1/1 trên CSDL tạm, blockchain 25 pass/1 skip, build và avalanche UI qua. Chưa áp dụng phần SP bổ sung lên HOMEDORM4; chờ Vy duyệt và cho phép. Chưa nghiệm thu C4 bằng hồ sơ thật.

Hạn nộp **21/11/2026 23:59** (mục tiêu nội bộ 20/11). Web2 chạy local. **Contract đã deploy và verify source thật trên Fuji (A2/J-X068)**: `0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C`, block 60882820; Sourcify creation/runtime exact match. Hai ví phụ đã nạp 0,1 AVAX mỗi ví. **Luồng xác nhận của khách mới thử local**, chưa chạy trọn A3 với SQL/SMTP/OTP Privy thật; ba giao dịch hạ tầng A2 không thay kết quả nghiệm thu nghiệp vụ.

**Bước kế:** C5-a (A3-01) có code + test trên `fix/c5a-viewing-status`, đã chạy migration HOMEDORM4 sau khi Vy cho phép (J-X071); chờ Vy merge PR #9 rồi restart backend cũ. Sau đó tiếp A3 ở `fix/fuji-e2e` (checkpoint `b892b5b`, J-X069, chưa merge main): Vy đã cho đọc DB và chạy đúng một bộ demo mới qua Web2, chọn alias email, đăng nhập Sale CN0001 thật; chưa tạo bộ demo/OTP hoặc sáu receipt/gas nghiệp vụ. Không hỏi lại quyền đọc/chạy một bộ Web2 đã được cấp; migration C5-a cũng đã được Vy cho phép và chạy xong. Giữ thẻ thu thêm và chữ thanh toán C3 khi làm B1/B5.

## Mức sẵn sàng theo tiêu chí chấm

| Tiêu chí (điểm) | Đã có | Còn thiếu |
|---|---|---|
| Technical (25) | J-X070: blockchain 25 pass/1 skip, backend 45 pass/2 skip; SQL C5-a riêng qua ở DB tạm, build/smoke UI qua | Chạy trọn luồng thật một lần; README cài DB từ đầu |
| Avalanche (25) | Deploy Fuji + Sourcify exact match + vai trò đọc lại đúng + hai ví phụ có tiền; manifest và explorer thật | **A3: sáu giao dịch mẫu nghiệp vụ, OTP Privy/SQL/SMTP/giao diện thật** |
| Creativity (15), Impact (15) | Bài toán thật, luồng D-026 → D-038 đã chốt | Slide nêu người dùng, giới hạn pháp lý, vì sao on-chain |
| Pitch (10) | Bản nháp README nộp bài (đã điền địa chỉ contract, verify, ví vận hành), dàn ý 10 slide, kịch bản video 2:40 (J-C063, J-C065) | 6 link giao dịch nghiệp vụ và phí gas sau A3; ghi công (Q-07); Vy dựng slide và quay video |
| UI/UX (10) | Khung trang mọi vai trò; không gian Sale; bộ danh sách chung (5 màn); màn kiểm tra trả phòng (B3) | B1, B2, B5 còn `style` viết tay; B4 còn tìm kiếm/phân trang |

## Nhánh

| Nhánh | Nội dung | Trạng thái |
|---|---|---|
| `main` (merge J-X083 từ `45c63f7`) | Đã có các PR đến #15; gộp thêm trang chủ/chi tiết phòng `6334b9a` | Kiểm thử bản gộp pass; push/xác minh remote ở cuối đợt J-X083 |
| `chore/fuji-deploy` (Codex) | A2; worktree `D:\HomeStayDorm-fuji-deploy` từ `origin/main` `3725840`; khóa gốc giữ ở A1 | Funding/deploy/verify thật xong; env riêng A2 đã chuẩn bị, config route/roles khớp; chưa restart ứng dụng đầy đủ/A3 |
| `feat/ui-shared-shell` (Claude) | B0: khung chung cho 5 vai trò; bỏ tab của ứng dụng cũ (D-039); sửa lỗi tab kế toán | Đã vào main qua PR #5 |
| `feat/ui-list-b1` (Claude) | Tạo từ `feat/ui-shared-shell` (nên chứa luôn B0). Bộ danh sách chung theo mẫu bên Hằng (J-C062); bản nháp hồ sơ nộp D1–D3 (J-C063) | Đã vào main qua PR #5 |
| `feat/t22-checkout` (Claude) | B0, bộ danh sách chung, D1–D3 bản nháp, C2 + B3, A2 | **Đã merge vào main (PR #5)** |
| `feat/t22-settlement` (Claude) | Từ main sau PR #5. C3: tỷ lệ hoàn theo chính sách đã khóa (D-040), khách trả thu thêm qua ví mô phỏng, kế toán xem đối chiếu và ảnh trả phòng (J-C066); tiếp theo B4, C4 | Đã merge PR #7; migration thu thêm HOMEDORM4 ở J-C066; chưa nghiệm thu A3 |
| `feat/b4-settlement-ui` (Claude) | B4: màn Quyết toán bỏ 46 style viết tay, dùng StatusBadge/ô bảng/hộp thoại chung (J-C067); tìm kiếm + phân trang (J-C068) | PR #8 đã merge nhưng thiếu 2 commit cuối (`03ffae5`, `52b17f9`); gộp lại ở `feat/ui-staff-tabs-hang` (J-C072) |
| `fix/c5a-viewing-status` (Codex) | C5-a lịch xem (A3-01), từ main `0b42fb2`, worktree `D:\HomeStayDorm-c5a` | Code + test J-X070 và migration HOMEDORM4 J-X071 qua; chờ Vy merge PR #9/restart; chưa nghiệm thu hồ sơ thật |
| `feat/t22-backend` (Claude) | Khách tự giữ chỗ, từ chối → "Đã xem", "Không thuê nữa", "Khách không đến" | Có code + test đầu vào; SQL chưa chạy lên HOMEDORM4; chưa nối giao diện; chưa gộp vào nhánh tích hợp (việc C5) |
| `docs/review-branch-workflow` | Quy tắc "không push main" | Nội dung đã có trong AGENTS.md; xóa được |

Nhánh tích hợp đã vào main; các nhánh cũ đã gộp có thể được Vy dọn sau. **Mọi nhánh mới tạo từ `origin/main` sau khi đã merge.** AI không tự xóa các nhánh/worktree hoặc bộ khóa đang dùng.

## Thứ tự ưu tiên (D-037, Vy chốt 11/11)

| Ngày | Việc | Trạng thái |
|---|---|---|
| 11–12/11 | **Fuji trước**: A1 ví → faucet → A2 deploy, verify source, đổi `.env` → A3 chạy trọn luồng thật, lưu link giao dịch | A2 deploy/source đã xác minh, env riêng chuẩn bị; tiếp A3 |
| 13–15/11 | Phần T-22 trên đường demo (C2, C3, C4, C6) + giao diện 5 màn demo (B1–B5) | C1 đã xong sớm |
| 16–17/11 | Phần T-22 còn lại nếu kịp (C5); B6, B7; dự phòng | |
| 18–19/11 | README, slide, video (D1–D3); dọn dẹp E1–E3 nếu còn thời gian | |
| 20/11 | Nộp; 21/11 dự phòng | |

## Công việc

| Mã | Việc | Trạng thái | Bước kế |
|---|---|---|---|
| T-08 | Deploy, verify source, nghiệm thu Fuji | A2/J-X068 deploy+source thật; A3/J-X069 đang chuẩn bị, chờ C5-a/J-X070; [manifest](../blockchain/deployments/fuji.json), [explorer](https://testnet.snowtrace.io/address/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C), [source](https://repo.sourcify.dev/43113/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C) | Migration C5-a xong → Vy merge PR #9/restart → tiếp một bộ demo Web2 và 6 receipt/gas; T-08 chưa nghiệm thu toàn luồng |
| T-11 / T-14 | Bàn giao Web2 → email → OTP → ký | Có code, test tự động qua, **chưa chạy thật** | Chạy thật trong A3 |
| T-22 | Luồng D-026 → D-038 | C1 xong code + test + migration HOMEDORM4 (J-X061, J-X062); 4 mục giữ chỗ có code backend ở `feat/t22-backend`; còn lại chưa làm | Bảng mức ưu tiên bên dưới |
| T-21 | Giao diện | Khung, token, form, danh sách (D-032, D-033); không gian Sale (D-035, D-036); **B0 xong (J-C061)**: cả 5 vai trò dùng chung một khung `WorkspaceShell`; **bộ danh sách chung (J-C062)**: ô tìm kiếm có nút xóa, thẻ tổng quan bấm để lọc, nhãn trạng thái có icon, hàng đang tải/lỗi/rỗng, phân trang; đã áp vào 5 màn danh sách không thuộc việc của Codex | Claude: B1, B5, B2. Codex: B7, và B3/B4 gộp vào C2/C3 |
| T-09 | Hồ sơ nộp | Chưa bắt đầu | D1–D3 |
| T-04 | Nguồn tiền cọc và dữ liệu demo | Nguồn cọc đã chốt (D-034, D-038). HOMEDORM4 có 2 phiếu cọc, **0 hợp đồng** | Tạo một hợp đồng demo bằng luồng Web2 trước A3 |
| T-13 | Privy JWT (bỏ OTP) | Tạm dừng, chờ BTC (Q-10) | Giữ OTP |

## T-22 theo mức ưu tiên (D-037)

| Mức | Mục | Quyết định | Trạng thái |
|---|---|---|---|
| **Phải có** (trên đường demo) | Điều khoản hợp đồng + phiên bản chính sách + mã băm ảnh hợp đồng vào gói bàn giao | D-027, D-031, D-034 | **Xong code + test (C1)**; migration đã chạy; chưa chạy thật qua giao diện |
| | Màn kiểm tra trả phòng so trước/sau | D-030 | **Xong code + test (C2, J-C064)**; bảng ảnh đã tạo; HOMEDORM4 chưa có phiếu trả phòng của hợp đồng nên chưa thử dữ liệu thật |
| | Bản nháp đối soát tự soạn; thu thêm qua ví | D-030, D-040 | **Xong code + test (C3, J-C066)**: phần tự điền đã có sẵn; thêm tỷ lệ theo chính sách đã khóa, thu thêm qua ví, kế toán xem đối chiếu. Migration `settlement-topup:db:migrate` đã chạy trên HOMEDORM4; giao diện màn Quyết toán (B4) chưa làm lại |
| | Tự thanh lý 3 trường hợp + gói bằng chứng cuối + "Thanh lý không có xác nhận của khách" | D-030, D-031, D-038 | **Xong code + test (C4, J-X073, J-C069), đã merge PR #10, migration HOMEDORM4 đã chạy (J-C070)**: tự thanh lý 3 trường hợp, thanh lý không có xác nhận (D-038/D-041), "Đã thu chìa khóa" riêng, gói bằng chứng cuối; bỏ tab thanh lý tay/bàn giao ra. cần restart backend; chưa thử dữ liệu thật |
| | Điều khoản xác nhận điện tử trong mẫu hợp đồng; ô đồng ý dữ liệu cá nhân | D-038 | Chưa làm (C6) |
| | Danh sách "Chờ khách xác nhận", nhắc 24/72 giờ | D-028 | Có nút nhắc tay; C4 thêm tự nhắc 24/72 giờ và "Quá hạn phản hồi" sau 7 ngày (job nền, tôn trọng `SCHEDULERS_ENABLED`); chờ migration C4 |
| **Nên có** | Khách tự giữ chỗ; từ chối → "Đã xem"; "Không thuê nữa"; "Khách không đến" | D-026 | C5-a có code + test nút Sale và bỏ tự đánh dấu, đã migrate, chờ merge/restart; các phần giữ chỗ/Không thuê nữa/chặn lịch thứ hai vẫn chưa hoàn tất |
| | Khách quan tâm phòng chờ cọc; Sale chỉ tiếp nhận hồ sơ khách gửi, bỏ phiếu khách vãng lai | D-042 | **Xong code + test local (J-C075)** trên `feat/d042-interested-rooms`: nhãn trạng thái phòng, nút mờ khi hết chỗ, chặn dưới 18 tuổi, gỡ form khách vãng lai ở Sale; backend 57 pass/3 skip, build qua, 5 smoke UI qua (dữ liệu giả). J-C076: thẻ chi tiết phòng "Tôi quan tâm phòng này" + số giường trống, phiếu nhu cầu thuê thành trang theo mẫu Vy gửi. J-C079 (D-043): một hồ sơ nhiều phòng quan tâm, nút "Thêm vào hồ sơ", Sale lập lịch chọn sẵn phòng; bảng `PhieuDangKyPhongQuanTam` đã migrate lên HOMEDORM4; J-C084 (D-044): bỏ bước tiếp nhận hồ sơ của Sale, "Lập lịch hẹn" hiện phiếu chờ xếp lịch, lập lịch cho phiếu mới = tiếp nhận (thử trên HOMEDORM4 với DK0003 rồi hoàn tác); backend 61 pass/3 skip, 5 ca SQL thật (thêm, trùng, khác chi nhánh, khách khác, hồ sơ đã lịch) đúng và đã dọn. Chưa chạy qua giao diện với SQL thật; route backend `/dang-ky-thue/khach-vang-lai` còn, chưa gỡ |
| | Chính sách hoàn cọc trên phiếu và email cọc | D-031, D-034 | **Xong code + test (C1)**; chưa thử SMTP thật |
| | Thẻ "Kích hoạt xác nhận điện tử" sau khi trả cọc | D-028 | Chưa làm |
| **Để sau nếu trễ** | Khách tự khai người ở; thành viên bị loại hoàn 80%; hợp đồng "Chờ ký" | D-026, D-027 | Khách tự khai người ở: **có code + test (J-C103), đã migrate HOMEDORM4 (J-C104)**, chưa nghiệm thu qua giao diện thật; hoàn 80% và hợp đồng "Chờ ký" chưa làm |
| | Hóa đơn tháng qua ví; trang "Khoản dự kiến trừ" | D-029 | Chưa làm |
| | Đổi người đại diện bằng email mời | D-026 | Giữ cách tạm |
| **Sau bản thi** | Mốc chuỗi 3; cấp lại ví khi mất email (P-04) | D-031 | Không làm |

## Chia việc giữa Claude và Codex (Vy chia lại 2026-11-11 15:3x, J-C064; thay bảng J-C061)

Nguyên tắc: mỗi file chỉ một người sửa. Chi tiết và prompt: [viec-cho-agent.md](viec-cho-agent.md).

| Người | Việc |
|---|---|
| **Claude** | Chuỗi trả phòng: C2 + B3 (xong), C3 + B4, C4; hồ sơ nộp D1–D3 (bản nháp xong, điền số liệu Fuji sau); C5 đề xuất làm sau C4 |
| **Codex** | C4 theo yêu cầu Vy ngày 12/11 và D-041; C5-a gỡ A3-01 (J-C067/J-X070), Fuji A2, A3 trước; sau đó giao diện B1, B2, B5, B7 và C6; dọn dẹp E1–E3 |
| **Vy** | Faucet; merge PR; chạy luồng thật cùng A3 (OTP, các vai trò); trả lời Q-07; dựng slide, quay video |

## Lưu ý khi chạy thật (từ đợt xem code J-C060)

- **Bàn giao giờ cần 2 điều kiện trước** (C1, D-034): khách đã thấy bản chính sách lưu theo phiếu cọc (2 phiếu cũ phải bấm xác nhận bổ sung), và Sale đã tải ảnh hợp đồng đã ký ở màn Lập hợp đồng. Thiếu thì màn quản lý báo lý do, biên bản chưa tới khách.
- **Sale không còn lối đăng ký trả phòng** (D-036): khách tự gửi yêu cầu trả phòng trên cổng khách.
- J-X069 đã đăng nhập Sale NV0001/CN0001 thật ở phiên A3, chưa nghiệm thu toàn luồng. J-X070 kiểm hai nút kết quả lịch bằng API giả, SQL tích hợp ở DB tạm; chưa ghi trạng thái lịch thật HOMEDORM4.
- **Đã sửa lỗi có sẵn trên `main`** (J-C061): tab "Tiền mặt chờ nộp quỹ" của kế toán bị trắng trang khi mở do thiếu `import React`. Cổng khách trên điện thoại trước đây không có menu; nay có.
- Đã bỏ trang `/dashboard` của ứng dụng cũ (HappyRoom) và 3 tab giữ chỗ trống của khách ("Phòng/Giường của tôi", "Hóa đơn", "Bảo trì"). Tab "Thanh lý trả phòng" và "Ghi nhận bàn giao ra" của quản lý được thay bằng mục "Kết thúc hợp đồng" ở nhánh C4 (D-039; có hiệu lực khi merge + migration).
- Bản A2 `fuji:fund` nạp đủ 0,1 mỗi ví, bỏ qua ví đủ và hỗ trợ `--check`; bản A1 cũ ở worktree chứa khóa vẫn là 0,3. Chạy **script A2 với cwd thư mục khóa A1** theo `blockchain/README.md`, không chạy nhầm npm script A1. Nếu RPC lỗi sau broadcast, kiểm hash/receipt trước khi thử lại.
- Bản ứng dụng đang chạy trước A2 chưa được restart/chuyển cấu hình. Env Fuji đã chuẩn bị riêng ở `D:\HomeStayDorm-fuji-deploy\web\{backend,frontend}\.env`, kèm `.env.local-chain` sao lưu; đều ignore. Config route thật với env A2 trả enabled/43113/address đúng trong tiến trình chỉ đọc, không nối DB hay khởi động scheduler. Không coi đây là ứng dụng đầy đủ đã chạy A3.

## Kiểm tra gần nhất (J-X071: migration 12/11; code/test J-X070 ngày 11/11)

- `blockchain npm test`: 25 qua/1 bỏ qua (SQL). Không sửa contract hoặc ABI.
- `web/backend npm test`: 45 qua/2 bỏ qua (SQL tích hợp cần bật riêng). 3 test mới kiểm quyền nhân viên, không tin actor trong body, input/HTTP lỗi, patch giữ nguyên phần SP khác và chạy lại được.
- `C5A_SQL_TEST=true node --test test/viewing-status-sql.test.mjs`: 1 qua riêng, tạo/xóa CSDL `HOMEDORM_C5A_TEST_*`; migration chạy hai lần, đọc không đổi trạng thái, chặn sai vai trò/chủ hồ sơ/chi nhánh/giờ và hồ sơ đã cọc, hai yêu cầu đồng thời chỉ một thành công, không tự đóng hồ sơ khi khách không đến. Không seed/update HOMEDORM4.
- HOMEDORM4/J-X071: trước migration còn 4 khối tự đánh dấu trong 8 SP; sau migration check cả 8 đều 0. Ràng buộc CHK_LXP_TrangThai đang enabled/trusted, cho Khách không đến; định nghĩa SP_GhiNhanKetQuaBuoiXem khớp nguồn sau chuẩn hóa header CREATE/ALTER do SQL Server lưu lại. Số dòng và checksum LichXemPhong/PhieuDangKy/PhieuDatCoc trước–sau khớp (mỗi bảng 2 dòng). Không gọi SP để ghi kết quả lên lịch cũ; không chạy lại test code ở J-X071 vì chỉ cập nhật hồ sơ sau SQL.
- Frontend build qua (cảnh báo chunk/directives), `test:avalanche-ui` qua; `scripts/ui-viewing-outcomes.mjs` qua ở 1440/390 với API giả: nút mở/khóa theo quyền, ghi Đã xem/Khách không đến, lỗi xung đột giữ hộp thoại và thử lại, lọc kết quả, không lỗi JS/tràn ngang. 6 ảnh/report tại `web/frontend/.ui-screens/c5a-viewing-status/` (ignore); đã xem ảnh desktop/mobile. `LichXemPhongTab.jsx` style viết tay 0 → 0.
- Ban đầu test/build thiếu dependency của gói blockchain trong worktree mới; cài `blockchain npm ci` rồi chạy lại các check trên đều qua. Lỗi locator nhãn trong script ảnh đã sửa bằng id `schedule-status`, không đổi id ứng dụng.
- Chưa chạy lại handover/shell UI; chưa thử nút kết quả với hồ sơ thật, OTP/SMTP hoặc sáu giao dịch nghiệp vụ Fuji trong đợt này. Bằng chứng deploy/source trước ở J-X068; C3 migration trước ở J-C066; không đổi chúng thành kiểm thử vừa chạy.
## Môi trường local (không chứa giá trị bí mật)

- Env gốc/ứng dụng trước A2 vẫn giữ chain local. Worktree A2 có env riêng Fuji 43113 và địa chỉ manifest, ba khóa vận hành đúng vai trò; giữ `PRIVY_AUTH_MODE=email`, SQL/SMTP/Privy khác từ cấu hình gốc; `.env.local-chain` sao lưu. Chưa restart phiên backend/frontend đầy đủ với env này.
- Ví Fuji: khóa gốc `D:\HomeStayDorm-fuji\blockchain\.env` và `.fuji-backend-env.local` (ignore). Deployer/manager `0x7bb2e96898Db7e387e118eB92a9C390E29f54B2f` còn **0,1499999997396256 AVAX**; accountant `0x9F86a6119723f46d2e8236C2935f660918cCbf0D` và relayer `0x8C8D363E9430bD7e8ED72752Fb1356Bec0fe62f9` mỗi ví **0,1 AVAX** (RPC J-X068). Manifest lưu hai hash funding và deploy, không có khóa bí mật.
- HOMEDORM4: đã có hai bảng mới của C1 (`DepositPolicySnapshot`, `SignedContractEvidence`); 2 phiếu cọc, 0 hợp đồng. Dữ liệu giao dịch đã dọn ngày 06/11 (J-030).
- Thư mục làm việc: `D:\HomeStayDorm` (`feat/ui-refresh-1`), `-audit` (nhánh tích hợp), `-fuji` (bộ khóa A1), `-fuji-deploy` (A2), `-handover`, `-sale`, `-t22`, `-ui` (AI khác). Không nhập thay đổi giữa các worktree ngoài quy trình review.

- 2026-11-16: thêm tab Hóa đơn định kỳ cho kế toán (J-C145): backend + bảng `PhiPhatSinh` đã migrate trên HOMEDORM4; test giao diện bằng fixture PASS; chưa lập hóa đơn thật trên DB (cần Vy thử với kế toán chi nhánh của HD0001/HD0002).
## Câu hỏi còn mở

Q-06 (hạn và cổng nộp), Q-07 (ghi công nhóm cũ), Q-08 (email demo), Q-10 (Privy JWT) trong [decisions.md](decisions.md). Q-01 đã chốt ở D-034/D-038; Q-02 đã đóng ở D-038.
