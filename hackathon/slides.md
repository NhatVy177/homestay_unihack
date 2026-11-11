# Dàn ý slide nộp bài (10 trang)

Bản nháp ngày 11/11/2026 (việc D2, J-C063), để Vy dựng trên Canva hoặc Google Slides. Mỗi trang có tối đa 3 ý, gợi ý hình và lời nói 2–3 câu.

Quy ước:

- Chữ trong `⟨…⟩` là chỗ phải điền sau khi chạy thật trên Fuji. Không thay bằng số ước lượng.
- Số liệu nào chưa kiểm chứng đều ghi "giả định". Khi dựng slide, giữ nguyên chữ "giả định" trên trang.

---

## Trang 1. Tiêu đề và phần mô phỏng

**HomeStayDorm: khách thuê tự xác nhận bàn giao và đối soát cọc trên Avalanche**

- Chạy trên mạng thử **Avalanche Fuji**, dữ liệu giả
- **Cổng thanh toán ví điện tử là mô phỏng**, không nhận tiền thật
- `⟨Họ tên⟩` · Team1 Vietnam UniHack 2026

Hình: logo HomeStayDorm, ảnh màn tab Hợp đồng của khách.

Lời nói: "Em là Vy, dự án HomeStayDorm. Trước khi bắt đầu: bản demo chạy trên mạng thử Fuji với dữ liệu giả, và cổng thanh toán ví điện tử là cổng mô phỏng em tự dựng, không nhận tiền thật."

## Trang 2. Người dùng và nỗi đau

- Trả phòng là lúc hay tranh cãi tiền cọc: vết hư có từ trước bị tính là hư mới
- Biên bản giấy qua nhiều tay, dễ mất; bảng trừ cọc chỉ nằm trong máy bên cho thuê
- Người thuê không có cách tự kiểm tra mình đã đồng ý với bản nào

Hình: một tấm nệm có vết rách, bên cạnh hai bảng trừ cọc khác nhau.

Lời nói: "Ở ký túc và homestay, tranh chấp cọc thường bắt đầu từ biên bản nhận phòng: biên bản giấy thất lạc, hoặc bảng trừ cọc bị sửa mà khách không biết. Đây là tình huống trong đề đồ án của nhóm; em chưa có khảo sát số liệu thị trường, nên không đưa con số."

## Trang 3. Luồng một hình

- Web2 lo toàn bộ nghiệp vụ: xem phòng, cọc, hợp đồng, hóa đơn, trả phòng
- **Chỉ hai mốc lên chuỗi:** khách xác nhận biên bản bàn giao; khách đồng ý đối soát cọc
- Khách phản đối → bản mới, bản cũ vẫn giữ; không ai xác nhận thay khách

Hình: sơ đồ 9 giai đoạn nằm ngang, các bước Web2 màu nhạt; hai mốc chuỗi đậm màu xanh, có biểu tượng khóa. Đánh dấu các bước máy tự làm (chốt phiếu cọc, duyệt cư trú bình thường, soạn nháp đối soát). Có thể lấy sơ đồ trong README mục 2.

Lời nói: "Phần lớn hệ thống là Web2 bình thường, nhiều bước máy tự làm để bớt chuyền tay. Chỉ hai lúc cần cả hai bên cùng đồng ý mới ghi lên Avalanche: lúc nhận phòng và lúc chốt tiền cọc."

## Trang 4. Demo

- Hợp đồng chờ bàn giao → khách yêu cầu sửa biên bản → xác nhận bằng mã OTP email
- Đối soát v1 trừ 900.000 đ → khách phản đối → v2 trừ 500.000 đ → khách đồng ý
- Trang kiểm chứng: file đúng thì "khớp", sửa một con số thì "đã bị sửa"

Hình: 3 ảnh chụp (khách xác nhận, lịch sử v1/v2, trang kiểm chứng báo lệch), mã QR tới video.

Lời nói: "Trong demo, cọc là 3 triệu đồng giả lập. Bản đối soát đầu trừ cả vết rách nệm đã ghi trong biên bản; khách phản đối, kế toán lập bản hai, khách nhận lại 2,5 triệu. Cuối cùng em sửa một con số trong file và trang kiểm chứng báo ngay."

## Trang 5. Vì sao on-chain

- Một lịch sử chung mà không bên nào sửa kín được
- Khách tự kiểm chứng bằng file mình giữ và RPC công khai, không phải xin bên cho thuê
- Chữ ký gắn đúng phiên bản; chuỗi **không** phán vết rách thật hay giả

Hình: hai cột "Nhật ký DB của bên cho thuê" và "Ghi nhận trên chuỗi", so 3 dòng: ai sửa được, ai kiểm tra được, có cần xin file không.

Lời nói: "Nhật ký trong DB hay PDF ký số cũng giải quyết được một phần, nhưng vẫn do một bên giữ, hoặc đòi người thuê có chữ ký số. Ghi trên chuỗi cho khách một bằng chứng tự kiểm tra được. Chuỗi không thay người phân xử."

## Trang 6. Vì sao Avalanche

