# A3 — Kiểm thử luồng thật trên Fuji

Trạng thái: **chuẩn bị, chưa chạy trọn luồng**. Nhánh `fix/fuji-e2e` cập nhật từ main `6467b77` sau khi Vy merge PR #5. Contract đã deploy ở A2 không phải kết quả A3.

## Điều kiện trước khi bắt đầu

- Đã đọc AGENTS, phân công J-C064 và D-015/026/027/028/030/031/034/038/039. Không sửa file Claude giữ; lỗi ở các file đó ghi vào bảng lỗi để phối hợp xử lý.
- Fuji chain 43113, contract `0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C`; hai vai trò/manifest phải khớp. Không deploy lại, không dùng ví Core/Console của Vy thay ví khách nhúng.
- **Vy đã cho phép đọc HOMEDORM4 và tạo/xử lý đúng một bộ demo mới qua Web2.** Không chạy migration, UPDATE/DELETE trực tiếp hoặc script seed/rollback để thay luồng Web2 thật. Không sửa hồ sơ cũ.
- Chọn một bộ dữ liệu demo mới, tên/ghi chú có dấu `A3-20261111`; một phòng/giường trống cùng chi nhánh của Sale, quản lý, kế toán. Ghi mã do hệ thống tạo vào sổ local bị ignore; không tự gán mã hồ sơ hoặc thay dữ liệu khách khác.
- Email khách demo do Vy kiểm soát, nhận được OTP; nếu email đã có tài khoản thì dùng alias riêng do Vy kiểm soát hoặc tài khoản demo đã được Vy chọn. Không đổi email/mật khẩu/ví của khách cũ. Không gửi mật khẩu, OTP, CCCD hoặc khóa vào Git/chat.
- Backend A3 dùng cấu hình Fuji, `SCHEDULERS_ENABLED=false` tắt năm job nền; không đồng nghĩa mọi GET đều chỉ đọc (xem lỗi A3-01). Giữ server/preview cũ riêng; phiên SQL/HTTP A3 không dùng fixture. SMTP chuyển email demo về hộp thư Vy đã chọn; chưa gửi thư thật thì không ghi đã gửi, chưa có receipt thì không ghi "đã xác nhận".
- Phiếu demo phải có bản chính sách được lưu đúng phiên bản và khách đã thấy/xác nhận; hợp đồng có bản chụp demo đã ký do Vy cung cấp. Không tự dựng chữ ký để vượt điều kiện C1.

## Chuẩn bị hợp đồng bằng Web2 thật

| # | Vai trò và thao tác trên giao diện | Kết quả cần thấy | Trạng thái |
|---|---|---|---|
| P1 | Khách đăng ký tài khoản demo và gửi nhu cầu thuê; Sale tiếp nhận đúng hồ sơ | Mã hồ sơ mới, đúng chi nhánh; dữ liệu liên hệ của Vy chỉ giữ local | Chưa chạy |
| P2 | Sale lập một lịch xem phòng hợp lệ; thực hiện buổi xem rồi ghi Đã xem | Phòng trong lịch đúng lựa chọn; không sửa giờ SQL hay giả đồng hồ để bỏ kiểm tra thời gian | Chưa chạy |
| P3 | Sale/khách gửi yêu cầu cọc qua chức năng hiện có; quản lý duyệt | Phiếu cọc mới do hệ thống tạo, số tiền tự tính; không dùng phiếu cũ ngoài bộ demo | Chưa chạy |
| P4 | Khách thanh toán qua cổng mô phỏng hoặc Sale thu tại quầy đúng luồng đã chọn | Phiếu Đã TT, email thật nhận được; ghi rõ thanh toán mô phỏng, không nhận tiền thật | Chưa chạy |
| P5 | Khách xem chính sách; Sale nhập hộ người ở theo chức năng đang có, hệ thống/quản lý duyệt đúng quy tắc | Thành viên đủ điều kiện, bản chính sách khóa theo phiếu; không UPDATE để ép duyệt | Chưa chạy |
| P6 | Sale lập hợp đồng từ phiếu đủ điều kiện; Vy ký bản demo, Sale tải bản chụp đã ký | Có hợp đồng mới và metadata ảnh hợp đồng, policyVersion đúng; không chứa thông tin cá nhân trong commit/screenshot | Chưa chạy |
| P7 | Khách trả kỳ đầu qua cổng mô phỏng hoặc kế toán ghi nhận đúng nghiệp vụ | Khoản thu kỳ đầu Đã TT, hợp đồng đủ điều kiện bàn giao | Chưa chạy |

