# Kịch bản video demo (2:40)

Bản nháp ngày 11/11/2026 (việc D3, J-C063).

Theo D-018 mục 3, video bắt đầu từ một hợp đồng chuẩn bị sẵn ở bước "Chờ bàn giao". Phần Web2 phía trước nằm ở slide trang 3. Luồng demo theo bảng kiểm Fuji của việc A3 (`spec/kiem-thu-fuji.md`, chưa viết).

Chia thời gian:

| Đoạn | Thời gian | Thời lượng |
|---|---|---|
| Mở đầu | 0:00–0:10 | 10 giây |
| Demo liền mạch | 0:10–2:00 | 110 giây |
| Vì sao Avalanche và giới hạn | 2:00–2:30 | 30 giây |
| Kết | 2:30–2:40 | 10 giây |

Còn 10–20 giây trống trước mốc 3 phút để bù khi nói chậm.

Lời nói viết để đọc tự nhiên, không quá 3,5 tiếng mỗi giây. Chữ trên màn hình ở cột giữa là mô tả gần đúng; khi quay, dùng đúng chữ giao diện đang hiện. Đoạn chờ OTP, chờ giao dịch thì cắt khi dựng, không để màn hình đứng yên.

## Kịch bản

| Giây | Hình trên màn | Lời nói |
|---|---|---|
| 0:00–0:10 | Ảnh nệm rách → logo HomeStayDorm. Chữ nhỏ góc dưới: "Fuji testnet · dữ liệu giả · cổng thanh toán mô phỏng" | "Trả phòng là lúc hay cãi nhau về tiền cọc. HomeStayDorm cho người thuê tự xác nhận trên Avalanche. Video dùng mạng thử Fuji, dữ liệu giả và cổng thanh toán mô phỏng." |
| 0:10–0:22 | **Quản lý**, tab Bàn giao phòng: hợp đồng demo ở "Chờ bàn giao", kỳ đầu đã trả. Bấm lập biên bản, điền tài sản, phát hành. Bản này chưa ghi vết rách nệm | "Khách đã trả kỳ đầu qua ví mô phỏng. Quản lý lập biên bản bàn giao trên web và phát hành, khách nhận ngay trong tài khoản và qua email." |
| 0:22–0:34 | **Khách**, tab Hợp đồng: đọc biên bản, bấm "Yêu cầu chỉnh sửa", gõ "Nệm có vết rách sẵn ở góc, nhờ ghi vào biên bản" | "Khách thấy biên bản thiếu vết rách có sẵn trên nệm, nên yêu cầu sửa thay vì xác nhận." |
| 0:34–0:44 | **Quản lý**: mở yêu cầu, thêm dòng "Nệm: rách góc" kèm ảnh, phát hành bản mới. Lịch sử hiện hai bản | "Quản lý phát hành bản mới. Bản cũ vẫn được giữ, không bị ghi đè." |
| 0:44–1:00 | **Khách**: bấm "Xác nhận", khung nhập mã 6 số hiện trong trang. Cắt sang hộp thư lấy mã, nhập mã. Hiện "Bạn đã xác nhận biên bản lúc …", nút tải bản lưu | "Khách bấm xác nhận và nhập mã gửi về email, chỉ lần đầu. Không cài ví, không cần tiền gas. Khách chỉ thấy đã xác nhận lúc nào và tải được bản lưu." |
| 1:00–1:08 | **Quản lý**, tab "Khách xác nhận biên bản": dòng "Đã ghi nhận", mã giao dịch; bấm mở explorer Fuji 2 giây | "Phía bên cho thuê thấy giao dịch đã ghi trên Avalanche." |
| 1:08–1:20 | Chữ chuyển cảnh "Vài tháng sau: trả phòng". **Kế toán**, tab Quyết toán trả phòng: đối soát bản 1, cọc 3.000.000 đ, trừ 500.000 đ khoản khác và 400.000 đ "nệm rách", hoàn 2.100.000 đ. Gửi khách | "Khi trả phòng, kế toán gửi bảng đối soát: cọc 3 triệu, trừ cả 400 nghìn tiền nệm rách." |
| 1:20–1:32 | **Khách**: mở đối soát, bấm "Phản đối", gõ "Vết rách đã ghi trong biên bản bàn giao tôi đã xác nhận" | "Khách phản đối, vì vết rách đã nằm trong biên bản lúc nhận phòng. Lý do phản đối cũng được ghi lại trên chuỗi dưới dạng mã băm." |
| 1:32–1:42 | **Kế toán**: xem lý do, lập bản 2 bỏ khoản nệm, hoàn 2.500.000 đ. Lịch sử hiện bản 1 "Khách phản đối", bản 2 "Chờ khách" | "Kế toán xem lại và lập bản hai, hoàn 2 triệu rưỡi. Bản một vẫn còn trong lịch sử." |
| 1:42–1:50 | **Khách**: bấm "Đồng ý", hiện "Bạn đã đồng ý kết quả đối soát lúc …", tải bản lưu | "Khách đồng ý bản hai và giữ bản lưu trong máy." |
| 1:50–1:56 | Trang `/kiem-chung-avalanche`: chọn file bản lưu → "Khớp", bản 2 là bản mới nhất | "Ai có file này đều tự kiểm tra được, chỉ cần mạng công khai, không cần hỏi bên cho thuê." |
| 1:56–2:00 | Mở file trong trình soạn thảo, đổi 2500000 thành 3000000, chọn lại → "File đã bị sửa" | "Sửa một con số là trang báo ngay." |
| 2:00–2:15 | Explorer: trang contract có dấu đã verify source, danh sách 6 giao dịch của hồ sơ | "Em dùng Avalanche C-Chain vì tương thích EVM, viết contract bằng Solidity với chữ ký có cấu trúc EIP-712. Mã nguồn contract đã verify trên explorer." |
| 2:15–2:30 | Slide giới hạn (trang 9) | "Giới hạn: đây là xác nhận điện tử bổ sung, hợp đồng vẫn ký giấy. Chuỗi không phán vết rách thật hay giả và không giữ tiền. Khóa vận hành chưa phải multisig, contract chưa kiểm toán." |
| 2:30–2:40 | Slide kết: repo, link contract trên explorer | "Mã nguồn và địa chỉ contract ở trên màn hình. Cảm ơn ban giám khảo." |

