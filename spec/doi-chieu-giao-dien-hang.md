# Đối chiếu giao diện HomeStayDorm với repo của Hằng

Ngày lập: 12/11/2026 (J-C071). Người lập: Claude, theo yêu cầu của Vy.

**Nguồn đối chiếu:**
- Bên Hằng: `D:\Nam4\Contest\Homestay-Dorm`, commit `6e3fa9b`. Menu lấy từ `apps/frontend/src/App.tsx`, trang lấy từ `apps/frontend/src/features/*`.
- Bên mình: `origin/main` `ab5bcae`. Menu lấy từ `web/frontend/src/pages/*/…Page.jsx` và `App.jsx`.

**Nguyên tắc Vy đặt ra:** tên tab, cách chia tab và bố cục làm theo bên Hằng. Chức năng và luồng nghiệp vụ được phép khác, ví dụ phần xác nhận điện tử Avalanche, D-026, D-030 hay D-041 vẫn giữ như bên mình. Bên mình tự viết lại, không chép code của Hằng.

**Trạng thái:** mọi mục "Đề xuất" bên dưới là đề xuất của Claude. Mục nào Vy chốt mới ghi thành D-xxx.

**Ký hiệu cột Đánh giá:**
- ✅ đã giống
- 🔁 có màn tương đương, nên đổi tên hoặc bố cục theo Hằng
- ➕ bên Hằng có, bên mình chưa có
- ⭐ chỉ bên mình có, vì là chức năng riêng; giữ lại

---

## 1. Sale

| Bên Hằng | Bên mình | Đánh giá |
|---|---|---|
| Tổng quan | Tổng quan | ✅ |
| Lịch hẹn xem phòng | Lịch hẹn xem phòng | ✅ (bên mình có thêm 2 nút "Đã xem" và "Khách không đến", D-026) |
| Lập hợp đồng thuê | Lập hợp đồng thuê | ✅ |
| Tra cứu khách hàng | Tra cứu khách hàng | ✅ |
| Hồ sơ cá nhân | Hồ sơ cá nhân | ✅ |

Sale đã khớp với bên Hằng (làm ở J-X066), không cần đổi.

## 2. Quản lý

| Bên Hằng | Bên mình | Đánh giá | Đề xuất |
|---|---|---|---|
| Tổng quan | (không có) | ➕ | Thêm. Chỉ đếm những gì đã có dữ liệu thật, không bịa số mới (D-033) |
| Sơ đồ phòng | (không có) | ➕ | Thêm màn xem phòng/giường theo tầng và trạng thái. Dữ liệu `Phong`/`Giuong` đã có |
| Kiểm duyệt đặt cọc | Duyệt nhận cọc | 🔁 | Đổi tên thành "Kiểm duyệt đặt cọc" |
| Kiểm tra lưu trú | Duyệt cư trú | 🔁 | Đổi tên thành "Kiểm tra lưu trú" |
| Quản lý hợp đồng | Xử lý trả phòng (gồm Kiểm tra trả phòng, Xử lý phản hồi, Kết thúc hợp đồng) | 🔁 | Đổi tên mục chính thành "Quản lý hợp đồng", giữ 3 tab con của luồng C2/C4 |
| Bàn giao tài sản | Bàn giao phòng | 🔁 | Đổi tên thành "Bàn giao tài sản" |
| Điều phối tài sản | (không có) | ➕ | Chưa cần cho demo; để sau Fuji nếu còn thời gian |
| Tra cứu khách hàng | (không có) | ➕ | Dùng lại màn tra cứu của Sale, ở chế độ chỉ đọc |
| Hồ sơ cá nhân | (không có) | ➕ | Dùng lại `SaleProfile` |
| (không có) | Khách xác nhận biên bản | ⭐ | Giữ (Avalanche, D-028) |

## 3. Kế toán

| Bên Hằng | Bên mình | Đánh giá | Đề xuất |
|---|---|---|---|
| Tổng quan | (không có) | ➕ | Thêm, theo cùng quy tắc D-033 |
| Hóa đơn Đặt cọc | Xác nhận tiền về | 🔁 | Đổi tên thành "Hóa đơn đặt cọc", nếu màn này đúng là xác nhận tiền cọc. Cần rà lại phạm vi trước khi đổi |
| Hóa đơn Nhận phòng | Thu nhận phòng | 🔁 | Đổi tên thành "Hóa đơn nhận phòng" |
| Hóa đơn Định kỳ | (không có) | ➕ | Hóa đơn tháng đang nằm ngoài phạm vi hackathon. **Vy quyết** có thêm hay không |
| Đối soát Hoàn cọc | Quyết toán trả phòng | 🔁 | Đổi tên thành "Đối soát hoàn cọc" |
| Chi tiền Thanh lý | (gộp trong Quyết toán trả phòng) | 🔁 | Tách phần chi/thu đã chốt thành tab "Chi tiền thanh lý" như Hằng. Màn hiện tại đã có sẵn bảng "thu thêm/hoàn cọc", nên chủ yếu là chuyển chỗ |
| Tra cứu khách hàng | (không có) | ➕ | Như mục Quản lý |
| Hồ sơ cá nhân | (không có) | ➕ | Như mục Quản lý |
| (không có) | Tiền mặt chờ nộp quỹ | ⭐ | Giữ (D-023) |
| (không có) | Khách xác nhận đối soát | ⭐ | Giữ (Avalanche) |

## 4. Khách hàng

Bên Hằng có **3 menu khác nhau tùy tình trạng khách**. Bên mình chỉ có 1 menu cố định 6 tab: Khám phá phòng, Hồ sơ đăng ký, Lịch xem phòng, Đặt cọc, Hợp đồng, Trả phòng.

