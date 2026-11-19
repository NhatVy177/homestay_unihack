# Kịch bản video demo vòng 1 (3:00)

Bản ngày 19/11/2026, thay bản 18/11 (J-C205). Đã thêm các phần làm sau đó: tim quan tâm, mã MoMo hiện ngay, kế toán thu tiền mặt, tình trạng tài sản khi bàn giao, xác nhận email lúc vào cổng, đổi điểm ngay lúc thanh toán, form kiểm tra trả phòng mới, điều phối tài sản, KPI Sale.

Vòng 1 chấm **kỹ thuật** và **mức tích hợp Avalanche**. Slide đã giới thiệu vấn đề, nên video vào thẳng sản phẩm. Claude quay màn hình tự động theo từng cảnh, Vy lồng tiếng sau.

## Cách đạt 3 phút mà vẫn đủ trường hợp

- **Luồng chính** đi liền một mạch: tìm phòng → hồ sơ → lịch xem → cọc → cư trú, hợp đồng → bàn giao (mốc chuỗi 1) → đang ở → trả phòng (mốc chuỗi 2) → kiểm chứng.
- **Nhánh phụ** không quay trọn mà hiện thành cảnh cắt 2–3 giây, góc trên có nhãn chữ "Nhánh: …". Ví dụ "Nhánh: khách không đến", "Nhánh: trả tiền mặt tại quầy".
- **Tốc độ:** cảnh điền form, chờ tải chạy 1,5–2×; cảnh giám khảo cần đọc (biên bản, số tiền, Snowtrace) giữ 1× và dừng hình 1 giây. Cột "Tốc độ" ghi sẵn cho người dựng.
- Tổng hình quay thô khoảng 5 phút, sau khi tua còn 3:00. Lời đọc khoảng 4,5–5 tiếng mỗi giây; lời dài hơn hình thì kéo dài cảnh tĩnh, không đọc nhanh hơn.

## Chia thời gian

| Đoạn | Thời gian | Nội dung | Nhánh phụ hiện bằng cảnh cắt |
|---|---|---|---|
| 0. Mở | 0:00–0:05 | Logo, một câu giới thiệu | |
| 1. Tìm phòng và hồ sơ | 0:05–0:28 | Lọc phòng, chi tiết, tim quan tâm, thuê nhóm, Sale xếp lịch, kết quả buổi xem | Phòng chỉ cho Nam/Nữ theo người đang ở; khách đổi/hủy lịch; khách không đến |
| 2. Giữ chỗ và cọc | 0:28–0:52 | Khách muốn đặt cọc, quản lý duyệt, kế toán chốt, trả cọc MoMo | Chuyển khoản kèm minh chứng → kế toán duyệt; tiền mặt → kế toán "Thu tiền mặt" |
| 3. Cư trú, hợp đồng, kỳ đầu | 0:52–1:06 | Khai người ở cùng, Sale lập hợp đồng, tải bản ký, trả kỳ đầu | Kỳ đầu trả tại quầy |
| 4. Mốc 1: bàn giao trên Avalanche | 1:06–1:36 | Biên bản có tình trạng từng món, khách yêu cầu sửa, bản 2, khách xác nhận, Snowtrace | Món "Hư hỏng" bắt buộc ghi chú, hiện đỏ |
| 5. Đang ở | 1:36–2:06 | Hóa đơn tháng, điểm thưởng, đổi điểm lúc thanh toán, báo hỏng | Chuyển khoản chờ kế toán xác nhận; hư hỏng "không do khách"; điều phối tài sản; KPI Sale |
| 6. Trả phòng và Mốc 2 | 2:06–2:44 | Kiểm tra phòng, đối soát tự soạn, khách phản đối, bản 2, đồng ý trên chuỗi, chi hoàn cọc, tự thanh lý | Khách nợ thêm → trả MoMo; số tiền bằng 0; thanh lý không có xác nhận của khách |
| 7. Kiểm chứng | 2:44–2:55 | Trang kiểm chứng, sửa file thì báo sai, lệnh khôi phục từ chuỗi | |
| 8. Kết | 2:55–3:00 | Câu chốt, địa chỉ 2 contract | |

## Kịch bản chi tiết

Vai trò viết tắt: **K** khách, **S** Sale, **QL** quản lý chi nhánh, **KT** kế toán. Tài khoản xem mục "Dữ liệu demo".

