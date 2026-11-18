# Kế hoạch slide vòng 1

Bản ngày 18/11/2026. Slide đi cùng video 3 phút ([video-script.md](video-script.md)). Vòng 1 chấm **kỹ thuật** và **tích hợp Avalanche**: slide phải cho giám khảo thấy bài toán thật, luồng đầy đủ, Avalanche nằm đúng chỗ, và bằng chứng kiểm chứng được.

## Bộ nhận diện (khớp giao diện web)

| Vai trò | Màu | Dùng cho |
|---|---|---|
| Chính (xanh rêu) | `#4A6549` | Tiêu đề, khối nhấn, mốc Avalanche, nút |
| Xanh nhạt | `#E8EDE7` | Nền thẻ, nền ô số liệu |
| Nền | `#F7FAF5` | Nền slide |
| Nền phụ | `#F1F4F0` | Khung ảnh chụp màn hình, bảng |
| Nhấn phụ (nâu) | `#8C7355` | Con số quan trọng, nhãn "mới" (dùng ít) |
| Chữ | `#191C1A` | Nội dung |
| Chữ phụ | `#5E655C` | Chú thích, nguồn |
| Đỏ Avalanche | `#E84142` | Chỉ cho logo Avalanche |

- **Font:** Inter (giống web). Tiêu đề Inter Bold 36–44, nội dung Inter Regular 18–22, chú thích 14. Không dùng quá 2 cỡ chữ nội dung trên một slide.
- **Bố cục:** khung 16:9, lề 64px, góc bo 16–20px cho thẻ và ảnh. Mỗi slide một ý chính, tối đa 3–4 gạch đầu dòng, mỗi dòng ≤ 12 chữ.
- **Ảnh chụp màn hình:** đặt trong khung laptop/điện thoại (mockup) hoặc thẻ bo góc có bóng nhẹ, nền `#F1F4F0`. Chụp ở 1440px, zoom 110%, dữ liệu demo. Che email, số điện thoại thật nếu có.
- **Icon:** bộ nét mảnh (Lucide/Phosphor trong Canva, hoặc bộ "line icons"), một màu `#4A6549`.
- **Quy ước Avalanche:** mọi bước ghi lên chuỗi tô nền `#4A6549` chữ trắng và gắn icon chuỗi khối nhỏ, để giám khảo nhìn là biết chỗ nào on-chain.

## Mẫu Canva gợi ý (tone xanh)

Mở từng mẫu, đổi màu về bảng trên bằng tính năng "Styles"/đổi màu toàn bộ. Mình chỉ thấy tên mẫu trong kết quả tìm kiếm, chưa xem trực tiếp, nên cần mở ra kiểm tra bảng màu và mẫu có miễn phí không.

