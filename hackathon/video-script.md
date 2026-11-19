# Kịch bản video demo vòng 1 (3:00)

Bản ngày 19/11/2026, thay bản 18/11 (J-C205), đã sửa theo 7 góp ý của Vy (J-C209). Đã thêm các phần làm sau đó: tim quan tâm, mã MoMo hiện ngay, kế toán thu tiền mặt, tình trạng tài sản khi bàn giao, xác nhận email lúc vào cổng, đổi điểm ngay lúc thanh toán, form kiểm tra trả phòng mới, KPI Sale. Ngày 19/11 Vy chốt bỏ cảnh điều phối tài sản: phòng bàn giao cho khách mặc định mọi món "Tốt".

Vòng 1 chấm **kỹ thuật** và **mức tích hợp Avalanche**. Slide đã giới thiệu vấn đề, nên video vào thẳng sản phẩm. Claude quay màn hình tự động theo từng cảnh, Vy lồng tiếng sau.

## Theo hướng dẫn workshop (buổi 12/11, khoảng phút 1:03)

Mentor hướng dẫn cách làm video demo. Bản chép tự động của Fathom có nhiều chỗ sai chữ, các ý dưới đây là phần đọc được rõ:

- **Dưới 3 phút**, quay đủ các tính năng đang có.
- **Quay trên localhost là được**, không bắt buộc deploy. Không để lộ khóa (file `.env`, private key) trên màn hình.
- **Cho agent tự chạy app và tự quay**; trong lúc quay thấy lỗi thì sửa rồi quay lại.
- **Thêm motion cho các luồng quan trọng** để người xem dễ hiểu, có thể dựa trên một clip mẫu rồi giữ một phong cách thống nhất.
- **Giọng đọc:** có thể dùng TTS cho rõ ràng, chọn giọng dễ nghe.
- Sản phẩm phải dễ dùng; chụp hoặc quay từng màn rồi ghép.

**Nhắc của mentor (19/11):** video do AI dựng hay để chữ che mất phần demo, che hết ô nhập và nút, giám khảo khó chấm. Quy tắc dựng cho video này:

- Không chữ nào đè lên giao diện. Khung 1920×1080 chia hai vùng: màn hình app (1440×900, thu nhỏ vừa khung) và **một dải chữ riêng ở dưới** cho phụ đề; nhãn "Nhánh: …" nằm ở **dải trên**, ngoài vùng app.
- Phóng to (zoom) chỉ dùng để làm rõ, không có khung hay mũi tên che ô nhập; phóng xong trả về toàn màn.
- Mỗi cảnh có thao tác nhập liệu phải nhìn rõ chữ đang gõ và nút đang bấm.
- Trước khi gửi, xem lại từng cảnh ở 1× để chắc không có chữ che ô nào.

Áp vào kịch bản này: thêm 3 đoạn motion ngắn (sơ đồ luồng ở 0:00–0:05, thẻ "Mốc 1" ở 1:06, thẻ "Mốc 2" ở 2:06), mỗi đoạn 2–4 giây, cùng màu xanh lá của HomeStayDorm; cảnh terminal chỉ hiện lệnh và kết quả, không mở `.env`. Lời đọc: Vy tự lồng tiếng, nếu muốn dùng TTS thì Claude xuất file lời đọc theo từng cảnh.

## Cách đạt 3 phút mà vẫn đủ trường hợp

- **Luồng chính** đi liền một mạch: tìm phòng → hồ sơ → lịch xem → cọc → cư trú, hợp đồng → bàn giao (mốc chuỗi 1) → đang ở → trả phòng (mốc chuỗi 2) → kiểm chứng.
- **Nhánh phụ** không quay trọn mà hiện thành cảnh cắt 2–3 giây, góc trên có nhãn chữ "Nhánh: …". Ví dụ "Nhánh: khách không đến", "Nhánh: trả tiền mặt tại quầy".
- **Tốc độ:** cảnh điền form, chờ tải chạy 1,5–2×; cảnh giám khảo cần đọc (biên bản, số tiền, Snowtrace) giữ 1× và dừng hình 1 giây. Cột "Tốc độ" ghi sẵn cho người dựng.
- Tổng hình quay thô khoảng 5 phút, sau khi tua còn 3:00. Lời đọc khoảng 4,5–5 tiếng mỗi giây; lời dài hơn hình thì kéo dài cảnh tĩnh, không đọc nhanh hơn.

