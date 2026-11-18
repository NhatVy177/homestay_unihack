# Luồng tổng hợp HomeStayDorm (bản để Vy đọc và kiểm tra)

> **File này chỉ là bản đọc gộp**, không phải nguồn sự thật thứ hai. Nguồn chính vẫn là [decisions.md](decisions.md) (D-xxx), [scope.md](scope.md), [progress.md](progress.md) và [hackathon/plan.md](../hackathon/plan.md). Nếu file này khác các file đó thì các file đó đúng; hãy báo để sửa.
>
> Lập ngày 2026-11-10, rà lại 2026-11-11 (J-C059). Đây là **luồng đích đã chốt**, không phải mô tả code đang chạy: mục nào đã có code xem [progress.md](progress.md). Những chỗ luồng chưa khớp thực tế và đề xuất bổ sung (chưa chốt) nằm ở mục 4 của [audit-2026-11-11.md](audit-2026-11-11.md).

## Mục lục

0. Mục tiêu và nguyên tắc
1. Vai trò và hệ thống
2. Tổng quan một vòng đời thuê phòng
3. Các giai đoạn chi tiết (1 → 9)
4. Phần Web3: hai mốc trên Avalanche
5. Thanh toán (ví mô phỏng, tiền mặt, chuyển khoản)
6. Email và nhắc việc
7. Những việc đã bỏ, cố ý không làm
8. Bảng tất cả quyết định theo giai đoạn
9. Việc còn mở, rủi ro
10. Trạng thái làm việc và lịch

---

## 0. Mục tiêu và nguyên tắc

**Mục tiêu bản thi (UniHack 2026, hạn nộp 21/11):** hệ thống quản lý thuê phòng ký túc/homestay chạy được đầy đủ trên Web2 (React + Express + SQL Server HOMEDORM4), và **hai lần khách tự xác nhận trên Avalanche Fuji**: biên bản bàn giao, kết quả đối soát cọc. Chuỗi không giữ tiền, chỉ giữ bằng chứng khách đã đồng ý đúng bản nào.

**Nguyên tắc thiết kế (D-022):** bỏ ràng buộc "đúng đề đồ án", chọn cách **hợp lý ngoài thực tế, tiện nhất cho khách và bên cho thuê**.

**Nguyên tắc chia việc (D-021):**
- Việc cần nhìn tận nơi hoặc phán đoán → **người** (quản lý duyệt phòng, Sale đối chiếu CCCD, bàn giao, kiểm tra trả phòng, kế toán rà đối soát).
- Việc chỉ là công thức cố định hoặc chuyền tay → **máy** (tính tiền cọc, tự duyệt cư trú bình thường, soạn bản nháp đối soát, tự thanh lý).

**Nguyên tắc với Web3:**
- Ẩn Web3 khỏi khách (D-012, D-017): khách chỉ thấy "Đã xác nhận lúc …, đã lưu, không sửa được", nút tải bản lưu, link "Kiểm tra". Không thấy ví, địa chỉ, mã giao dịch.
- Không bao giờ xác nhận thay khách, không tự chấp nhận thay trên chuỗi, không nhân viên ký hộ (D-009, D-030).
- Chuỗi dừng ở **mốc 2** (D-031).

---

Hồ sơ cá nhân (D-054, trình bày J-X088): chỉnh ảnh bằng nút cây bút ngay trên ảnh; không còn hai nút chữ đổi/xóa hoặc dòng hướng dẫn dung lượng. File vẫn kiểm PNG/JPG/WebP≤2MB và có báo lỗi/kết quả; không đổi xác thực/quyền/đổi mật khẩu.

Trình bày trang chủ/phòng công khai (D-062/J-X092): dùng cùng họ chữ Inter cho tiêu đề, nội dung và nút trong `.tc-page`; ảnh thẻ phòng chỉ giữ trái tim, bỏ nhãn loại phòng xanh. Sức chứa dưới ảnh và các luồng thuê hiện có giữ nguyên.

Bộ chọn ngày giờ/dropdown toàn frontend (D-064/J-X093): popup tiếng Việt, màu sage, giữ control/giá trị/giới hạn/handler. Đăng xuất (D-066/J-X094): hộp dùng chung icon/nội dung căn giữa, nút X và Hủy/Đăng xuất; chỉ xác nhận mới thoát. Thêm ảnh Báo hỏng dùng ô viền nét đứt/icon rõ, giữ tối đa3 ảnh và xử lý hiện có.

## 1. Vai trò và hệ thống