- "Green Minimalist Professional Tech Start-Up Pitch Deck Presentation": hợp nhất cho bài thi công nghệ.
- "Sage Green Minimalist Professional Presentation" hoặc "Soft Sage Green Minimalist Research Proposal Presentation": màu xanh rêu gần giao diện nhất.
- "Green Modern Pitch Deck Presentation" (mục Technology).
- Nơi tìm: [Startup templates](https://www.canva.com/presentations/templates/startup/), [Technology templates](https://www.canva.com/presentations/templates/technology/), [Sage green templates](https://www.canva.com/templates/s/sage-green/), [Pitch deck templates](https://www.canva.com/presentations/templates/pitch-deck/).

## Cấu trúc 17 slide

### 1. Bìa
- **Tiêu đề:** HomeStayDorm
- **Phụ đề:** Thuê phòng minh bạch, khách tự giữ bằng chứng trên Avalanche
- **Nội dung:** tên đội, thành viên, "Team1 Vietnam UniHack 2026", logo Avalanche nhỏ góc phải.
- **Hình:** mockup laptop hiển thị trang chủ HomeStayDorm (ảnh phòng lớn), đặt nghiêng bên phải. Nền `#F7FAF5`, một khối xanh rêu bo góc phía sau mockup.

### 2. Bài toán
- **Tiêu đề:** Thuê phòng hôm nay: rời rạc, thủ công, dễ tranh chấp
- **Nội dung:** 3 cột, mỗi cột icon + 1 câu:
  - Người thuê: tìm phòng qua nhóm Facebook, Zalo; tin trôi, ảnh không đúng thực tế.
  - Chủ nhà: quản lý bằng sổ tay, Excel, tin nhắn; nhiều chi nhánh là rối.
  - Trả phòng: cãi nhau tiền cọc vì biên bản giấy thất lạc, bảng trừ cọc một bên giữ.
- **Hình:** 3 ảnh nhỏ: nhóm Facebook tìm trọ (làm mờ thông tin), file Excel danh sách giả, nệm rách/bảng trừ cọc.

### 3. Giải pháp
- **Tiêu đề:** Một nền tảng cho cả vòng đời thuê phòng
- **Nội dung:** dải thời gian ngang: Tìm phòng → Xem phòng → Đặt cọc → Hợp đồng → **Bàn giao (Avalanche)** → Đang ở → Trả phòng → **Đối soát cọc (Avalanche)**. Hai mốc Avalanche tô xanh rêu.
- **Câu chốt dưới:** "Web2 lo nghiệp vụ, Avalanche chỉ ghi hai lúc cần cả hai bên đồng ý."
- **Hình:** không cần ảnh, dùng dải icon.

### 4. Năm vai trò, nhiều chi nhánh
- **Tiêu đề:** Ai dùng HomeStayDorm
- **Nội dung:** 5 thẻ: Khách thuê, Sale, Quản lý chi nhánh, Kế toán, Admin. Mỗi thẻ: icon + 2 việc chính (ví dụ Sale: xếp lịch xem, lập hợp đồng).
- **Hình:** dưới mỗi thẻ một ảnh chụp nhỏ màn hình làm việc của vai trò đó.

### 5. Luồng nghiệp vụ đầu cuối
- **Tiêu đề:** Luồng thuê phòng đầy đủ
- **Nội dung:** sơ đồ luồng (lấy từ README mục 2): Đăng ký → Xem phòng → Giữ chỗ → Cọc → Khai người ở → Hợp đồng + kỳ đầu → **Mốc 1** → Hóa đơn tháng → Trả phòng → Đối soát v1 → (phản đối) → v2 → **Mốc 2** → Hoàn/thu tiền. Ghi chú nhỏ ai làm bước nào.
- **Hình:** vẽ lại sơ đồ bằng khối trong Canva, mốc Avalanche tô xanh rêu.

### 6. Tính năng nổi bật trên Web2
- **Tiêu đề:** Tiện cho người thuê, gọn cho chủ nhà
- **Nội dung:** lưới 2×3 ảnh chụp, mỗi ảnh một nhãn ngắn:
  1. Lọc phòng, giới tính phù hợp, dịch vụ đi kèm
  2. Chia sẻ link phòng lên Facebook/Zalo (có ảnh, giá)
  3. Đăng ký thuê theo nhóm, tự kiểm tra giường trống
  4. Lịch xem: xác nhận, đổi, hủy; email nhắc
  5. Thanh toán QR chuyển khoản và MoMo Sandbox
  6. Hóa đơn tháng, báo hỏng có ảnh, phí sửa vào kỳ sau
- **Hình:** 6 ảnh chụp màn hình tương ứng.

### 7. Mốc 1: Khách xác nhận biên bản bàn giao
- **Tiêu đề:** Mốc 1 trên Avalanche: bàn giao phòng
- **Nội dung:** 4 bước đánh số: Quản lý phát hành biên bản → Khách yêu cầu sửa (bản cũ được giữ) → Khách xác nhận bằng mã email → Giao dịch `confirm` thành công trên Fuji.
- **Hình:** trái: ảnh màn khách "Bạn đã xác nhận biên bản lúc …"; phải: ảnh Snowtrace giao dịch "Success" có khoanh đỏ tên hàm.

### 8. Mốc 2: Đối soát cọc có tranh chấp
- **Tiêu đề:** Mốc 2 trên Avalanche: đối soát cọc
- **Nội dung:** dòng thời gian phiên bản: v1 trừ 400.000đ nệm rách → khách **phản đối** (lý do lưu dạng mã băm) → v2 bỏ khoản nệm → khách **đồng ý**. Ghi chú: contract tự tính số hoàn hoặc thu thêm; cả hai phiên bản còn trên chuỗi.
- **Hình:** ảnh lịch sử đối soát trong giao diện kế toán (v1 "Khách phản đối", v2 "Đã đồng ý").

### 9. Khách không cần biết blockchain
- **Tiêu đề:** Web3 ẩn sau trải nghiệm quen thuộc
- **Nội dung:** sơ đồ tuần tự 4 bước: Khách nhập mã email → Ví nhúng Privy tạo chữ ký EIP-712 → Relayer trả gas, gửi giao dịch → Contract kiểm tra đúng chữ ký ví khách. Ba nhãn: "Không cài ví", "Không cần AVAX", "Không giả được chữ ký".
- **Hình:** ảnh khung nhập mã 6 số trong trang Hợp đồng.

### 10. Kiểm chứng độc lập và khôi phục từ chuỗi
- **Tiêu đề:** Kiểm chứng được, không cần tin bên cho thuê
- **Nội dung:** hai cột:
  - Trang `/kiem-chung-avalanche`: chọn file bản lưu → "Khớp"; sửa một con số → "File đã bị sửa".
  - Lệnh `npm run avalanche:recover`: dựng lại hồ sơ từ sự kiện trên chuỗi khi mất hoặc bị sửa database.
- **Hình:** 2 ảnh chụp trang kiểm chứng (khớp / bị sửa) + 1 ảnh terminal.

### 11. DormPoints: điểm thưởng trên Avalanche
- **Tiêu đề:** Giữ chân khách bằng điểm thưởng on-chain
- **Nội dung:** Trả hóa đơn tháng đúng hạn → +100 điểm DormPoints → khách ký đổi 100 điểm lấy ưu đãi 20.000đ → hóa đơn kỳ sau tự trừ. Mỗi lần cộng/đổi có giao dịch trên Fuji.
- **Hình:** ảnh ô Điểm thưởng trong Thông tin cá nhân + ảnh dòng giảm giá trên hóa đơn.

### 12. Kiến trúc hệ thống
- **Tiêu đề:** Kiến trúc
- **Nội dung:** sơ đồ khối: React (giao diện) → Express API → SQL Server; Express ↔ Relayer ↔ Avalanche C-Chain (DormSettlement, DormPoints); khách ↔ Privy (ví nhúng); Express ↔ MoMo Sandbox; Express → Email. Ghi công nghệ dưới mỗi khối.
- **Hình:** sơ đồ vẽ trong Canva, khối Avalanche tô xanh rêu, logo Avalanche nhỏ.

### 13. Thiết kế smart contract
- **Tiêu đề:** Smart contract
- **Nội dung:**
  - DormSettlement: `proposeHandover`, `proposeSettlement`, `confirm` (xác nhận / đồng ý / phản đối). Trạng thái: HandoverProposed → Active → SettlementProposed → (Disputed) → Accepted.
  - Chữ ký EIP-712 ràng buộc loại hành động, mã hồ sơ, phiên bản, nonce, hạn dùng, chain ID, địa chỉ contract → không dùng lại chữ ký cũ, không ký nhầm bản.
  - DormPoints: tích điểm, đổi ưu đãi bằng chữ ký khách.
  - Solidity 0.8, OpenZeppelin, viem.
- **Hình:** sơ đồ máy trạng thái 5 ô.

### 14. Riêng tư và chi phí
- **Tiêu đề:** Lên chuỗi tối thiểu, đo chi phí thật
- **Nội dung:** bảng 2 cột "Lên chuỗi" (mã hồ sơ dạng băm, địa chỉ ví, mã băm biên bản, phiên bản, số tiền hoàn/thu) và "Không lên chuỗi" (tên, CCCD, SĐT, ảnh, hợp đồng). Ô số liệu: "≈ 430.000 gas cho trọn vòng một hợp đồng (đo trên Fuji)".
- **Hình:** không cần ảnh; bảng và ô số liệu nền xanh nhạt.

### 15. Bằng chứng kỹ thuật
- **Tiêu đề:** Đã chạy, đã kiểm thử
- **Nội dung:** 4 ô số liệu:
  - 2 contract trên Fuji (DormSettlement verify Sourcify)
  - 156 test backend qua
  - 26 test blockchain qua
  - 39 kịch bản kiểm thử giao diện (Playwright, 1440px và 390px)
  - Kèm địa chỉ contract và link GitHub.
- **Hình:** ảnh Sourcify "exact match" và ảnh Snowtrace trang contract.

### 16. Giới hạn và hướng phát triển
- **Tiêu đề:** Giới hạn đã biết và bước tiếp theo
- **Nội dung:** trái "Giới hạn": chạy trên Fuji; hợp đồng giấy vẫn là chính; chuỗi không phán vết rách thật/giả; khóa vận hành chưa multisig; contract chưa kiểm toán. Phải "Tiếp theo": C-Chain mainnet, multisig, kiểm toán, ứng dụng di động, mở rộng điểm thưởng.
- **Hình:** không cần ảnh.

### 17. Cảm ơn
- **Tiêu đề:** Cảm ơn ban giám khảo
- **Nội dung:** mã QR tới GitHub và video demo, địa chỉ 2 contract, tên đội.
- **Hình:** mockup điện thoại hiển thị trang chi tiết phòng, nền khối xanh rêu.

## Ảnh cần chụp trước khi làm slide

| # | Ảnh | Dùng ở slide |
|---|---|---|
| 1 | Trang chủ (1440px) | 1 |
| 2 | Nhóm Facebook tìm trọ (làm mờ), Excel giả, nệm rách | 2 |
| 3 | Màn làm việc của 5 vai trò | 4 |
| 4 | Lọc phòng, chia sẻ link, thuê nhóm, lịch xem, QR MoMo, hóa đơn/báo hỏng | 6 |
| 5 | Khách "Bạn đã xác nhận biên bản lúc …", khung nhập mã 6 số | 7, 9 |
| 6 | Snowtrace giao dịch `confirm` Success | 7 |
| 7 | Lịch sử đối soát v1/v2 | 8 |
| 8 | Trang kiểm chứng: "Khớp" và "File đã bị sửa"; terminal lệnh khôi phục | 10 |
| 9 | Ô Điểm thưởng, dòng giảm giá trên hóa đơn | 11 |
| 10 | Sourcify exact match, Snowtrace trang contract | 15 |
| 11 | Chi tiết phòng trên điện thoại (390px) | 17 |

Chụp ảnh luôn lúc quay video để dùng chung.
