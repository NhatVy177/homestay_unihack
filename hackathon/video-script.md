# Kịch bản video demo vòng 1 (3:00)

Bản ngày 18/11/2026, thay bản nháp 11/11 (J-C063). Vòng 1 chấm **kỹ thuật** và **mức tích hợp Avalanche**, nên video ưu tiên: hệ thống chạy thật, Avalanche gắn đúng chỗ cần, và bằng chứng kiểm chứng được (Snowtrace, trang kiểm chứng, khôi phục từ chuỗi). Giao diện đẹp để vòng sau.

## Ba điều giám khảo phải nhớ

1. **Avalanche giải đúng một nỗi đau thật:** cãi nhau tiền cọc. Chỉ hai thời điểm cần cả hai bên đồng ý mới lên chuỗi: khách xác nhận biên bản bàn giao, khách đồng ý bản đối soát cọc.
2. **Khách không cần biết blockchain:** đăng nhập email, nhập mã OTP, không cài ví, không cần AVAX. Ví nhúng Privy, chữ ký EIP-712, relayer trả gas.
3. **Kiểm chứng được, không phải lời hứa:** 2 contract trên Fuji (DormSettlement đã verify Sourcify, DormPoints), trang tự kiểm chứng file, dựng lại hồ sơ từ chuỗi khi mất database.

## Chia thời gian

| Đoạn | Thời gian | Mục đích |
|---|---|---|
| 1. Mở đầu: vấn đề | 0:00–0:12 | Gây chú ý bằng nỗi đau thật |
| 2. Nền Web2 chạy thật | 0:12–0:35 | Chứng minh đây là hệ thống đầy đủ, không phải demo một nút |
| 3. Mốc 1: bàn giao trên Avalanche | 0:35–1:15 | Ví nhúng, EIP-712, relayer, có phiên bản |
| 4. Mốc 2: đối soát cọc có tranh chấp | 1:15–1:50 | Phản đối, bản mới, giữ bản cũ, contract tự tính tiền |
| 5. Kiểm chứng độc lập + khôi phục | 1:50–2:12 | Điểm kỹ thuật mạnh nhất |
| 6. Điểm thưởng DormPoints | 2:12–2:32 | Avalanche dùng cho cả giữ chân khách |
| 7. Kỹ thuật và vì sao Avalanche | 2:32–2:52 | Kiến trúc, gas đo thật, riêng tư |
| 8. Kết | 2:52–3:00 | Link repo, contract |

Lời nói khoảng 3,5 tiếng mỗi giây. Cắt bỏ mọi đoạn chờ (OTP, giao dịch, tải trang) khi dựng.

## Kịch bản chi tiết