| Giây | Vai | Quay gì | Tốc độ | Lời đọc |
|---|---|---|---|---|
| 0:00–0:05 | | Logo HomeStayDorm, góc dưới: "Avalanche Fuji · dữ liệu demo · thanh toán sandbox" | 1× | "HomeStayDorm: một nền tảng cho cả người thuê và nhà trọ, dùng Avalanche để hai bên tin nhau." |
| 0:05–0:12 | K1 | Trang chủ → lọc khu vực, giá → chi tiết phòng (ảnh, giá/giường, giới tính) → bấm **tim** trên thẻ phòng, tim chuyển đỏ, "Đã thêm vào hồ sơ" | 1,5× | "Khách lọc phòng theo khu vực và giá. Thả tim là phòng vào ngay hồ sơ đăng ký, không phải điền lại." |
| 0:12–0:16 | K1 | Hồ sơ đăng ký: mục "Phòng quan tâm" liệt kê các phòng đã thả tim; lướt **Đăng ký thuê theo nhóm** | 2× | "Thuê theo nhóm thì hệ thống tự kiểm tra giới tính và số giường còn trống." |
| 0:16–0:18 | | Cảnh cắt "Nhánh: phòng theo giới tính": phòng ghi "Nam" vì người đang ở là nam | 1× | |
| 0:18–0:24 | S | Danh sách hồ sơ chờ xếp lịch → chọn phòng, giờ → **K1**: lịch xem, nút Xác nhận / Đổi lịch / Hủy lịch | 2× | "Sale xếp lịch xem; khách nhận email, xác nhận hoặc xin đổi, hủy." |
| 0:24–0:28 | S | Ghi kết quả "Đã xem". Cảnh cắt "Nhánh: khách không đến" | 2× | "Sau buổi xem, Sale ghi đã xem hoặc khách không đến." |
| 0:28–0:34 | K2 | Bấm **Tôi muốn đặt cọc** → modal chọn phòng, hình thức, giường, cột "Yêu cầu của bạn" → gửi | 1,5× | "Ưng phòng, khách gửi yêu cầu giữ chỗ ngay trên web." |
| 0:34–0:38 | QL → KT | Quản lý duyệt giữ chỗ → kế toán chốt số tiền cọc | 2× | "Quản lý chi nhánh duyệt, kế toán chốt số tiền." |
| 0:38–0:46 | K2 | Trang thanh toán cọc → tab **MoMo**: mã QR kiểu MoMo hiện ngay, đồng hồ đếm ngược → "Đã thanh toán" | 1× (tua đoạn chờ) | "Chọn MoMo là mã hiện ngay, khách mở app quét; thanh toán xong trang tự chuyển sang đã thanh toán." |
| 0:46–0:49 | | Cảnh cắt "Nhánh: chuyển khoản": K3 tải ảnh minh chứng → KT mở ảnh, bấm Xác nhận | 2× | "Trả chuyển khoản thì kế toán kiểm minh chứng rồi mới xác nhận." |
| 0:49–0:52 | | Cảnh cắt "Nhánh: tiền mặt": KT vào **Thu tiền mặt**, chọn hóa đơn, nhập đúng số tiền đã nhận | 2× | "Trả tiền mặt tại quầy, kế toán chọn hóa đơn và nhập đúng số tiền nhận." |
| 0:52–0:57 | K2 | Khai người ở cùng → tự duyệt khi đủ điều kiện | 2× | "Khách khai người ở cùng, đủ điều kiện thì hệ thống tự duyệt cư trú." |
| 0:57–1:03 | S | Lập hợp đồng → bản xem hợp đồng → ô kéo thả **Bản hợp đồng đã ký** → "Đã lưu" | 1,5× | "Sale lập hợp đồng, hai bên ký giấy, Sale tải bản ký; mã băm của file đi vào gói bằng chứng." |
| 1:03–1:06 | K2 | Trả khoản thu kỳ đầu bằng MoMo; hộp thư có email báo | 2× | "Khách trả khoản kỳ đầu, mỗi bước đều có email báo đúng người." |
| 1:06–1:14 | QL | Bàn giao tài sản: bộ lọc **Chưa bàn giao** → lập biên bản, chọn tình trạng từng món; chọn "Hư hỏng" thì dòng đỏ, bắt buộc ghi chú → Phát hành | 1,5× | "Avalanche xuất hiện đúng hai lúc cần cả hai bên đồng ý. Lúc thứ nhất là nhận phòng: quản lý ghi tình trạng từng món rồi phát hành biên bản." |
| 1:14–1:21 | K2 | Tab Hợp đồng: đọc biên bản → **Yêu cầu chỉnh sửa** "Nệm có vết rách sẵn" → QL phát hành bản 2, lịch sử 2 bản | 1,5× | "Khách thấy thiếu vết rách có sẵn nên yêu cầu sửa; quản lý phát hành bản hai, bản một vẫn được giữ." |
| 1:21–1:29 | K2 | Bấm **Xác nhận** → chỉ một lần bấm (email đã xác nhận lúc vào cổng) → "Bạn đã xác nhận biên bản lúc …" | 1× | "Khách đã xác nhận email từ lúc vào cổng, nên giờ chỉ cần bấm. Ví nhúng Privy ký EIP-712 đúng phiên bản này; khách không cài ví, không cần AVAX." |
| 1:29–1:36 | QL | "Đã ghi nhận" + mã giao dịch → Snowtrace, phóng to "Success" và hàm `confirm` | 1× | "Relayer trả phí gas nhưng không thể giả chữ ký, vì contract chỉ nhận đúng chữ ký của ví khách." |
| 1:36–1:42 | KT | Hóa đơn định kỳ: chọn hợp đồng, nhập chỉ số điện nước, phí sửa chữa tự có dòng "Sửa chữa SC…" → Lập | 2× | "Kế toán lập hóa đơn tháng; phí sửa do khách gây hư hỏng tự cộng vào, không phải nhập tay." |
| 1:42–1:50 | K6 | Trang thanh toán hóa đơn tháng → thẻ **Điểm thưởng của bạn** → "Dùng 100 điểm, giảm 20.000đ" → số tiền tự giảm | 1× | "Trả đúng hạn được điểm DormPoints trên Fuji. Lúc thanh toán khách dùng luôn 100 điểm để giảm hai mươi nghìn, số tiền cập nhật ngay." |
| 1:50–1:55 | K6 → KT | Chọn chuyển khoản, tải minh chứng → KT "Danh sách hóa đơn" thấy "Khách đã gửi minh chứng" → Xác nhận đã nhận tiền | 2× | "Chuyển khoản thì kế toán kiểm minh chứng rồi xác nhận; trả MoMo thì tự ghi nhận." |
| 1:55–2:00 | K6 | Hóa đơn của tôi: nhãn màu theo loại, bấm xem → hộp thoại chi tiết thanh toán; Thông tin cá nhân: "+100 điểm" | 2× | "Khách xem lại từng khoản đã trả, minh chứng và lịch sử điểm." |
| 2:00–2:03 | K6 → QL | Báo hỏng có ảnh → QL hoàn tất "do khách gây ra". Cảnh cắt "Nhánh: không do khách gây ra" | 2× | "Báo hỏng có ảnh; do khách gây ra thì phí vào kỳ sau, không do khách thì không tính." |
| 2:03–2:06 | QL | Cảnh cắt "Điều phối tài sản" (chuyển món hư về kho chờ sửa) và "KPI Sale" | 2× | "Quản lý điều phối tài sản giữa phòng và kho, theo dõi KPI của Sale." |
| 2:06–2:13 | K7 → QL | Khách gửi yêu cầu trả phòng → QL Quản lý hợp đồng → **Kiểm tra trả phòng**: form một màn, cột "Lúc nhận", chọn hiện trạng, tạm tính bên phải → Lưu | 1,5× | "Lúc thứ hai là trả phòng. Quản lý so từng món với lúc nhận, chỉ tính phần hư thêm." |
| 2:13–2:19 | KT | Đối soát hoàn cọc → phiếu tự soạn: tỷ lệ hoàn theo chính sách đã khóa, khấu trừ, số tiền hoàn → Lập | 1× | "Hệ thống tự soạn đối soát theo chính sách cọc khách đã nhận; kế toán rà và gửi." |
| 2:19–2:26 | K7 | Kết quả đối soát → **Không đồng ý / phản hồi** "Vết rách đã có trong biên bản nhận phòng" → KT lập bản 2 bỏ khoản đó | 1,5× | "Khách phản đối kèm lý do; lý do cũng lên chuỗi dưới dạng mã băm. Kế toán lập bản hai." |
| 2:26–2:32 | K7 | **Đồng ý đối soát** → "Bạn đã đồng ý kết quả đối soát lúc …" → Snowtrace | 1× | "Khách đồng ý, contract ghi kết quả. Cả hai phiên bản đều trên chuỗi, không bên nào sửa kín được." |
| 2:32–2:38 | KT → QL | KT Ghi nhận hoàn cọc kèm chứng từ → QL "Đã thu chìa khóa" → hợp đồng tự thanh lý | 2× | "Kế toán chi hoàn cọc có chứng từ, quản lý thu chìa khóa, hợp đồng tự thanh lý." |
| 2:38–2:44 | | Ba cảnh cắt: "Nhánh: khách nợ thêm" (K8 trả MoMo phần thu thêm); "Nhánh: bằng 0"; "Nhánh: thanh lý không có xác nhận" (bắt buộc lý do, bằng chứng liên hệ) | 2× | "Khách nợ thêm thì trả trước khi thanh lý; khách im lặng quá hạn thì quản lý thanh lý có lý do và bằng chứng, không bao giờ ký thay." |
| 2:44–2:50 | | `/kiem-chung-avalanche`: chọn file → "Nội dung khớp với bản đã lưu." Sửa số tiền trong file, chọn lại → "Chưa xác minh được" | 1× | "Ai có file bản lưu cũng tự kiểm tra được bằng mạng công khai; sửa một con số là trang báo ngay." |
| 2:50–2:55 | | Terminal `npm run avalanche:recover` dựng lại hồ sơ từ sự kiện trên chuỗi | 2× | "Mất hay sửa database, lệnh khôi phục đọc lại chuỗi để dựng lại hồ sơ đã xác nhận." |
| 2:55–3:00 | | Slide kết: tên đội, GitHub, địa chỉ DormSettlement và DormPoints | 1× | "HomeStayDorm: tìm phòng dễ, quản lý gọn, khách tự giữ bằng chứng. Cảm ơn ban giám khảo." |