## Dữ liệu cần chuẩn bị trước khi quay

Tất cả là dữ liệu giả. Không dùng tên, số điện thoại, CCCD thật.

1. **Contract đã deploy và verify trên Fuji** (việc A2). Ví relayer, "quản lý", "kế toán" còn đủ AVAX thử cho ít nhất 2 lượt quay (mỗi lượt 6 giao dịch).
2. **Tài khoản khách demo** có email mở được trên máy quay, để nhận mã OTP. Nên dùng tài khoản chưa từng xác nhận, để quay được bước nhập mã lần đầu. Chuẩn bị thêm một tài khoản dự phòng.
3. **Hợp đồng demo ở "Chờ bàn giao"**, làm theo luồng Web2 thật hoặc theo cách ghi trong `spec/kiem-thu-fuji.md`. Không sửa dữ liệu khác trong CSDL. Hợp đồng cần đủ ba điều kiện:
   - kỳ đầu đã trả qua ví mô phỏng;
   - khách đã xác nhận chính sách hoàn cọc;
   - Sale đã tải ảnh hợp đồng giấy đã ký (điều kiện của gói bàn giao v2, D-034).
4. **Ảnh nệm có vết rách** để đính vào biên bản.
5. **Hồ sơ trả phòng:** sau khi quay xong đoạn bàn giao, quản lý làm bước kiểm tra trả phòng trước, để kế toán có dữ liệu lập đối soát. Số tiền dùng đúng như kịch bản:

   | Mục | Số tiền |
   |---|---|
   | Cọc | 3.000.000 đ |
   | Bản 1: trừ khoản khác | 500.000 đ |
   | Bản 1: trừ nệm rách | 400.000 đ |
   | Bản 1: hoàn | 2.100.000 đ |
   | Bản 2: hoàn (bỏ khoản nệm) | 2.500.000 đ |
6. **Ba cửa sổ trình duyệt dùng hồ sơ (profile) riêng** cho quản lý, kế toán, khách, để phiên đăng nhập và ví không lẫn nhau. Mỗi cửa sổ rộng 1440px, phóng to 110%, ẩn thanh dấu trang.
7. **Email:** `MAIL_REDIRECT_TO` trỏ về hộp thư demo; mở sẵn hộp thư ở một tab.
8. **File để thử sửa:** chép sẵn một bản của file bản lưu đối soát, mở trong trình soạn thảo, đặt con trỏ ở số tiền hoàn.
9. **Explorer:** mở sẵn tab trang contract và tab danh sách giao dịch.
10. **Slide trang 9 và trang 10** đã dựng xong để chèn vào cuối video.

## Cách quay

- Quay từng đoạn theo bảng, mỗi đoạn một lần thu, rồi ghép. Thu lời nói riêng sau khi ghép hình để khớp giây.
- Thử trọn luồng một lần trước buổi quay (việc A3). Ghi lại mã giao dịch thật để điền README mục 3.4.
- Nếu một giao dịch lỗi trong lúc quay, giữ nguyên hồ sơ, không sửa CSDL bằng tay. Dùng hồ sơ dự phòng và quay lại đoạn đó.
- Xuất 1080p, kiểm tra tiếng rõ. Mở link video bằng cửa sổ ẩn danh trước khi nộp.