| Tình trạng khách (bên Hằng) | Menu bên Hằng |
|---|---|
| Khách mới, chưa thuê | Hồ sơ cá nhân · Tra cứu & Thuê phòng · Dịch vụ & Bảng giá · Lịch xem phòng của tôi · Hóa đơn & Thanh toán · Lịch sử đặt cọc |
| Đã từng thuê, hoặc đang chờ thanh toán | Hồ sơ cá nhân · Tra cứu & Thuê phòng · Lịch xem phòng của tôi · Hóa đơn & Thanh toán · Hợp đồng của tôi · Lịch sử đặt cọc |
| Đang thuê | Hồ sơ cá nhân · Tìm phòng khác · Dịch vụ của tôi · Hóa đơn & Thanh toán · Hợp đồng của tôi · Đăng ký trả phòng (chỉ hiện khi được phép trả) |

| Bên Hằng | Bên mình | Đánh giá | Đề xuất |
|---|---|---|---|
| Tra cứu & Thuê phòng / Tìm phòng khác | Khám phá phòng | 🔁 | Đổi tên theo tình trạng khách |
| Lịch xem phòng của tôi | Lịch xem phòng | 🔁 | Đổi tên |
| Lịch sử đặt cọc | Đặt cọc | 🔁 | Đổi tên. Giữ chức năng đặt cọc và giữ chỗ (D-026) bên trong |
| Hợp đồng của tôi | Hợp đồng | 🔁 | Đổi tên. Giữ các thẻ thu thêm và kết thúc hợp đồng |
| Đăng ký trả phòng | Trả phòng | 🔁 | Đổi tên; chỉ hiện khi đang thuê |
| Hồ sơ cá nhân | Hồ sơ đăng ký (một phần) | 🔁 | Tách "Hồ sơ cá nhân" (thông tin tài khoản) khỏi "Hồ sơ đăng ký thuê"; hồ sơ đăng ký đưa vào trong "Tra cứu & Thuê phòng" |
| Hóa đơn & Thanh toán | (không có màn riêng; các thẻ thanh toán nằm rải trong tab Hợp đồng) | ➕ | Gom các khoản cần trả (cọc, kỳ đầu, thu thêm) vào một màn. Bên mình đã có ví mô phỏng |
| Dịch vụ & Bảng giá / Dịch vụ của tôi | (không có) | ➕ | Dữ liệu dịch vụ đã có trong CSDL. Mức ưu tiên thấp |
| **Menu đổi theo tình trạng khách** | Menu cố định | 🔁 | Làm theo Hằng: ẩn hoặc hiện tab theo việc khách mới, đang thuê hay đã từng thuê |

## 5. Admin

| Bên Hằng | Bên mình | Đánh giá |
|---|---|---|
| Tổng quan hệ thống | Tổng quan | ✅ |
| Quản trị Nhân viên | Tài khoản nhân viên | 🔁 đổi tên |
| Quản trị Chi nhánh + Phòng & Giường (2 tab) | Chi nhánh & phòng (1 tab) | 🔁 tách làm 2 tab |
| Danh mục Dịch vụ + Điều kiện lưu trú (2 tab) | Dịch vụ & nội quy (1 tab) | 🔁 tách làm 2 tab |
| Quản trị Khách hàng | (không có) | ➕ |
| Tài sản dùng chung | (không có) | ➕ |
| (không có) | Cấu hình hệ thống, Sao lưu dữ liệu, Nhật ký hệ thống | ⭐ giữ |

Admin không nằm trên đường demo. Đề xuất để sau cùng.

## 6. Trang công khai

| Bên Hằng | Bên mình | Đánh giá |
|---|---|---|
| Trang chủ (Landing) | Trang chủ | ✅ |
| Tra cứu phòng + Chi tiết phòng | Khám phá phòng | 🔁 nên có trang chi tiết phòng riêng giống Hằng |
| Đăng nhập, Đăng ký, Quên mật khẩu, OTP, Đặt lại mật khẩu (trang riêng) | Đăng nhập và OTP qua email (Privy) | Luồng khác (D-011), giữ |
| (không có) | Kiểm chứng Avalanche, Cổng thanh toán mô phỏng | ⭐ giữ |

---

## 7. Đề xuất thứ tự làm

Mốc nội bộ là 20/11, nên ưu tiên những việc rẻ mà giám khảo nhìn thấy ngay.

1. **P1, rẻ, khoảng nửa ngày:** đổi tên tab (các dòng 🔁 chỉ cần đổi tên) cho Quản lý, Kế toán, Khách. Thêm "Tra cứu khách hàng" (chỉ đọc) và "Hồ sơ cá nhân" vào menu Quản lý và Kế toán, dùng lại màn của Sale.
2. **P2, khoảng 1 ngày:** menu khách đổi theo tình trạng (mới, đang thuê, đã từng thuê). Thêm màn "Hóa đơn & Thanh toán" gom các khoản cần trả.
3. **P3, mỗi màn 0,5–1 ngày:** Tổng quan cho Quản lý và Kế toán; Sơ đồ phòng; tách "Chi tiền thanh lý"; trang chi tiết phòng.
4. **Để sau Fuji:** Điều phối tài sản, Dịch vụ, Hóa đơn định kỳ, phần Admin.

**Lưu ý khi làm:**
- Đổi tên tab thì phải sửa cả các bài kiểm tra giao diện đang tìm nút theo chữ, như `test:list-kit`, `ui-settlement-c3.mjs`, `ui-checkout-closure.mjs` và `test:avalanche-ui`.
- Giữ nguyên mã tab trong URL (`?tab=…`) để link cũ và kịch bản A3 không bị gãy.