## Dữ liệu demo cần chuẩn bị

Quay trên HOMEDORM4 vì cần Fuji thật. Mỗi cảnh dùng một hồ sơ đã ở sẵn đúng bước, để không phải chờ lịch xem hay hạn thanh toán khi quay. Tên tài khoản dưới đây là đề xuất; Claude tạo qua luồng thật trên giao diện hoặc bằng file SQL trong `database/` (hỏi Vy trước khi chạy).

| Mã | Dùng cho cảnh | Trạng thái cần có |
|---|---|---|
| K1 `demo.tim` | 0:05–0:28 | Khách mới, chưa có hồ sơ |
| K2 `demo.thue` | 0:28–1:36 | Đã xem phòng, chưa giữ chỗ; tiếp tục đi hết tới bàn giao. Email **chưa** xác nhận để quay một lần xác nhận lúc vào cổng (hoặc dùng sẵn tài khoản đã xác nhận) |
| K3 `demo.ck` | 0:46–0:49 | Phiếu cọc chờ thanh toán, chuẩn bị ảnh minh chứng |
| K4 `demo.tienmat` | 0:49–0:52 | Phiếu cọc chờ thanh toán để kế toán thu tiền mặt |
| K6 `demo.dango` | 1:36–2:06 | Đang ở, đã có ít nhất 100 điểm, có một hóa đơn tháng chưa trả, có một báo hỏng đang chờ |
| K7 `demo.traphong` | 2:06–2:38 | Đang ở, đã xác nhận bàn giao trên chuỗi, chưa gửi yêu cầu trả phòng (hoặc dùng Ivan HD0004 sau khi dọn biên bản lỗi chữ) |
| K8 `demo.nothem` | 2:38–2:44 | Đối soát có số khách phải trả thêm |
| Nhân viên | toàn bộ | Sale, Quản lý NV0003, Kế toán NV0004 chi nhánh CN0001 |

