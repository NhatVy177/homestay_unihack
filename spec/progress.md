# Tiến độ hiện tại

Cập nhật: **2026-11-13 02:18:46 +07:00** (J-X078, tab lọc Sale dùng xanh sage). File này chỉ giữ trạng thái hiện tại; sửa tại chỗ, không chồng thêm mục. Lịch sử trước 11/11 nằm ở [archive/progress-den-2026-11-10.md](archive/progress-den-2026-11-10.md), [journal.md](journal.md) và Git. Luồng và quyết định: [luong-tong-hop.md](luong-tong-hop.md). Kết quả rà soát: [audit-2026-11-11.md](audit-2026-11-11.md). Việc giao cho AI: [viec-cho-agent.md](viec-cho-agent.md).

## Tóm tắt

Form đăng ký thuê: lỗi nhập/gửi dùng hộp thông báo, ngày dọn vào nhắc dưới ô theo giới hạn ngày mai có sẵn, giữ dữ liệu để sửa/gửi lại; toast ngoài modal đã có nền. Nhánh `feat/ui-customer-form-feedback` từ main `16a4945`, đang phục vụ frontend 5199. Build + avalanche UI qua, backend 53/3 skip, blockchain 25/1 skip; kiểm tra fixture 1440/390 qua và có ảnh `.ui-screens/customer-form-feedback/`. Chưa gửi hồ sơ SQL thật; chưa hoàn tất các phần B5 khác. Chờ Vy review/merge nhánh riêng.

Sale lập lịch: cùng nhánh UI trên, mở modal ở Lịch hẹn và từ màn tiếp nhận, giữ trang nền và bỏ cờ disabled menu. Theo ảnh Vy gửi, modal chỉ còn một tiêu đề “Tạo lịch xem phòng”, hàng icon/số phiếu và khung rỗng nét đứt; phần chọn phòng/giờ không lặp tiêu đề trang. Giữ tông xanh, bộ lọc hồ sơ và lối tiếp nhận theo D-036 khi có hồ sơ chờ nhận; lịch ngày mai tính theo ngày địa phương. Kiểm tra fixture 1440/390 qua (10 ảnh `.ui-screens/sale-schedule-modal/`), bộ Sale cũ qua 32 ảnh; build, avalanche UI, backend 53/3 skip, blockchain 25/1 skip đều chạy lại qua ở J-X077. Kết quả đọc HOMEDORM4 ở J-X076: Sale CN0003/Thủ Đức là `nv0009`, `nv0010`; Quận 9 thuộc CN0003, `nv0001` thuộc CN0001/Quận 1. Hồ sơ Quận 9 mới lúc kiểm tra đó đang Chờ tiếp nhận; chưa ghi thay kết quả/nhân viên hoặc lập lịch thật. Chờ Vy xem giao diện và merge nhánh UI.

Tab lọc trạng thái trong thanh danh sách Sale đã đổi sang xanh sage (J-X078), gồm nền/viền/chữ khi chọn và số đếm cùng màu, bỏ nền trắng riêng của số. Không sửa `styles/lists.css` đang giữ cho phần khác. Kiểm fixture 1440/390 qua, thêm 2 ảnh tiếp nhận trong `.ui-screens/sale-schedule-modal/` (tổng 12 ảnh), lọc qua lại không ghi dữ liệu. Build + avalanche UI qua; backend 53/3 skip, blockchain 25/1 skip. Đã giải thích bước **khách gửi → Sale tiếp nhận → lập lịch** theo mục 3.1; đính chính dòng “tự Đã xem” trong luồng tổng hợp theo D-026/C5-a, không đổi quyết định hoặc code nghiệp vụ.

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
| `main` (`0b42fb2`) | Đã merge PR #5, #7, #8: A2, C2/B3, C3 và B4 | Gốc nhánh C5-a sau fetch |
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
| | Chính sách hoàn cọc trên phiếu và email cọc | D-031, D-034 | **Xong code + test (C1)**; chưa thử SMTP thật |
| | Thẻ "Kích hoạt xác nhận điện tử" sau khi trả cọc | D-028 | Chưa làm |
| **Để sau nếu trễ** | Khách tự khai người ở; thành viên bị loại hoàn 80%; hợp đồng "Chờ ký" | D-026, D-027 | Chưa làm |
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

## Câu hỏi còn mở

Q-06 (hạn và cổng nộp), Q-07 (ghi công nhóm cũ), Q-08 (email demo), Q-10 (Privy JWT) trong [decisions.md](decisions.md). Q-01 đã chốt ở D-034/D-038; Q-02 đã đóng ở D-038.