| Vai trò | Làm gì chính |
|---|---|
| **Khách thuê** (cần tài khoản + email, D-016) | Đăng ký hồ sơ, xem phòng, tự gửi "Giữ chỗ", trả cọc, khai người ở, trả kỳ đầu và hóa đơn tháng, xác nhận biên bản bàn giao và đối soát (ký điện tử), xem khoản dự kiến trừ |
| **Sale** | Tiếp nhận hồ sơ, hẹn lịch xem, ghi trạng thái buổi xem, gửi giữ chỗ thay khách, thu tiền mặt cọc, lập hợp đồng, đối chiếu CCCD gốc, tải ảnh hợp đồng đã ký |
| **Quản lý chi nhánh** | Duyệt giữ chỗ (kiểm tra phòng thật), duyệt cư trú bất thường, lập biên bản bàn giao, kiểm tra trả phòng, bấm "Đã thu chìa khóa", theo dõi danh sách "Chờ khách xác nhận" |
| **Kế toán** | Xác nhận chuyển khoản tay, ghi nhận tiền mặt nộp quỹ, nhập chỉ số điện nước, rà bản nháp đối soát, chi hoàn cọc kèm chứng từ |
| **Admin** | Quản lý nhân viên, cấu hình hệ thống |
| **NVAUTO ("Hệ thống tự động")** | Tài khoản hệ thống, không đăng nhập được, đứng tên các bước máy tự làm (chốt phiếu cọc, duyệt cư trú bình thường, hết hạn tự động) |

**Hệ thống:** frontend React/Vite; backend Express + SQL Server (nhiều logic nằm trong stored procedure); relayer backend trả gas; ví nhúng Privy (khách nhập OTP email); contract `DormSettlement.sol` (EIP-712) trên Fuji; Verify độc lập; gói bằng chứng; email có chống trùng (`MAIL_REDIRECT_TO` để thử).

---

## 2. Tổng quan một vòng đời thuê phòng

```
 1 Xem phòng ──► 2 Giữ chỗ ──► 3 Cọc ──► 4 Khai người ở ──► 5 Hợp đồng + kỳ đầu
   (D-026)        (D-026,23)   (D-023)     + duyệt cư trú      (D-027)
                                           (D-024,26)
                                                                    │
 9 Đóng hồ sơ ◄── 8 Trả phòng ◄── 7 Đang ở ◄── 6 Bàn giao ◄────────┘
   (D-030,31)      (D-030)        (D-029)       (D-028)
                                                  ▲ MỐC CHUỖI 1: khách ký biên bản
                                       MỐC CHUỖI 2: khách ký đối soát ▲ (giai đoạn 8)
```

Trạng thái hồ sơ (`PhieuDangKy`): Chờ tiếp nhận → **Đã tiếp nhận** (hiển thị "Đã xem" sau buổi xem) → **Chờ xác nhận cọc** (đang chờ quản lý) → **Xác nhận cọc** → … → **Từ chối** (chỉ khi khách bấm "Không thuê nữa", hoặc hết lịch xem do hủy).

---

## 3. Các giai đoạn chi tiết

### 3.1 Giai đoạn 1: Đăng ký và xem phòng (D-026, D-042)

J-X090: tab Khám phá phòng của khách mở danh sách public kèm dấu nguồn/tab khách đang xem; danh sách có nút Quay lại về đúng tab đó. Nguồn được giữ qua reload/xóa tìm kiếm và xem chi tiết rồi trở lại danh sách; mở trực tiếp/trang chủ thì không hiện nút trở về cổng.


D-055: nhà 3D ở giới thiệu trang chủ dùng số tầng/phòng của từng chi nhánh từ danh sách public; số phòng hiển thị P4xx là tầng4, không dùng mã nội bộ khác tên để đoán sai tầng. Các phòng chưa rõ tầng được liệt kê riêng; bố trí/nội thất vẫn minh họa. Bộ chọn tầng mở đầy đủ phòng, click tiếp tục dùng GET/route chi tiết và quy tắc D-042/D-052 hiện có.


Trang chủ công khai theo D-049 → D-051 (bố cục/hiệu ứng, gallery phải → trái, liên hệ 0795749721). Trước đăng nhập, khách bấm Xem phòng để đọc cùng chi tiết thư viện ảnh/tiện nghi/giá dịch vụ với portal tại `/phong/<mã phòng>` (D-052/F-16, cập nhật route J-C174); GET public chỉ trả dữ liệu giới thiệu. Đăng ký giữ phòng qua đăng nhập và mở form cũ, không tự gửi hồ sơ. Quy tắc D-042 về hết chỗ/chờ cọc và khóa đăng ký vẫn áp dụng sau gộp J-X083.