| Giây | Quay gì trên màn hình | Lời đọc (lồng tiếng) |
|---|---|---|
| 0:00–0:12 | Ảnh cận cảnh nệm rách → bảng trừ cọc viết tay → logo HomeStayDorm. Chữ nhỏ góc dưới: "Avalanche Fuji · dữ liệu demo · thanh toán sandbox" | "Trả phòng ký túc xá, chuyện cãi nhau tiền cọc gần như ai cũng gặp. Vết rách có từ trước bị tính là hư mới, biên bản giấy thì thất lạc. HomeStayDorm giải quyết chuyện đó bằng Avalanche." |
| 0:12–0:20 | Trang chủ → danh sách phòng → chi tiết phòng (ảnh, giới tính, dịch vụ) → bấm "Tôi quan tâm phòng này" | "Đây là hệ thống quản lý thuê phòng chạy thật: khách tìm phòng, gửi nhu cầu thuê," |
| 0:20–0:28 | Màn **Sale**: lịch hẹn xem phòng → **Khách**: trang thanh toán cọc, bấm MoMo → mã QR MoMo Sandbox hiện ra | "Sale xếp lịch xem, khách đặt cọc qua QR chuyển khoản hoặc MoMo sandbox," |
| 0:28–0:35 | Lướt nhanh 5 màn: Quản lý, Kế toán (hóa đơn tháng), Admin. Chữ: "5 vai trò · nhiều chi nhánh · React + Express + SQL Server" | "rồi hợp đồng, hóa đơn hằng tháng, báo hỏng, trả phòng, cho năm vai trò và nhiều chi nhánh." |
| 0:35–0:45 | **Quản lý**, Bàn giao phòng: hợp đồng ở "Chờ bàn giao", lập biên bản tài sản, bấm Phát hành | "Avalanche chỉ xuất hiện ở hai lúc cần cả hai bên đồng ý. Lúc một: nhận phòng. Quản lý lập biên bản bàn giao và phát hành." |
| 0:45–0:55 | **Khách**, tab Hợp đồng: đọc biên bản, bấm "Yêu cầu chỉnh sửa", gõ "Nệm có vết rách sẵn ở góc" → **Quản lý** phát hành bản 2, lịch sử hiện 2 bản | "Khách thấy thiếu vết rách có sẵn trên nệm nên yêu cầu sửa. Quản lý phát hành bản hai, bản một vẫn được giữ." |
| 0:55–1:07 | **Khách** bấm Xác nhận → khung nhập mã 6 số → (cắt) nhập mã từ email → "Bạn đã xác nhận biên bản lúc …" | "Khách bấm xác nhận và nhập mã gửi về email. Phía sau, ví nhúng Privy ký chữ ký EIP-712 gắn đúng phiên bản này. Khách không cài ví, không cần tiền gas." |
| 1:07–1:15 | **Quản lý** thấy "Đã ghi nhận" + mã giao dịch → bấm mở Snowtrace, giao dịch `confirm` thành công | "Relayer của hệ thống trả phí gas và gửi giao dịch. Relayer không thể giả chữ ký của khách, contract chỉ nhận đúng chữ ký của ví khách." |
| 1:15–1:25 | Chữ chuyển cảnh "Vài tháng sau: trả phòng". **Kế toán** lập đối soát bản 1: cọc 3.000.000đ, trừ 400.000đ "nệm rách", hoàn còn lại. Gửi khách | "Lúc hai: trả phòng. Kế toán gửi bảng đối soát, trừ cả bốn trăm nghìn tiền nệm rách." |
| 1:25–1:35 | **Khách** bấm "Phản đối", gõ "Vết rách đã ghi trong biên bản tôi xác nhận lúc nhận phòng" | "Khách phản đối, vì vết rách đã nằm trong biên bản lúc nhận phòng. Lý do phản đối cũng được ghi lên chuỗi dưới dạng mã băm." |
| 1:35–1:50 | **Kế toán** lập bản 2 bỏ khoản nệm → **Khách** bấm "Đồng ý" → "Bạn đã đồng ý kết quả đối soát lúc …", tải bản lưu | "Kế toán lập bản hai, contract tự tính số tiền hoàn. Khách đồng ý và giữ một bản lưu trong máy. Cả hai phiên bản đều nằm trên chuỗi, không ai sửa kín được." |
| 1:50–2:02 | Trang `/kiem-chung-avalanche`: chọn file bản lưu → "Khớp". Mở file, đổi số tiền hoàn, chọn lại → "File đã bị sửa" | "Ai có file này đều tự kiểm tra được, chỉ cần mạng công khai, không cần hỏi bên cho thuê. Sửa một con số là trang báo ngay." |
| 2:02–2:12 | Terminal chạy `npm run avalanche:recover`: liệt kê hồ sơ dựng lại từ sự kiện trên chuỗi, so với database | "Và nếu bên cho thuê mất hay sửa database, lệnh này đọc sự kiện trên chuỗi để dựng lại khách đã đồng ý bản nào, số tiền bao nhiêu." |
| 2:12–2:22 | **Kế toán** ghi nhận hóa đơn tháng trả đúng hạn → **Khách**, Thông tin cá nhân → ô Điểm thưởng: "+100 điểm", trạng thái "Đã cộng điểm" | "Avalanche còn giúp giữ chân khách. Trả hóa đơn đúng hạn, khách nhận một trăm điểm DormPoints trên Fuji." |
| 2:22–2:32 | Khách bấm "Đổi ưu đãi" → ký → hóa đơn kỳ sau có dòng "giảm 20.000đ" và link Snowtrace | "Khách ký để đổi điểm lấy ưu đãi hai mươi nghìn ở hóa đơn kỳ sau. Mỗi lần cộng và đổi điểm đều có giao dịch kiểm chứng được." |
| 2:32–2:44 | Slide kiến trúc: Web2 (React, Express, SQL Server) ↔ relayer ↔ 2 contract trên C-Chain; bảng "lên chuỗi / không lên chuỗi" | "Về kỹ thuật: hai contract Solidity trên Avalanche C-Chain, chữ ký có cấu trúc EIP-712, OpenZeppelin và viem. Tên, CCCD, ảnh không bao giờ lên chuỗi, chỉ có mã băm và số tiền." |
| 2:44–2:52 | Snowtrace / Sourcify: contract DormSettlement có dấu verify; slide số liệu: gas ≈ 430.000 cho trọn vòng một hợp đồng, số bài test | "Mã nguồn đã verify. Cả vòng đời một hợp đồng chỉ tốn khoảng bốn trăm ba mươi nghìn gas, đo từ giao dịch thật trên Fuji." |
| 2:52–3:00 | Slide kết: tên đội, link GitHub, địa chỉ 2 contract | "HomeStayDorm: thuê phòng minh bạch, khách tự giữ bằng chứng. Cảm ơn ban giám khảo." |