## Việc cần có trước khi quay

1. **Mã OTP Privy:** mỗi khách xác nhận email một lần. Hai cách: (a) Vy bật **test account** trong Privy Dashboard (email thử có mã cố định) để Claude tự nhập; (b) Vy nhập mã từ hộp thư `vynhat2k5+...@gmail.com` khi Claude dừng ở bước đó. Cách (a) để quay tự động trọn vẹn.
2. **Khởi động lại backend** để có D-082 (trừ điểm ngay khi thanh toán) và dòng "Cách trả".
3. **Ví còn AVAX test:** relayer, quản lý, kế toán, ví điểm thưởng.
4. **MoMo:** chế độ demo tự báo đã thanh toán sau 3 phút (D-078); khi quay cắt đoạn chờ.
5. **Tab mở sẵn:** Snowtrace hai contract, Sourcify, `/kiem-chung-avalanche`, terminal ở `web/backend`, file bản lưu đối soát để sửa số.
6. **Slide kết** xuất sẵn ảnh.

## Cách Claude quay

- Mỗi cảnh một kịch bản Playwright trên localhost:5173, cửa sổ 1440×900, quay video từng cảnh (đuôi .webm), mỗi vai một phiên đăng nhập riêng.
- Con trỏ và thao tác chạy chậm vừa phải để mắt theo kịp; cảnh chờ (MoMo, giao dịch Fuji) quay đủ rồi người dựng tua.
- Giao dịch lỗi khi quay: giữ nguyên hồ sơ, chuyển sang hồ sơ dự phòng, không sửa database bằng tay.
- Xuất từng đoạn kèm danh sách thời lượng để Vy ghép và lồng tiếng; phụ đề dùng đúng nhãn giao diện.