1. Khách tạo tài khoản (email bắt buộc, đúng định dạng, không trùng — D-016), gửi hồ sơ đăng ký: số người, giới tính, giá tối đa, khu vực, ngày vào ở, thời hạn thuê.
2. Sale mở "Lập lịch hẹn", thấy các phiếu đang chờ xếp lịch và **hẹn một buổi xem** (không còn bước tiếp nhận riêng, D-044: lập lịch cho phiếu mới là tiếp nhận phiếu; Sale vẫn từ chối được phiếu kèm lý do). Mỗi hồ sơ **chỉ một buổi xem**, gồm **một hoặc nhiều phòng cùng chi nhánh**. Dời giờ vẫn là buổi đó.
3. *(D-045)* Khách bấm **Xác nhận lịch** đúng phiên bản ngày/giờ. Khi Sale đổi ngày/giờ, khách xác nhận lại; không tự xác nhận thay khách. **Chưa xác nhận thì Sale không được ghi Đã xem/Khách không đến**, kể cả đã tới giờ. Sau khi khách xác nhận và đã đến giờ, Sale ghi kết quả theo D-026/C5-a; hệ thống không tự đánh dấu theo giờ.
4. Sale **chỉ ghi trạng thái của buổi**. Không ghi kết quả từng phòng, không bắt khách chọn phòng ngay, không có hạn chờ, không tự đóng hồ sơ. Khách có thể về nghĩ 2 ngày rồi quay lại.
5. Khách (hoặc Sale) có nút **"Không thuê nữa"** — là cách duy nhất đóng hồ sơ sau buổi xem. Nút này không bắt buộc bấm.
6. *(Mục 11, D-031, giao diện đợt 2)* Thẻ lịch xem của khách có thanh tiến trình: Đã lên lịch → Đã xác nhận → Đã xem → Giữ chỗ.
7. *(D-042, có code + test local, J-C075)* Khách chọn phòng quan tâm khi gửi hồ sơ: phòng còn trống hoặc đang chờ cọc thì chọn được, phòng hết hẳn thì không. Sale chỉ tiếp nhận hồ sơ khách gửi rồi lập lịch xem luôn; Sale không tạo hồ sơ thay khách (bỏ form khách vãng lai). "Phòng quan tâm" chỉ là gợi ý, không giữ chỗ. *(D-043)* Khách quan tâm nhiều phòng trong **một hồ sơ**: phòng đầu qua form, các phòng sau bấm "Thêm vào hồ sơ" (khi chưa lập lịch; tối đa 5, cùng chi nhánh); Sale lập lịch thấy các phòng đó chọn sẵn.

### 3.2 Giai đoạn 2: Giữ chỗ (D-026, D-023, D-031)

1. Khi buổi đã "Đã xem", **khách tự gửi yêu cầu "Giữ chỗ"** trên web: chọn **phòng trong buổi xem**, **nguyên phòng hoặc ghép giường**, và giường. **Sale cũng gửi thay được** khi khách gọi điện hoặc đến quầy.
2. *(D-047: giới tính còn được chặn từ lúc đăng ký/quan tâm và khi khai cư trú.)* **Hệ thống kiểm tra ngay:** giường còn trống, giới tính khớp phòng, số người không vượt sức chứa, số giường chọn bằng số người, không có yêu cầu khác đang chờ trùng giường.
3. Khách thấy lời nhắn: **"Phòng chưa được giữ cho đến khi quản lý chi nhánh xác nhận (tối đa 12 giờ)."**
4. **Quản lý duyệt** (vì phải kiểm tra tình trạng phòng thật):
   - Màn duyệt hiện sẵn kết luận "đủ/không đủ điều kiện" do hệ thống tính; không đủ thì khóa nút duyệt.
   - Hàng đợi cũ trước. Duyệt yêu cầu đến sau phải ghi lý do vượt lượt.
   - Duyệt xong: hệ thống **tự tạo phiếu cọc, giữ giường, tính tiền, chốt phiếu** (đứng tên NVAUTO), hạn thanh toán 24 giờ. Kế toán **không** lập phiếu cọc.
   - Các yêu cầu khác trùng giường tự bị từ chối, email "phòng đã được đặt cọc cho khách khác".
5. **Từ chối** (có lý do), **quá 12 giờ không xử lý**, hoặc **phiếu hết hạn** → hồ sơ **về "Đã xem"** để khách chọn lại phòng đó hoặc phòng khác. Hồ sơ **không** tự đóng.
6. **Mục 7 (D-031):** phiếu cọc và email cọc hiện **chính sách hoàn cọc** (80/50/70/100%) **kèm mã phiên bản** chính sách. Khách thấy chính sách trước khi nó bị khóa lên chuỗi lúc bàn giao.

### 3.3 Giai đoạn 3: Thanh toán cọc (D-023, F-11, F-13)

| Cách trả | Quy trình |
|---|---|
| **Ví mô phỏng** (khách tự trả) | Khách bấm "Thanh toán ngay" (link trong email, qua đăng nhập, vào thẳng phiếu) → trang cổng ghi rõ "mô phỏng" → IPN ký HMAC → kiểm tra chữ ký, số tiền, chống ghi hai lần → phiếu tự "Đã thanh toán" |
| **Tiền mặt** | Sale in "Giấy biên nhận đặt cọc", hai bên ký, mỗi bên giữ 1 bản, Sale chụp bản công ty giữ rồi tải lên, bấm "Xác nhận đã thu tiền mặt" → "Đã thanh toán" ngay + email. **Kế toán đối soát và bấm "Đã nộp quỹ"** |
| **Chuyển khoản tay** | Khách chuyển khoản theo nội dung chuẩn `DCxxxx SĐT` (có nút sao chép), tải minh chứng → **kế toán xác nhận** (tab "Duyệt thanh toán") |