Không bỏ qua bước bị chặn bởi ngày/giờ, sức chứa, giới tính, thanh toán hay trạng thái. Ghi lỗi và dừng bước phụ thuộc nếu chưa thể đi tiếp bằng luồng hợp lệ.

### Phiên chuẩn bị J-X069

- Worktree `D:\HomeStayDorm-fuji-e2e`, frontend `http://127.0.0.1:5199`, backend `http://127.0.0.1:5011`; health/config thật trả 200, Fuji 43113 và contract khớp manifest. Năm job nền tắt.
- Preflight chỉ đọc đã chạy sau khi Vy cho phép: đủ nhân viên Sale/quản lý/kế toán CN0001, có phòng trống; 2 đăng ký, 2 phiếu cọc, 0 hợp đồng, 0 trả phòng, 0 AvalancheCase. Báo cáo chi tiết ở `web/backend/secrets/fuji-e2e/` (ignore).
- Email ban đầu trùng ba khách cũ. Vy chọn alias Gmail riêng cho A3; alias chưa có trong DB. Giá trị email chỉ lưu local, không đưa vào hồ sơ Git.
- Vy đăng nhập Sale thật `NV0001`/`CN0001` trong Chrome riêng, API `/auth/toi` trả 200. Form tài khoản khách demo mới đã chuẩn bị, chưa gửi; chưa tạo/reserve bộ demo.
- Vy chốt **Claude sửa lịch xem trong C5 theo D-026; A3 chờ ở bước lịch xem**. Chưa tới OTP, hợp đồng, màn kiểm tra trả phòng hoặc giao dịch nghiệp vụ Fuji. Việc cần sửa/kiểm lại đã ghi ở mục C5 của `viec-cho-agent.md`.

### Lệnh hỗ trợ

Sau khi đã được Vy cho phép SQL, tại `web/backend`:

```powershell
npm run fuji:e2e:preflight -- --allow-homedorm4-read
```

Sau khi có đủ sáu hash thật đúng thứ tự, tại `blockchain`:

```powershell
npm run fuji:e2e:receipts -- --hashes HASH1,HASH2,HASH3,HASH4,HASH5,HASH6 --output deployments/fuji-a3.json
```

Collector chỉ đọc RPC, kiểm đúng vai trò/event/hồ sơ/phiên bản, trạng thái cuối Accepted v2 và giữ phản đối v1; không ghi đè báo cáo có sẵn. Sao chép bảng kết quả vào README §3.4 và T-08; không dùng receipt fixture của test làm bằng chứng thật.

## Kiểm thử bàn giao → trả phòng → đối soát

| # | Vai trò/thao tác | Kết quả mong đợi | Giao dịch | Kết quả thật |
|---|---|---|---|---|
| A1 | Quản lý lập biên bản bàn giao, có ảnh và một tình trạng hư cũ rõ ràng | Khách nhận bản xem và email; bản nháp Web2 chưa phải giao dịch chuỗi | — | Chưa chạy |
| A2 | Khách mở tab Hợp đồng, yêu cầu sửa một chi tiết; quản lý phát hành bản mới | Bản mới đúng yêu cầu, bản cũ giữ lịch sử; chưa ghi chuỗi | — | Chưa chạy |
| A3 | Khách xác nhận, nhập OTP Privy thật khi được hỏi | Ví nhúng gắn đúng tài khoản; backend dùng khóa quản lý ghi đúng bản đã xem | **1: HandoverProposed** | Chưa có |
| A4 | Khách hoàn tất xác nhận cùng thao tác | Relayer gửi chữ ký của khách; receipt/event đúng mới thành Active | **2: HandoverAccepted** | Chưa có |
| A5 | Khách yêu cầu trả phòng; quản lý mở màn Kiểm tra trả phòng mới | Có cột **Lúc nhận phòng**, tình trạng hiện tại và ảnh lúc trả phòng | — | Chưa chạy |
| A6 | Quản lý đối chiếu hư cũ và ghi một thay đổi mới nếu có; tải/xem/xóa thử ảnh demo | Hư cũ không tính cho khách; ảnh đúng phiếu, không lẫn dữ liệu khác. Ghi lỗi C2 vào bảng, không tự sửa file Claude | — | Chưa chạy |
| A7 | Kế toán lập/rà đối soát v1 trong Web2 rồi gửi khách xác nhận | Đúng cọc/policy, khoản trừ và số hoàn/thu; lịch sử nguồn Web2 có thật | **3: SettlementProposed v1** | Chưa có |
| A8 | Khách phản đối v1, nhập lý do thật của kịch bản demo | Disputed, v1 giữ nguyên và lý do được băm; không tự đồng ý thay | **4: SettlementDisputed v1** | Chưa có |
| A9 | Kế toán điều chỉnh qua Web2, gửi bản v2 | Hai bản giữ lịch sử; v2 phản ánh điều chỉnh, không sửa snapshot v1 | **5: SettlementProposed v2** | Chưa có |
| A10 | Khách xem và đồng ý v2 | Accepted, latestVersion=2, v2 accepted; phản đối v1 vẫn kiểm chứng được | **6: SettlementAccepted v2** | Chưa có |
| A11 | Khách tải gói bằng chứng; mở trang kiểm chứng độc lập | Bản đúng báo khớp và đúng trạng thái/phiên bản; không cần API quản lý để lấy lại nội dung | — | Chưa chạy |
| A12 | Sao chép file, sửa một con số trong JSON hợp lệ rồi kiểm chứng bản sao | Báo lệch; file gốc và dữ liệu SQL/chain không bị sửa | — | Chưa chạy |