## Dữ liệu và tab cần chuẩn bị trước khi quay

1. **Ba cửa sổ Chrome riêng profile:** Quản lý, Kế toán, Khách. Mỗi cửa sổ 1440px, zoom 110%, ẩn thanh dấu trang.
2. **Hợp đồng demo ở "Chờ bàn giao"** trên HOMEDORM4, kỳ đầu đã trả, khách đã xác nhận chính sách cọc, Sale đã tải ảnh hợp đồng giấy.
3. **Tài khoản khách chưa từng xác nhận** để quay bước nhập mã lần đầu; một tài khoản dự phòng. Hộp thư nhận OTP mở sẵn ở tab riêng (`MAIL_REDIRECT_TO`).
4. **Hồ sơ trả phòng** đã qua bước quản lý kiểm tra, để kế toán lập đối soát (cọc 3.000.000đ, bản 1 trừ 400.000đ nệm rách).
5. **Điểm thưởng:** một hóa đơn tháng (không phải kỳ đầu) của khách demo, chưa trả, để kế toán ghi nhận đúng hạn khi quay. Backend và frontend đã chạy lại sau khi bật `LOYALTY_*`.
6. **MoMo:** backend đã chạy lại sau khi thêm khóa `MOMO_TEST_*`. Chỉ cần quay cảnh QR hiện ra.
7. **Tab mở sẵn:** Snowtrace contract DormSettlement và DormPoints, Sourcify verify, trang `/kiem-chung-avalanche`, terminal ở `web/backend`.
8. **File để thử sửa:** bản sao file lưu đối soát mở sẵn trong trình soạn thảo, con trỏ đặt ở số tiền hoàn.
9. **Slide** kiến trúc, số liệu và slide kết đã xuất ảnh để chèn.

## Cách quay và dựng

- Quay từng đoạn theo bảng, mỗi đoạn một lần thu, rồi ghép. Thu lời sau khi ghép hình để khớp giây.
- Chạy thử trọn luồng một lần trước khi quay để chắc các giao dịch Fuji thành công; ví quản lý, kế toán, relayer và ví điểm thưởng phải còn AVAX test.
- Giao dịch lỗi khi quay: giữ nguyên hồ sơ, dùng hồ sơ dự phòng, không sửa database bằng tay.
- Khi giao dịch hiện trên Snowtrace, phóng to vùng "Success" và tên hàm 1–2 giây để giám khảo kịp thấy.
- Phụ đề tiếng Việt chạy dưới; chữ trên màn hình dùng đúng nhãn giao diện đang hiện.
- Xuất 1080p, nhạc nền nhỏ dưới giọng đọc. Mở link video bằng cửa sổ ẩn danh trước khi nộp.