Có đồng hồ đếm ngược hạn 24 giờ, email nhắc trước 3 giờ, email thành công, email quá hạn. Hết hạn thì phiếu tự hủy và nhả giường.

Email cọc thành công kèm **lịch nhận phòng + danh sách cần mang (CCCD gốc của mọi thành viên)**.

### 3.4 Giai đoạn 4: Khai người ở và duyệt cư trú (D-024, D-026)

1. *(Triển khai J-C103: tab khách "Thông tin cư trú"; Sale vẫn khai hộ được ở "Lập hợp đồng thuê".)* Sau khi cọc xong, **khách tự khai người ở** (họ tên, ngày sinh, giới tính, CCCD, quốc tịch…). **Sale không còn đối chiếu CCCD trước khi gửi.**
2. **Hệ thống kiểm tra tự động:** đủ thông tin, giới tính khớp phòng, số người không vượt số giường đã cọc, CCCD không trùng trong hồ sơ và không trùng người đang ở hợp đồng hiệu lực khác, quốc tịch Việt Nam, đủ 18 tuổi.
3. **Đạt hết** → tự "Đã duyệt cư trú" (đứng tên NVAUTO). **Có bất thường** → chờ quản lý duyệt tay, quản lý thấy lý do và nhận email.
4. **Thành viên bị từ chối** (D-024, D-026):
   - Giường của người đó **nhả ngay**.
   - **Hoàn 80%** phần cọc của giường đó, **trừ vào kỳ đầu** của người còn lại; phần dư, hoặc cả nhóm bị loại thì **kế toán chi**.
   - Email cho khách và Sale, nêu lựa chọn ký với người còn lại hoặc dừng.
5. **Người đại diện bị loại:** gửi **email mời** người khác tạo tài khoản để làm đại diện. Làm **sau cùng**; tạm thời Sale lập hồ sơ mới.
6. **CCCD gốc** được đối chiếu **một lần duy nhất, lúc ký hợp đồng giấy** (giai đoạn 5), bằng ô tích bắt buộc.
7. *(D-038)* Khi khai người ở, người đại diện **bắt buộc tích ô xác nhận** các thành viên đồng ý cung cấp thông tin để làm thủ tục thuê và đăng ký tạm trú. CCCD không vào gói bằng chứng, không lên chuỗi.
8. *(D-046)* Thành viên cùng ở **không bắt buộc có tài khoản**. Ô email của thành viên là tùy chọn; sau khi quản lý duyệt cư trú, thành viên được duyệt có email mà chưa có tài khoản nhận thư mời tạo tài khoản (một lần, không bắt buộc). Người đại diện vẫn là người duy nhất chịu trách nhiệm cọc và ký xác nhận.

### 3.5 Giai đoạn 5: Hợp đồng và kỳ đầu, "một lần đến" (D-027, D-024, D-018)

1. Cư trú đã duyệt → **Sale lập hợp đồng ở trạng thái "Chờ ký"**. Khách nhận **email có link xem trước** hợp đồng và **số tiền kỳ đầu** (tháng thuê đầu + phí ban đầu, trừ phần hoàn cọc giường thừa).
2. Khách **trả kỳ đầu trước ngày đến** qua ví mô phỏng. **Vẫn cho trả tại quầy.** Nhắc khi còn ≤ 1 ngày tới lịch nhận phòng. Trả xong → khách "sẵn sàng bàn giao", quản lý "hợp đồng sẵn sàng bàn giao".
3. **Ngày nhận phòng là một lần đến:**
   - Sale **xem CCCD gốc** của mọi thành viên, tích **"Đã đối chiếu CCCD gốc"** (bắt buộc).
   - Hai bên **ký hợp đồng giấy** → hợp đồng "Đã ký".
   - Quản lý **bàn giao phòng ngay trong buổi đó** (giai đoạn 6).
   - **CCCD không khớp** → chưa ký, hồ sơ quay về khai lại; tiền kỳ đầu đã trả giữ cho lần sau, hoặc hoàn nếu khách dừng thuê.
4. **Sale chụp/scan hợp đồng đã ký và tải lên.** Mã băm file + **điều khoản chính** (mã hợp đồng, giá thuê, kỳ hạn, tiền cọc, phiên bản chính sách) đi vào **gói bằng chứng bàn giao**. **Không sửa contract.**
5. Hợp đồng **vẫn ký giấy, không ký trên chuỗi.**
6. *(D-038)* Mẫu hợp đồng giấy có điều khoản: hai bên đồng ý dùng **xác nhận điện tử** trên hệ thống cho biên bản bàn giao và đối soát; quá 7 ngày không phản hồi thì bên cho thuê được xử lý theo hợp đồng.
7. *(D-034, đã có code)* Để phát hành biên bản bàn giao, hệ thống đòi đủ hai thứ: khách đã thấy bản chính sách hoàn cọc lưu theo phiếu cọc (phiếu cũ phải bấm xác nhận bổ sung) và Sale đã tải ảnh hợp đồng đã ký. Thiếu thì biên bản Web2 vẫn lập được nhưng chưa gửi được cho khách xác nhận; màn quản lý hiện lý do.