## Chia thời gian

| Đoạn | Thời gian | Nội dung | Nhánh phụ hiện bằng cảnh cắt |
|---|---|---|---|
| 0. Mở | 0:00–0:05 | Motion sơ đồ luồng, logo | |
| 1. Đăng ký, tìm phòng và hồ sơ | 0:05–0:30 | Đăng ký tài khoản, xác nhận email một lần, lọc phòng, tim quan tâm, thuê nhóm, Sale xếp lịch (thêm phòng), kết quả buổi xem | Nhóm có Nữ vào phòng Nam → báo lỗi; khách đổi/hủy lịch; khách không đến; xem xong không ưng → lịch mới với phòng chưa xem |
| 2. Giữ chỗ và cọc | 0:30–0:52 | Khách muốn đặt cọc, quản lý duyệt (ưu tiên người gửi trước), hệ thống tự tính cọc, phòng "Giữ chỗ" 1 ngày, trả MoMo | Chuyển khoản kèm minh chứng → kế toán duyệt; tiền mặt → kế toán "Thu tiền mặt" |
| 3. Cư trú, hợp đồng, kỳ đầu | 0:52–1:08 | Khai người ở cùng, Sale lập hợp đồng, tải bản ký, trả kỳ đầu | Thành viên không đạt: bỏ người đó rồi khai tiếp, hoặc cả nhóm dừng → trả phòng, hoàn 80% cọc |
| 4. Mốc 1: bàn giao trên Avalanche | 1:08–1:38 | Biên bản có tình trạng từng món (mặc định "Tốt"), khách yêu cầu sửa, bản 2, khách xác nhận, Snowtrace | |
| 5. Đang ở | 1:38–2:06 | Báo hỏng do khách → phí vào hóa đơn tháng, đổi điểm lúc thanh toán, kế toán xác nhận chuyển khoản | Hư hỏng "không do khách"; KPI Sale |
| 6. Trả phòng và Mốc 2 | 2:06–2:44 | Kiểm tra phòng, đối soát tự soạn, khách phản đối, bản 2, đồng ý trên chuỗi, chi hoàn cọc, kết thúc hợp đồng | Khách nợ thêm → trả MoMo; số tiền bằng 0; thanh lý không có xác nhận |
| 7. Kiểm chứng | 2:44–2:55 | Trang kiểm chứng, sửa file thì báo sai, lệnh khôi phục từ chuỗi | |
| 8. Kết | 2:55–3:00 | Câu chốt, địa chỉ 2 contract | |

## Kịch bản chi tiết

Vai trò viết tắt: **K** khách, **S** Sale, **QL** quản lý chi nhánh, **KT** kế toán. Tài khoản xem mục "Dữ liệu demo". Mọi cảnh trong bảng đều đã có code.