Hai giao dịch đầu có thể phát sinh trong một lần khách bấm xác nhận: `prepare` ghi bằng khóa quản lý trước, sau đó chữ ký khách được relayer gửi. Không tạo thêm giao dịch giả để đủ số lượng.

## Bảng 6 receipt và phí gas

Ghi vào **README mục 3.4** và **T-08 của progress** sau khi đọc receipt thật. Phí AVAX = `gasUsed × effectiveGasPrice / 10^18`; không dùng gasLimit hay giá USD hiển thị trong ví thay phí thực.

| # | Event | Link explorer | Gas used | Phí AVAX |
|---|---|---|---|---|
| 1 | HandoverProposed | Chưa có | Chưa đo | Chưa đo |
| 2 | HandoverAccepted | Chưa có | Chưa đo | Chưa đo |
| 3 | SettlementProposed v1 | Chưa có | Chưa đo | Chưa đo |
| 4 | SettlementDisputed v1 | Chưa có | Chưa đo | Chưa đo |
| 5 | SettlementProposed v2 | Chưa có | Chưa đo | Chưa đo |
| 6 | SettlementAccepted v2 | Chưa có | Chưa đo | Chưa đo |

Giao dịch deploy và hai giao dịch nạp ví A2 không nằm trong sáu dòng này. Collector chỉ đọc RPC và chỉ xuất báo cáo khi đủ sáu receipt thành công đúng contract/hồ sơ/event/phiên bản.

## Quan sát OTP và lỗi

| Mốc | Giờ thực +07:00 | Quan sát |
|---|---|---|
| Nhập OTP lần đầu | Chưa có | Vy nhập trực tiếp trên giao diện |
| Phản đối v1 | Chưa có | Có/không yêu cầu OTP lại: chưa quan sát |
| Đồng ý v2 | Chưa có | Có/không yêu cầu OTP lại: chưa quan sát |

Chỉ báo thời gian phiên quan sát được; không suy ra thời hạn tối đa của Privy nếu chưa thấy hết phiên.

| Bước | Lỗi thật và mã hồ sơ demo | Chủ file | Xử lý/kiểm lại |
|---|---|---|---|
| A3-01 — trước P2 | `validateAppointmentTime` chỉ nhận ngày sau hôm nay, 07:00–17:00; `layDanhSachLichXemPhong` tự UPDATE lịch đến giờ thành Đã xem trước khi lọc theo khách/chi nhánh (khi không truyền mã đăng ký). D-026 yêu cầu Sale ghi trạng thái sau buổi xem. Điều này cũng ảnh hưởng yêu cầu chỉ đụng bộ demo. | C5 — Claude; `services/lichXemPhong.service.js`, `repositories/lichXemPhong.repository.js` | Vy chốt Claude sửa C5 theo D-026, A3 chờ bước lịch xem. Chưa sửa hoặc lách điều kiện. Hai lịch cũ hiện Đã xem; không có ảnh chụp trạng thái trước lần tải Tổng quan nên không khẳng định GET vừa rồi không đổi dòng cũ. Không UPDATE để khôi phục theo phỏng đoán. |

Kết thúc chỉ đánh dấu A3 đạt khi đủ Web2 thật, OTP thật, sáu receipt, file đúng/đã sửa và đối chiếu màn kiểm tra trả phòng mới. Nếu dừng, giữ nguyên dữ liệu demo và ghi bước tiếp, không xóa hoặc "dọn" hồ sơ khác.