**C1 / D-034:** điều khoản/gói bàn giao lấy tiền cọc từ `PhieuDatCoc.SoTienCoc`, chưa trừ hoàn một phần. Hồ sơ cũ phải bổ sung ảnh hợp đồng đã ký và khách xác nhận chính sách trước khi phát hành v2; không bịa lại lịch sử chính sách lúc cọc. Bằng chứng v1 đã phát hành vẫn đọc/kiểm chứng được, không sửa bản đã khóa.

### 3.6 Giai đoạn 6: Bàn giao phòng và xác nhận điện tử (D-009, D-010, D-028)

1. Bàn giao diễn ra **trong buổi ký hợp đồng**. Quản lý lập **biên bản tài sản trên web** (không có ô ký giấy). **Có thể chụp ảnh tình trạng** (vài tấm cho cả phòng hoặc món có vết sẵn, không bắt buộc từng món). Ảnh không lên chuỗi; **mã băm ảnh đi vào gói biên bản** để trả phòng so trước/sau.
2. Hệ thống **tự phát hành bản xem** cho khách (tab Hợp đồng + email).
3. Khách **xác nhận ngay hoặc về nhà xác nhận.** Nếu chưa ổn, khách **yêu cầu chỉnh sửa** (kèm lý do) → quản lý phát hành bản mới, **giữ lịch sử** (vòng này chạy ở Web2, D-010).
4. Khi khách bấm xác nhận: trình duyệt đối chiếu nội dung đang xem với snapshot → backend ghi đúng bản đó lên chuỗi → khách ký → **bản bị khóa**. **← MỐC CHUỖI 1.**
5. **Không ép xác nhận tại chỗ.** Giao chìa khóa là trạng thái Web2 riêng, **không chờ chữ ký**. Chưa xác nhận → **email nhắc sau 24 giờ và 72 giờ**. **Không tự xác nhận thay khách.** Quản lý thấy danh sách **"Chờ khách xác nhận"**.
6. **OTP (D-015, giữ nguyên):** Privy cần gói trả phí mới bỏ được OTP. Để giảm vướng: thẻ **"Kích hoạt xác nhận điện tử"** hiện ngay sau khi khách trả cọc, để lúc bàn giao thường chỉ còn bấm Xác nhận; nút **"Gửi lại mã"** có đếm ngược, nhắc kiểm tra thư rác. Thời hạn phiên Privy sẽ thử thật ở đợt Fuji. Vẫn hỏi BTC (Q-10); có gói thì bật lại D-011 (bỏ OTP). Không dùng ví do máy chủ giữ hộ.

### 3.7 Giai đoạn 7: Đang ở (D-029)

1. **Hóa đơn tháng:** kế toán nhập chỉ số điện nước → hệ thống tính và email khách → khách **trả qua ví mô phỏng**, trả xong **tự "Đã thanh toán"**, kế toán không phải xác nhận. Tiền mặt/chuyển khoản tay kế toán vẫn ghi nhận như cũ. Quá hạn dùng bộ hẹn giờ có sẵn.
2. **Trang khách "Khoản dự kiến trừ khi trả phòng":** cộng dồn hóa đơn còn nợ, **hư hỏng do khách gây ra** (quản lý ghi kèm ảnh, từ sự cố/bảo trì), **tiền phạt** từ biên bản vi phạm. Để lúc trả phòng không có bất ngờ.
3. Mỗi khoản phát sinh hoặc vi phạm mới: **email cho khách + khách phản hồi ngay trên web.** Không lên chuỗi riêng; chúng lên chuỗi **gián tiếp** qua mã băm bảng đối soát ở mốc 2.

### 3.8 Giai đoạn 8: Trả phòng và đối soát (D-030)