| Giây | Vai | Quay gì | Tốc độ | Lời đọc |
|---|---|---|---|---|
| 0:00–0:05 | | Motion: logo HomeStayDorm, rồi dải sơ đồ luồng chạy từ trái sang phải (Tìm phòng → Cọc → Hợp đồng → **Bàn giao ⛓** → Đang ở → **Trả phòng ⛓**), hai mốc chuỗi sáng lên. Dải dưới: "Avalanche Fuji · dữ liệu demo · thanh toán sandbox" | 1× | "HomeStayDorm: một nền tảng cho cả người thuê và nhà trọ, dùng Avalanche để hai bên tin nhau." |
| 0:05–0:10 | K1 | Trang chủ → **Đăng ký tài khoản** (họ tên, email, số điện thoại, mật khẩu) → vào cổng khách → thẻ **Xác nhận email của bạn** → nhập mã OTP gửi về email → "Email đã xác nhận. Bạn sẵn sàng xác nhận biên bản chỉ bằng một lần bấm." | 1,5× (tua đoạn chờ mã) | "Khách đăng ký và xác nhận email một lần ngay khi vào cổng. Hệ thống tạo sẵn ví nhúng cho khách, nên về sau ký biên bản trên Avalanche chỉ cần một lần bấm, không cài ví, không cần AVAX." |
| 0:10–0:15 | K1 | Trang chủ → lọc khu vực, giá → chi tiết phòng (ảnh, giá/giường, giới tính) → bấm **tim** trên thẻ phòng, tim chuyển đỏ, "Đã thêm vào hồ sơ" | 2× | "Khách lọc phòng theo khu vực và giá. Thả tim là phòng vào ngay hồ sơ đăng ký." |
| 0:15–0:19 | K1 | **Đăng ký thuê theo nhóm** vào phòng Nam: thêm một thành viên Nữ → bấm **Tiếp tục** → báo lỗi phòng chỉ nhận Nam → sửa lại thành viên → qua bước 2 | 2× | "Thuê nhóm thì hệ thống kiểm tra giới tính và số giường trống; nhóm có nữ vào phòng nam bị chặn ngay." |
| 0:19–0:24 | S | Hồ sơ chờ xếp lịch → phòng khách thả tim được chọn sẵn, Sale **tích thêm phòng khác** để dẫn khách xem thêm → đặt giờ | 2× | "Sale thấy phòng khách quan tâm, có thể thêm phòng khác để dẫn khách xem, rồi đặt giờ." |
| 0:24–0:26 | K1 | Lịch xem: Xác nhận / Đổi lịch / Hủy lịch | 2× | "Khách nhận email, xác nhận hoặc xin đổi, hủy lịch." |
| 0:26–0:28 | S | Ghi kết quả "Đã xem". Cảnh cắt "Nhánh: khách không đến" | 2× | "Sau buổi xem, Sale ghi đã xem hoặc khách không đến." |
| 0:28–0:30 | S | Cảnh cắt "Nhánh: xem xong chưa ưng": Sale lập lịch xem tiếp, danh sách chỉ còn phòng chưa xem | 2× | "Khách chưa ưng thì Sale lập lịch xem tiếp với các phòng chưa xem." |
| 0:30–0:35 | K2 | Bấm **Tôi muốn đặt cọc** → modal chọn phòng, hình thức, giường, cột "Yêu cầu của bạn" → gửi | 1,5× | "Ưng phòng, khách gửi yêu cầu giữ chỗ ngay trên web." |
| 0:35–0:40 | QL | Kiểm duyệt đặt cọc: hai yêu cầu cùng phòng, nhãn **"Yêu cầu gửi trước"** → duyệt người gửi trước; phiếu cọc hiện số tiền hệ thống tự tính, phòng chuyển **Giữ chỗ**, hạn thanh toán 1 ngày | 1,5× | "Nhiều yêu cầu cùng một phòng thì ưu tiên người gửi trước. Hệ thống tự tính tiền cọc, phòng chuyển giữ chỗ, khách có một ngày để thanh toán." |
| 0:40–0:46 | K2 | Thanh toán cọc → tab **MoMo**: mã QR kiểu MoMo hiện ngay, đồng hồ đếm ngược → "Đã thanh toán" | 1× (tua đoạn chờ) | "Chọn MoMo là mã hiện ngay, khách quét bằng app; trả xong trang tự chuyển sang đã thanh toán." |
| 0:46–0:49 | | Cảnh cắt "Nhánh: chuyển khoản": K3 tải minh chứng → KT mở ảnh, Xác nhận | 2× | "Chuyển khoản thì kế toán kiểm minh chứng rồi mới xác nhận." |
| 0:49–0:52 | | Cảnh cắt "Nhánh: tiền mặt": KT **Thu tiền mặt**, chọn hóa đơn, nhập đúng số tiền nhận | 2× | "Trả tiền mặt tại quầy, kế toán chọn hóa đơn và nhập đúng số tiền nhận." |
| 0:52–0:57 | K2 | Khai người ở cùng → tự duyệt khi đủ điều kiện | 2× | "Khách khai người ở cùng, đủ điều kiện thì hệ thống tự duyệt cư trú." |
| 0:57–1:01 | | Cảnh cắt "Nhánh: có người không đạt": (a) bỏ người đó rồi khai tiếp; (b) cả nhóm dừng → tab Trả phòng của phiếu cọc, hoàn **80% cọc** (đã cọc, chưa ký hợp đồng) → quản lý xác nhận hồ sơ | 2× | "Có thành viên không đạt: nhóm bỏ người đó để thuê tiếp, hoặc cả nhóm dừng và nhận lại tám mươi phần trăm cọc theo chính sách." |
| 1:01–1:05 | S | Lập hợp đồng → ô kéo thả **Bản hợp đồng đã ký** → "Đã lưu" | 2× | "Sale lập hợp đồng, hai bên ký giấy, Sale tải bản ký; mã băm của file đi vào gói bằng chứng." |
| 1:05–1:08 | K2 | Trả kỳ đầu bằng MoMo; hộp thư có email báo | 2× | "Khách trả khoản kỳ đầu; mỗi bước đều có email báo đúng người." |
| 1:08–1:13 | QL | Motion 2 giây: thẻ "Mốc 1 · Nhận phòng". Bàn giao tài sản, bộ lọc **Chưa bàn giao** → lập biên bản, mọi món mặc định "Tốt" | 1,5× | "Avalanche xuất hiện đúng hai lúc cần cả hai bên đồng ý. Lúc nhận phòng, quản lý ghi tình trạng từng món; khách đọc lại trước khi xác nhận." |
| 1:13–1:20 | K2 | Tab Hợp đồng: đọc biên bản → **Yêu cầu chỉnh sửa** "Nệm có vết rách sẵn" → QL phát hành bản 2 có ghi vết rách, lịch sử 2 bản | 1,5× | "Khách đọc lại, thấy thiếu vết rách có sẵn nên yêu cầu sửa; quản lý phát hành bản hai, bản một vẫn được giữ." |
| 1:20–1:30 | K2 | Bấm **Xác nhận** → chỉ một lần bấm (email đã xác nhận lúc vào cổng) → "Bạn đã xác nhận biên bản lúc …" | 1× | "Email đã xác nhận từ lúc đăng ký nên giờ chỉ cần bấm. Ví nhúng Privy ký EIP-712 đúng phiên bản này; không cài ví, không cần AVAX." |
| 1:30–1:38 | QL | "Đã ghi nhận" + mã giao dịch → Snowtrace, phóng to "Success" và hàm `confirm` | 1× | "Relayer trả phí gas nhưng không giả được chữ ký, vì contract chỉ nhận đúng chữ ký của ví khách." |
| 1:38–1:43 | K6 → QL | Khách **báo hỏng** có ảnh → QL tiếp nhận, hoàn tất "Do khách gây ra", phí sửa 100.000đ. Cảnh cắt "Nhánh: không do khách gây ra" | 2× | "Trong thời gian ở, khách báo hỏng có ảnh; do khách gây ra thì tính phí sửa, không do khách thì không tính." |
| 1:43–1:48 | KT | Hóa đơn định kỳ: chọn hợp đồng, nhập chỉ số điện nước, dòng **"Sửa chữa SC…"** tự có trong chi phí phát sinh → Lập | 2× | "Đến kỳ, kế toán lập hóa đơn tháng; phí sửa đó tự cộng vào, không nhập tay." |
| 1:48–1:56 | K6 | Thanh toán hóa đơn tháng → thẻ **Điểm thưởng của bạn** → "Dùng 100 điểm, giảm 20.000đ" → số tiền tự giảm | 1× | "Trả đúng hạn được điểm DormPoints trên Fuji. Lúc thanh toán khách dùng luôn 100 điểm để giảm hai mươi nghìn." |
| 1:56–2:01 | K6 → KT | Chọn chuyển khoản, tải minh chứng → KT "Danh sách hóa đơn" thấy "Khách đã gửi minh chứng" → Xác nhận đã nhận tiền | 2× | "Chuyển khoản thì kế toán kiểm minh chứng rồi xác nhận; trả MoMo thì tự ghi nhận." |
| 2:01–2:06 | K6 / QL | Hóa đơn của tôi: nhãn màu theo loại, hộp thoại chi tiết thanh toán, "+100 điểm". Cảnh cắt "KPI Sale" của quản lý | 2× | "Khách xem lại từng khoản đã trả và lịch sử điểm; quản lý theo dõi KPI của Sale." |
| 2:06–2:13 | K7 → QL | Motion 2 giây: thẻ "Mốc 2 · Trả phòng". Khách gửi yêu cầu trả phòng → QL Quản lý hợp đồng → **Kiểm tra trả phòng**: form một màn, cột "Lúc nhận", chọn hiện trạng, tạm tính → Lưu; dòng hợp đồng hiện "Chờ kế toán lập đối soát" | 1,5× | "Lúc thứ hai là trả phòng. Quản lý so từng món với lúc nhận, chỉ tính phần hư thêm." |
| 2:13–2:19 | KT | **Đối soát trả phòng** → phiếu tự soạn: tỷ lệ hoàn theo chính sách đã khóa, khấu trừ, số tiền hoàn → Lập | 1× | "Hệ thống tự soạn đối soát theo chính sách cọc khách đã nhận; kế toán rà rồi gửi." |
| 2:19–2:26 | K7 | Kết quả đối soát → **Không đồng ý / phản hồi** "Vết rách đã có trong biên bản nhận phòng" → KT lập bản 2 bỏ khoản đó | 1,5× | "Khách phản đối kèm lý do, lý do cũng lên chuỗi dạng mã băm. Kế toán lập bản hai." |
| 2:26–2:32 | K7 | **Đồng ý đối soát** → "Bạn đã đồng ý kết quả đối soát lúc …" → Snowtrace | 1× | "Khách đồng ý, contract ghi kết quả. Cả hai phiên bản đều trên chuỗi, không bên nào sửa kín được." |
| 2:32–2:38 | KT → QL | KT Ghi nhận hoàn cọc kèm chứng từ → dòng hợp đồng mới hiện **Kết thúc hợp đồng** → QL "Đã thu chìa khóa" → tự thanh lý | 2× | "Kế toán chi hoàn cọc có chứng từ; chỉ khi tiền xong quản lý mới kết thúc hợp đồng, thu chìa khóa, hợp đồng tự thanh lý." |
| 2:38–2:44 | | Ba cảnh cắt: "Nhánh: khách nợ thêm" (K8 trả MoMo phần thu thêm); "Nhánh: bằng 0"; "Nhánh: thanh lý không có xác nhận" (liên kết "Thanh lý ngoại lệ", bắt buộc lý do và bằng chứng liên hệ) | 2× | "Khách nợ thêm thì trả trước khi thanh lý; khách im lặng quá hạn thì quản lý thanh lý có lý do và bằng chứng, không bao giờ ký thay." |
| 2:44–2:50 | | `/kiem-chung-avalanche`: chọn file → "Nội dung khớp với bản đã lưu." Sửa số tiền trong file, chọn lại → "Chưa xác minh được" | 1× | "Ai có file bản lưu cũng tự kiểm tra được bằng mạng công khai; sửa một con số là trang báo ngay." |
| 2:50–2:55 | | Terminal `npm run avalanche:recover` dựng lại hồ sơ từ chuỗi (không mở `.env`) | 2× | "Mất hay sửa database, lệnh khôi phục đọc lại chuỗi để dựng lại hồ sơ đã xác nhận." |
| 2:55–3:00 | | Slide kết: tên đội, GitHub, địa chỉ DormSettlement và DormPoints | 1× | "HomeStayDorm: tìm phòng dễ, quản lý gọn, khách tự giữ bằng chứng. Cảm ơn ban giám khảo." |

