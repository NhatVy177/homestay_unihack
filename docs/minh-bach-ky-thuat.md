# Riêng tư, chi phí và giới hạn

Tài liệu này nói thẳng HomeStayDorm đưa gì lên chuỗi Avalanche, tốn bao nhiêu và còn giới hạn gì. Số liệu lấy từ các giao dịch thật trên Fuji (mạng thử nghiệm), không phải ước đoán.

## Dữ liệu nào lên chuỗi

Contract: [`0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C`](https://testnet.snowtrace.io/address/0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C) trên Avalanche Fuji (chain 43113), mã nguồn đã xác minh trên Sourcify.

| Lên chuỗi | Không lên chuỗi |
|---|---|
| Mã hồ sơ (một mã băm, không suy ra được số hợp đồng) | Tên, CCCD, số điện thoại, email của khách |
| Địa chỉ ví của khách (ví tạo tự động, không gắn với tên) | Nội dung biên bản bàn giao, ảnh phòng, ảnh báo hỏng |
| Mã băm của biên bản bàn giao và bản đối soát | Hợp đồng, hóa đơn, chứng từ chuyển khoản |
| Phiên bản đối soát, số tiền hoàn cọc và số tiền thu thêm | Ảnh đại diện, mật khẩu, mã OTP |
| Thời điểm khách xác nhận / phản hồi | |

Khách giữ một bản biên bản (tệp `.json` hoặc bản in). Ai cũng đối chiếu được bản đó với mã băm trên chuỗi để biết có bị sửa hay không, ngay trong trang Hợp đồng (nút "Kiểm tra biên bản ngay") hoặc ở trang `/kiem-chung-avalanche`.

## Khách không cần ví, không cần AVAX

- Khách đăng nhập bằng email như web bình thường. Lần đầu xác nhận biên bản, khách nhập mã OTP gửi qua email; ví được tạo tự động (Privy), khách không thấy và không phải quản lý khóa.
- Khách chỉ **ký** xác nhận. Máy chủ (relayer) gửi giao dịch lên chuỗi và **trả phí gas**. Relayer không giả được chữ ký của khách: contract chỉ nhận xác nhận có đúng chữ ký của ví khách.

## Chi phí gas (đo từ giao dịch thật trên Fuji)

| Bước | Ai ký | Gas đã dùng |
|---|---|---|
| Quản lý phát hành biên bản bàn giao | Ví quản lý | 159.772 |
| Khách xác nhận biên bản bàn giao | Ví khách (relayer gửi) | 67.110 |
| Kế toán gửi bản đối soát cọc | Ví kế toán | 130.054 |
| Khách đồng ý bản đối soát | Ví khách (relayer gửi) | 73.009 |
| **Cả vòng đời một hợp đồng** | | **≈ 430.000** |

Phí = gas × giá gas. Trên Fuji giá gas lúc chạy là 160 wei/gas nên phí gần bằng 0. Trên mạng chính C-Chain, giá gas dao động; công thức để tự tính:

`phí (AVAX) = 430.000 × giá gas (nAVAX) ÷ 10⁹`

Ví dụ giả định (không phải giá thật): giá gas 25 nAVAX thì một hợp đồng tốn ≈ 0,011 AVAX; nếu 1 AVAX = 500.000đ thì ≈ 5.400đ cho trọn vòng bàn giao và đối soát. Hãy thay giá gas và giá AVAX lúc tính.

## Khôi phục từ chuỗi khi mất cơ sở dữ liệu

`npm run avalanche:recover` (trong `web/backend`) đọc toàn bộ sự kiện của contract từ chuỗi và dựng lại danh sách hồ sơ: bàn giao đã được khách xác nhận chưa, bản đối soát phiên bản mấy, khách đồng ý hay phản hồi, số tiền hoàn/thu thêm. Sau đó so với bảng `AvalancheCase` và báo hồ sơ nào chỉ có trên chuỗi hoặc chỉ có trong cơ sở dữ liệu. Lần chạy ngày 18/11/2026 dựng lại đúng HD0001 và HD0002, không lệch.

Nghĩa là: kể cả khi bên cho thuê mất hoặc sửa cơ sở dữ liệu, việc khách đã xác nhận biên bản nào và đồng ý số tiền đối soát nào vẫn dựng lại được.

## Giới hạn đã biết

| Giới hạn | Hệ quả | Hiện xử lý thế nào |
|---|---|---|
| Fuji là mạng thử nghiệm | Không cam kết lưu vĩnh viễn, AVAX thử không có giá trị | Chỉ dùng cho bản demo; triển khai thật cần chạy lại trên C-Chain |
| Số tiền hoàn cọc / thu thêm nằm công khai trên chuỗi | Ai biết mã hồ sơ thì thấy số tiền (không thấy tên) | Mã hồ sơ là mã băm, không suy ra từ số hợp đồng |
| Relayer và ví quản lý / kế toán dùng khóa đặt ở máy chủ | Lộ khóa máy chủ thì kẻ xấu gửi được giao dịch thay quản lý / kế toán (vẫn không giả được chữ ký khách) | Khóa nằm trong biến môi trường, không vào Git |
| Relayer có thể ngừng gửi giao dịch | Khách ký rồi nhưng xác nhận chưa lên chuỗi | Hồ sơ giữ trạng thái chờ và gửi lại; trang kiểm chứng báo rõ khi chưa có trên chuỗi |
| Ví khách phụ thuộc Privy | Privy gián đoạn thì khách tạm chưa ký được | Biên bản vẫn xem và tải được; ký sau |
| Lệnh khôi phục đọc nhật ký qua API của Snowtrace/Routescan | API đó lỗi thì lệnh khôi phục tạm không chạy | Có thể đổi nguồn bằng biến `AVALANCHE_LOGS_API` |
| Chuỗi chỉ chứng minh nội dung không bị sửa | Không chứng minh tình trạng phòng thật hay tiền đã chuyển | Ảnh, biên bản và chứng từ vẫn do người kiểm tra |
| Mã OTP quên mật khẩu giữ trong bộ nhớ máy chủ | Khởi động lại máy chủ thì phải xin mã mới | Mã hết hạn sau 10 phút, tối đa 5 lần thử |
| Link phòng hiện ảnh/giá khi dán Facebook (`/chia-se/phong/<mã>`) | Facebook chỉ đọc được khi web và API ở địa chỉ công khai | Đặt `PUBLIC_WEB_URL`, `PUBLIC_API_URL` khi triển khai |
| Ảnh đại diện, ảnh báo hỏng lưu trên ổ đĩa máy chủ | Đổi máy chủ cần chép theo thư mục `web/backend/uploads` | Không đưa ảnh lên chuỗi để giữ riêng tư |