1. Khách gửi yêu cầu trả phòng. Tỷ lệ hoàn cọc theo bảng chính sách trong hệ thống: 80% (đã cọc, chưa ký hợp đồng), 50% (ở dưới 6 tháng), 70% (ở từ 6 tháng, chưa hết hạn), 100% (hết hạn hợp đồng). Hệ thống hiện **không có** quy định số ngày báo trước.
2. **Màn kiểm tra trả phòng** của quản lý hiện **cạnh nhau**: tình trạng lúc bàn giao vào (biên bản đã ký + ảnh) và tình trạng hiện tại. Quản lý đánh dấu món khác đi, ghi bồi thường, chụp ảnh.
3. Hệ thống **tự soạn bản nháp đối soát** từ: tỷ lệ hoàn theo **chính sách đã khóa ở mốc 1** + danh sách "Khoản dự kiến trừ" (3.7) + kết quả kiểm tra. **Kế toán rà, chỉnh, gửi.**
4. Bản đối soát gửi khách để **đồng ý** (chọn cách nhận tiền hoàn) hoặc **phản đối** → kế toán/quản lý xem xét → **bản mới giữ bản cũ** (như F-04). Khi khách đồng ý, ghi lên chuỗi: **← MỐC CHUỖI 2** (`Accepted`).
5. **Thu thêm** (khách nợ): trả **qua ví mô phỏng** (hoặc tiền mặt/chuyển khoản kế toán ghi nhận), **trả trước khi thanh lý**.
6. **Phiếu thu nợ và phiếu hoàn cọc PHẢI khác loại** (bài học từ code nhóm Hằng: dùng chung một loại làm trang khách hiện nợ thành tiền được hoàn).
7. **Khách không phản hồi:** email nhắc 24 giờ và 72 giờ; **quá 7 ngày → "Quá hạn phản hồi"**, quản lý liên hệ trực tiếp. **Không bao giờ tự chấp nhận thay trên chuỗi.**
8. *(D-038)* **Đường thoát:** nếu khách vẫn im lặng, phản đối kéo dài, hoặc chưa từng xác nhận bàn giao (khi đó chuỗi không cho lập đối soát), quản lý dùng thao tác Web2 **"Thanh lý không có xác nhận của khách"**: bắt buộc ghi lý do và đính kèm bằng chứng đã liên hệ. Chuỗi vẫn ghi đúng là khách chưa đồng ý; gói bằng chứng cuối ghi rõ "đóng không có xác nhận của khách".

### 3.9 Giai đoạn 9: Thanh toán cuối và đóng hồ sơ (D-030, D-031)

**Tự thanh lý khi tiền đã xong, tách rõ 3 trường hợp:**

| Trường hợp | Điều kiện đủ để tự thanh lý |
|---|---|
| Khách **trả thêm** | Khách đồng ý đối soát **và** đã trả xong |
| Khách **được hoàn** | Khách đồng ý đối soát **và** kế toán đã chi, **có chứng từ** |
| **Bằng 0** | Khách đồng ý đối soát (vẫn phải đóng được hồ sơ) |
| **Không có xác nhận** *(D-038, D-041)* | Đủ điều kiện quá hạn/phản đối, lý do và bằng chứng liên hệ; vẫn phải xử lý đủ thu/hoàn và chứng từ. Thiếu thì khóa nút và báo khoản thiếu |

Đủ điều kiện → **hệ thống tự thanh lý hợp đồng và đóng hồ sơ**. **Bỏ** bước thanh lý tay và biên bản trả phòng giấy (chữ ký điện tử ở mốc 2 thay thế).

**D-041 (thay điều kiện cũ của D-030):** quản lý bấm **"Đã thu chìa khóa"** để phòng/giường về trống; thao tác này không phụ thuộc hợp đồng đã đóng. Không tự nhả phòng/giường chỉ vì hợp đồng thanh lý hoặc tiền đã xong.

**Gói bằng chứng cuối (D-031):** khi tự thanh lý, hệ thống thêm **chứng từ chi/thu** (mã băm chứng từ, số tiền, thời điểm) vào gói bằng chứng trên **Web2** và **email cho khách**. Trang Verify hiển thị phần này, **đánh dấu rõ là dữ liệu Web2, không phải trên chuỗi.**

**Không có mốc chuỗi 3.** Lý do: số tiền "đã hoàn" vẫn do kế toán tự khai nên giá trị chứng minh thêm nhỏ; sửa contract sát ngày deploy 14/11 là rủi ro lớn nhất trong lịch. Mốc 3 để **sau bản thi**.

---

## 4. Phần Web3: hai mốc trên Avalanche

Contract `DormSettlement.sol` (EIP-712). Trạng thái: None → HandoverProposed → Active → SettlementProposed → (Disputed) → Accepted.

| Mốc | Khi nào | Ghi gì | Ai ký |
|---|---|---|---|
| **1. Bàn giao** | Giai đoạn 6 | Hash biên bản (gồm điều khoản hợp đồng, ảnh tình trạng, phiên bản chính sách hoàn cọc) | **Khách** (EIP-712), relayer trả gas |
| **2. Đối soát** | Giai đoạn 8 | Hash bảng đối soát (gồm các khoản dự kiến trừ, kết quả kiểm tra) | **Khách** đồng ý hoặc phản đối; bản mới giữ bản cũ |