## Dữ liệu demo cần chuẩn bị

Quay trên HOMEDORM4 vì cần Fuji thật. Mỗi cảnh dùng một hồ sơ đã ở sẵn đúng bước, để không phải chờ lịch xem hay hạn thanh toán khi quay. Tên tài khoản dưới đây là đề xuất; Claude tạo qua luồng thật trên giao diện hoặc bằng file SQL trong `database/` (hỏi Vy trước khi chạy).

| Mã | Dùng cho cảnh | Trạng thái cần có |
|---|---|---|
| K1 `demo.tim` | 0:05–0:28 | Chưa có tài khoản: đăng ký ngay trong cảnh bằng email `vynhat2k5+k1@gmail.com` (mã OTP về hộp thư Vy) |
| K2 `demo.thue` | 0:28–1:36 | Đã xem phòng, chưa giữ chỗ; tiếp tục đi hết tới bàn giao. Email **đã** xác nhận sẵn (cảnh xác nhận email chỉ quay với K1) |
| K2b `demo.ganguoi` | 0:35–0:40 | Gửi yêu cầu giữ chỗ **cùng phòng** với K2 nhưng **sau** K2, để quản lý thấy nhãn "Yêu cầu gửi trước" |
| K1b `demo.nhom` | 0:57–1:01 | Đã cọc theo nhóm, chưa ký hợp đồng, có một thành viên không đạt điều kiện cư trú (ví dụ dưới 18 tuổi) |
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