- C-Chain tương thích EVM: dùng thẳng Solidity, OpenZeppelin EIP-712, viem
- Fuji: AVAX thử miễn phí, explorer verify source, công cụ cho người mới
- Phí đo được trên Fuji: `⟨… AVAX mỗi giao dịch, điền sau A3⟩`; không suy ra phí mainnet

Hình: logo Avalanche, ảnh trang contract đã verify trên explorer `⟨link⟩`.

Lời nói: "Em chọn C-Chain vì tương thích EVM nên dùng được thư viện chuẩn cho chữ ký có cấu trúc, và Fuji cho em chạy thật mà không tốn tiền. Phí gas em đo trực tiếp trên Fuji; đây là mạng thử, nên em không suy ra cam kết chi phí cho mainnet."

## Trang 7. Kiến trúc

- **Ví nhúng** Privy: khách nhập mã OTP email một lần, không cài ví, không cần AVAX
- **Chữ ký EIP-712** ràng buộc hành động, phiên bản, nonce, hạn, chain, contract; **relayer** chỉ trả gas
- **Gói bằng chứng** (nội dung + salt) ở phía khách; **trang kiểm chứng** chỉ cần file + RPC

Hình: sơ đồ khối React (tab Hợp đồng, ví nhúng) → Express (relayer, đồng bộ SQL, email) → `DormSettlement.sol` trên Fuji; một mũi tên riêng từ file của khách → trang kiểm chứng → RPC.

Lời nói: "Khách ký trong trình duyệt bằng ví nhúng, máy chủ chỉ chuyển giao dịch và trả phí, không ký thay được. Lên chuỗi chỉ có mã băm có salt, không có tên hay CCCD. Chỉ khi có receipt và event đúng, ứng dụng mới báo đã xác nhận."

## Trang 8. Tiền từ đâu

- Bản thi **không giữ tiền, không token, không yield**; thanh toán thật vẫn ở Web2
- Nếu làm thật (giả định): bán phần mềm quản lý cho ký túc/homestay, thu phí theo số phòng
- Phí gas do bên cho thuê trả. Ví dụ: `⟨6⟩` giao dịch mỗi hồ sơ × `⟨phí đo được⟩`, phần này là giả định

Hình: dòng tiền đơn giản: chủ cơ sở trả phí thuê bao → HomeStayDorm → trả gas cho Avalanche.

Lời nói: "Dự án không tạo token và không cầm tiền của ai. Nếu phát triển tiếp, nguồn thu là phí phần mềm từ bên cho thuê; mỗi hồ sơ có khoảng sáu giao dịch, chi phí gas em sẽ tính lại từ số đo trên Fuji."

## Trang 9. Giới hạn pháp lý và kỹ thuật

- **Xác nhận điện tử** theo thỏa thuận trong hợp đồng giấy, không phải chữ ký số; chưa được tư vấn pháp lý; không dùng tiền mã hóa để thanh toán
- Một khóa "quản lý" và một khóa "kế toán" trên máy chủ, chưa có multisig; contract chưa kiểm toán
- Ví khách đi theo email: mất email là mất ví; cách gắn ví theo phiên đăng nhập cần gói Privy trả phí

Hình: danh sách gọn, mỗi dòng một biểu tượng cảnh báo.

Lời nói: "Em nói rõ giới hạn: đây là bằng chứng bổ sung, hợp đồng thuê vẫn ký giấy. Nếu triển khai thật cần đối chiếu luật giao dịch điện tử và bảo vệ dữ liệu cá nhân, đổi khóa vận hành sang multisig và kiểm toán contract."

## Trang 10. Việc tiếp theo

- Thử với một cơ sở thật; đo số hồ sơ tranh chấp và thời gian hoàn cọc (giả thuyết, chưa đo)
- Gói bằng chứng cuối khi thanh lý; ví theo phiên đăng nhập; khóa vận hành multisig
- Repo `⟨link⟩` · Contract `⟨link explorer⟩` · Video `⟨link⟩`

Hình: ba mã QR (repo, explorer, video).

Lời nói: "Bước tiếp theo là thử với một cơ sở thật để đo xem tranh chấp cọc có giảm không. Cảm ơn ban giám khảo, link repo và contract ở trên màn hình."

---

## Câu hỏi giám khảo có thể hỏi

| Câu hỏi | Ý trả lời |
|---|---|
| Sao không dùng DB có nhật ký? | DB do một bên giữ, sửa được; khách không tự kiểm tra được khi bên cho thuê không hợp tác. |
| Khách không xác nhận thì sao? | Nhắc sau 24 và 72 giờ. Quá hạn thì quản lý dùng thao tác Web2 "Thanh lý không có xác nhận của khách", bắt buộc lý do và bằng chứng; chuỗi ghi đúng là khách chưa đồng ý. |
| Máy chủ có ký thay khách được không? | Không. Contract chỉ chấp nhận chữ ký EIP-712 của đúng ví khách; relayer chỉ trả gas. |
| Dữ liệu cá nhân có lên chuỗi không? | Không. Chỉ mã băm có salt, mã hồ sơ, ví, phiên bản, số tiền cần cho phép tính. |
| Mất ví thì sao? | Ví mở bằng mã OTP email của tài khoản. Đổi ví không đổi người ký của hồ sơ cũ. |