**Tính chất:**
- **Relayer trả gas** và có quyền gửi, **không ký thay khách**. Chữ ký ràng buộc action, hồ sơ, phiên bản/hash, nonce, deadline, chain/contract.
- Chuỗi **không giữ tiền** (không escrow/NFT/token), **không phân xử** vết rách, **không tự chuyển khoản hoàn**. "Đã thống nhất đối soát" ≠ "đã nhận tiền".
- **Bộ bằng chứng** (nội dung, salt, mã hồ sơ, phiên bản, commitment, chain ID, contract) tải được bất cứ lúc nào; gửi kèm email sau receipt.
- **Verify độc lập:** file + RPC là đủ kiểm tra, chỉ rõ file bị sửa, phiên bản cũ, trạng thái hiện tại.
- Chỉ **thành công sau receipt + event đúng**; gửi lặp không trùng bản ghi; chain thành công mà SQL lỗi thì có cách đọc lại để phục hồi.
- **Ví:** Privy embedded wallet, OTP email trong khung HomeStayDorm (D-015). JWT-based auth cần gói Scale trả phí (Q-10 đang chờ BTC).
- **Khóa vận hành:** khóa của "quản lý", "kế toán" và relayer nằm trên máy chủ, đại diện cho bên cho thuê; không phải ví riêng của từng nhân viên. Contract chỉ nhận một địa chỉ quản lý và một địa chỉ kế toán cho toàn hệ thống.
- **Cách gọi:** dùng "xác nhận điện tử", không gọi là "chữ ký số". Đây là bằng chứng bổ sung theo thỏa thuận hai bên, không thay hợp đồng thuê (vẫn ký giấy).
- **Trạng thái thật (11/11):** mới chạy trên chain local; chưa deploy Fuji.
- **Token point** (D-014): chỉ dự phòng, không làm trước khi luồng chính đạt nghiệm thu.

---

## 5. Thanh toán (tổng hợp)

| Khoản | Ví mô phỏng | Tiền mặt | Chuyển khoản tay | Ai xác nhận |
|---|---|---|---|---|
| Cọc | Có | Sale thu + biên nhận ký 2 bản; kế toán "Đã nộp quỹ" | Có | Ví: tự. Tiền mặt: Sale (kế toán đối soát). CK tay: kế toán |
| Kỳ đầu | Có (trả trước ngày đến) | Có, tại quầy | Có | Ví: tự. Còn lại: kế toán |
| Hóa đơn tháng | Có (D-029) | Có | Có | Ví: tự "Đã thanh toán". Còn lại: kế toán |
| Thu thêm khi trả phòng | Có (D-030) | Có | Có | Ví: tự. Còn lại: kế toán |
| Hoàn cọc | Không | — | Kế toán chi, **kèm chứng từ** | Kế toán |

**Cổng ví mô phỏng:** ghi rõ "mô phỏng", **không** dùng thương hiệu/logo/API MoMo thật, không nhận tiền thật. Người thu = trống, phương thức "Ví điện tử", màn kế toán hiện "Tự động (cổng thanh toán mô phỏng)".

---

## 6. Email và nhắc việc

| Thời điểm | Gửi cho | Nội dung |
|---|---|---|
| Gửi yêu cầu giữ chỗ | Quản lý đúng chi nhánh | Có yêu cầu chờ duyệt; nhắc 1 lần sau 8 giờ |
| Quản lý duyệt | Sale + khách | Thông tin phiếu; khách có nút "Thanh toán ngay"; kèm chính sách hoàn cọc và phiên bản |
| Từ chối / quá 12 giờ / yêu cầu trùng bị loại | Sale + khách | Lý do; hồ sơ về "Đã xem" |
| Còn 3 giờ hết hạn cọc / cọc quá hạn | Khách | Nhắc / báo hủy |
| Cọc thành công | Khách | Lịch nhận phòng + CCCD gốc cần mang |
| Có thành viên bị từ chối | Khách + Sale | Lựa chọn ký với người còn lại hoặc dừng |
| Hợp đồng "Chờ ký" | Khách | Link xem trước + số tiền kỳ đầu + nút "Thanh toán ngay" |
| Còn ≤ 1 ngày tới lịch nhận phòng mà chưa trả kỳ đầu | Khách | Nhắc trả |
| Đã trả kỳ đầu | Khách + quản lý | "Sẵn sàng bàn giao" |
| Biên bản bàn giao phát hành | Khách | Link xác nhận; nhắc 24 giờ, 72 giờ |
| Xác nhận xong | Khách | Bản lưu bằng chứng kèm theo |
| Khoản phát sinh/vi phạm mới | Khách | Khoản gì, bao nhiêu; phản hồi trên web |
| Đối soát gửi khách | Khách | Nhắc 24 giờ, 72 giờ; quá 7 ngày chuyển quản lý |
| Tự thanh lý | Khách | Gói bằng chứng cuối (kèm chứng từ chi/thu) |

Email có chống trùng theo từng lần gửi; lỗi gửi không làm hỏng thao tác chính; `MAIL_REDIRECT_TO` dùng khi thử để không gửi thật.

---

## 7. Những việc đã bỏ, cố ý không làm

- **Ghi kết quả từng phòng** sau buổi xem, **hạn chờ 7 ngày**, tự đóng hồ sơ sau buổi xem (D-026).
- **Kế toán lập phiếu cọc tay** và công tắc tự chốt (D-019/D-021) — bị D-023 thay: quản lý duyệt rồi hệ thống chốt.
- **Sale đối chiếu CCCD trước khi gửi** (chuyển sang buổi ký hợp đồng, D-026).
- **Thanh lý tay** và **biên bản trả phòng giấy** (D-030).
- **Mốc chuỗi 3 / contract `Closed`** (D-031); chuỗi không báo trả/khai báo thanh toán (D-004).
- **Ví do máy chủ giữ hộ**, nhân viên ký hộ khách, email = chữ ký, tự xác nhận khi quá hạn.
- **Escrow, NFT, L1 riêng, AI phân xử**; MoMo thật; QR ngân hàng.
- **Chuyển nền SQL Server sang Supabase.**
- **Tự chấp nhận đối soát thay khách** trên chuỗi.

---

## 8. Bảng tất cả quyết định theo giai đoạn

| Giai đoạn | Quyết định liên quan |
|---|---|
| Nền, mục tiêu | D-001 (bài thi), D-005 (demo: cọc giả 3 triệu, v2 hoàn 2,5 triệu), D-006/D-007/D-008 (repo, spec, module blockchain), D-018 (pitch mở bằng nỗi đau từ đề) |
| Nguyên tắc | D-021 (người/máy), **D-022 (hợp lý ngoài thực tế)** |
| 1 Xem phòng | **D-026** (1), D-031 (thanh tiến trình), D-042 (quan tâm phòng, bỏ phiếu khách vãng lai) |
| 2 Giữ chỗ | **D-026** (2, 3), D-020 (quản lý luôn duyệt), D-023 (duyệt, 12 giờ, tự chốt), D-031 (chính sách trên phiếu) |
| 3 Cọc | D-023 (tiền mặt, CK tay), D-013 (ví mô phỏng) |
| 4 Khai người ở | D-024 (duyệt cư trú theo ngoại lệ), **D-026** (4, 5, 6) |
| 5 Hợp đồng + kỳ đầu | **D-027**, D-018 (kỳ đầu qua ví) |
| 6 Bàn giao | D-009, D-010, D-012, D-017, **D-028**, D-015/D-011 (ví và OTP), D-016 (email) |
| 7 Đang ở | **D-029** |
| 8 Trả phòng | **D-030**, D-004 (không khai báo thanh toán on-chain) |
| 9 Đóng hồ sơ | **D-030** (5), **D-031** (1) |
| Web3 chung | D-002 (ví + gas), D-003, D-012, D-014 (token dự phòng) |
| Giao diện, lịch | **D-037 (Fuji trước, T-22 theo mức ưu tiên; thay lịch D-025)**, D-025 (ràng buộc thiết kế), D-032 (icon/form), D-033 (danh sách), D-035, D-036 (không gian Sale) |
| Bổ sung thực tế | **D-038** (đường thoát khi khách im lặng, điều khoản xác nhận điện tử, ô đồng ý dữ liệu cá nhân), D-034 (nguồn tiền cọc và điều kiện phát hành bàn giao) |

In đậm = quyết định của đợt bàn lại luồng ngày 10/11/2026.

---

## 9. Việc còn mở, rủi ro

| Mã | Việc | Ai | Ghi chú |
|---|---|---|---|
| Q-10 | BTC có cấp gói Privy Scale (JWT) để bỏ OTP không | Vy nhắn BTC | Có → bật D-011; không → giữ OTP (D-015) |
| Q-01 | Tiền cọc ghi lên chuỗi: giữ số trên phiếu cọc (D-034). Khi làm mục "thành viên bị loại được hoàn 80%" (mục 3.4) thì "cọc còn giữ" = cọc trên phiếu trừ phần đã hoàn (D-038) | AI làm mục đó | Mục này đang xếp "để sau nếu trễ" |
| Q-05 | SQL demo, RPC, AVAX thử cho Fuji đã sẵn sàng chưa | Kiểm tra môi trường | Không gửi khóa bí mật qua chat |
| Q-06 | Giờ đóng cổng, deadline chính thức | Theo thông báo BTC | 20/11 là mục tiêu nội bộ, hạn thi 21/11 |
| Q-07 | Ghi công và đồng ý của thành viên nhóm cũ | Vy | Cho README/nộp bài |
| Q-08 | Email provider thật cho OTP/link khi demo | Vy xác nhận | Không dùng email giả |
| Mục 6 | Đổi người đại diện bằng email mời | Làm sau cùng | Trễ thì giữ cách tạm |
| Mục 9 | Mốc chuỗi 3 "đóng hồ sơ" | **Để sau bản thi** | Cần sửa contract |
| — | Thời hạn phiên Privy | Thử ở Fuji | Ảnh hưởng số lần phải nhập OTP |

**Rủi ro lớn nhất:** chưa có gì chạy trên Fuji trong khi T-22 và giao diện còn nhiều. Đề xuất làm Fuji trước và chia T-22 theo mức ưu tiên: xem [progress.md](progress.md).

---

## 10. Trạng thái làm việc và lịch

Không lặp lại ở đây để tránh hai nơi lệch nhau. Xem [progress.md](progress.md): mức sẵn sàng theo tiêu chí chấm, nhánh đang mở, thứ tự ưu tiên, T-22 chia theo mức và kết quả kiểm tra gần nhất.
