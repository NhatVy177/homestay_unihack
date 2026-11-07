# Phạm vi chức năng hiện hành

Ghi nhận ban đầu: **2026-11-05 00:38:27 +07:00**; cập nhật nghiệp vụ **2026-11-05 02:13:15 +07:00** (D-009) và **2026-11-05 14:58:04 +07:00** (D-010 → D-014). Tóm tắt từ [plan](../hackathon/plan.md), mục 1, 3, 4 và 8; [handoff](../hackathon/handoff.md), mục 6–9. Trạng thái triển khai xem [progress.md](progress.md).

## Mục tiêu và người dùng

Tiếp tục nền HomeStayDorm React/Vite + Express + SQL Server. Avalanche lưu lịch sử xác nhận bàn giao và đối soát cọc có phiên bản để khách biết ví nào đã đồng ý bản nào và tự đối chiếu file bằng chứng đã giữ.

MVP: một chi nhánh, ba vai trò **quản lý – kế toán – khách thuê**, dữ liệu giả, mục tiêu chạy Fuji. Quản lý và kế toán cùng thuộc phía vận hành. Phần Web2 hiện có tiếp tục xử lý đăng ký, cọc, hợp đồng, hóa đơn và thanh toán.

## Các chức năng cần thực hiện

Vị trí code theo D-008: contract/test/toolchain/shared nằm trong [blockchain/](../blockchain/README.md); ví/ký ở frontend, adapter/relayer ở backend. Đã tạo khung thư mục, chưa triển khai F-01–F-09; không thay đổi phạm vi nghiệm thu dưới đây.

| Mã | Chức năng / người thao tác | Điều kiện nghiệm thu |
|---|---|---|
| F-01 | Ví trong tài khoản — khách thuê | (D-015, tạm thay D-011) Privy embedded wallet; khách nhập **mã OTP email một lần** trong khung HomeStayDorm khi xác nhận lần đầu, không popup ví; phiên Privy của tài khoản khác bị đăng xuất. (D-011, khi có gói Scale) theo **chính phiên đăng nhập HomeStayDorm** (JWT-based auth); liên kết tài khoản bằng challenge ký ngầm một lần; khôi phục = đăng nhập lại cùng tài khoản (cần thử thật). Không gửi khóa khách cho backend; thay ví không đổi người ký hồ sơ cũ. (D-016) Đăng ký tài khoản khách bắt buộc email đúng định dạng, không trùng tài khoản khác. |
| F-02 | Bàn giao trực tiếp + ký điện tử — nhân viên lập, sinh viên xác nhận | Nhân viên dẫn xem phòng, lập biên bản Web2 (không còn ô ký giấy) → hệ thống **tự phát hành** bản xem vào tab Hợp đồng của khách + email. Khách yêu cầu chỉnh sửa → quản lý phát hành bản mới (**ở Web2**, giữ lịch sử, D-010) hoặc khách xác nhận → backend ghi đúng bản đó lên chain rồi khách ký ngay; sau đó bản bị khóa. Email/link không là chữ ký; browser đối chiếu nội dung đang xem với snapshot; chỉ receipt/event hợp lệ mới hoàn tất điện tử. |
| F-03 | Lập đối soát có phiên bản — kế toán | Snapshot khoản trừ, hoàn/thu thêm dựa trên calculator Web2; lưu phiên bản/hash và kiểm tra tổng, số học. Chốt nguồn cọc thực tế trước khi nối dữ liệu; không tự sao chép toàn bộ chính sách sang Solidity. |
| F-04 | Phản đối → sửa → đồng ý — khách/kế toán | Phản đối ràng buộc đúng bản và hash lý do; con người xem xét, tạo v2 giữ v1; khách ký đúng bản hiện hành. Chặn sửa bản đã chấp nhận và hành động sai thứ tự/quyền. |
| F-05 | App trả gas qua relayer | Chữ ký EIP-712 ràng buộc action, hồ sơ, version/hash, nonce, deadline và domain chain/contract. Kiểm tra EOA hoặc ERC-1271 theo ví đã chọn; chặn replay/sai signer. Relayer có quyền gửi, không ký thay khách; giới hạn yêu cầu/gas. |
| F-06 | Bộ bằng chứng (bản lưu) | Có nội dung, salt, mã hồ sơ, version, commitment, chain ID, contract và bản gốc file cần đối chiếu; không chỉ lưu URL. (D-012) Không bắt tải + tick “đã lưu” trước khi ký; bản lưu tải được bất cứ lúc nào trong hồ sơ và được gửi kèm email sau receipt. |
| F-07 | Verify độc lập — người giữ file | File + RPC đủ để kiểm tra, không xin lại tài liệu từ API quản lý. Dùng deployment đáng tin cậy để đối chiếu contract; chỉ rõ file bị sửa/thiếu, phiên bản cũ, trạng thái hiện tại và lỗi đọc RPC. |
| F-08 | Đồng bộ chain – SQL và trạng thái UI | Chỉ thành công sau receipt + event đúng. Gửi lặp không tạo bản ghi trùng; chain thành công/SQL lỗi có cách đọc lại để phục hồi. Lưu chain ID, contract, tx hash, log index; phân biệt đang gửi/thất bại/đã ghi nhận. |
| F-10 | Ẩn Web3 khỏi trải nghiệm (D-012) | Xác nhận nằm trong tab Hợp đồng của khách, tab “Khách xác nhận biên bản” (quản lý), “Khách xác nhận đối soát” (kế toán). ~~Không hiện ví/địa chỉ/tx ngoài mục thu gọn “Thông tin xác thực”;~~ (D-017) Khách chỉ thấy “đã xác nhận lúc …, đã lưu, không sửa được” + tải bản lưu + link kiểm tra; hồ sơ cũ thiếu giờ ghi nhận thì bỏ “lúc …”. Mã giao dịch/tên mạng/explorer chỉ ở tab quản lý, kế toán và trang kiểm chứng; báo “đã gửi email” chỉ khi trạng thái thông báo mới nhất là `sent`; dữ liệu cọc/chính sách/biên bản/đối soát lấy tự động từ Web2. Tính năng tắt → phần xác nhận tự ẩn, Web2 chạy bình thường. |
| F-11 | Thanh toán cọc và khoản thu kỳ đầu qua ví điện tử mô phỏng (D-013, D-018) | Tạo đơn → trang cổng ghi rõ mô phỏng → IPN ký HMAC; sai chữ ký/số tiền bị từ chối; IPN lặp/đồng thời chỉ xác nhận phiếu cọc/hóa đơn kỳ đầu một lần; tái dùng SP Web2. (D-018) Khoản thu kỳ đầu: số tiền lấy từ cách tính Web2 hiện có (trừ khoản hoàn cọc khi có), trả xong thì nút Bàn giao mở được. Hóa đơn lưu phương thức `Ví điện tử`, người thu `NULL` và màn kế toán hiện “Tự động (cổng thanh toán mô phỏng)”; `PaymentSimOrder` giữ liên kết hóa đơn/giao dịch. Luồng kế toán thu tay giữ nguyên. Không dùng thương hiệu/API thật, không nhận tiền thật. |
| F-13 | Luồng đặt cọc mới có email (D-023) | Sale gửi yêu cầu kèm hình thức + giường; email báo quản lý đúng chi nhánh, nhắc một lần sau 8 giờ. Quản lý duyệt → phiếu được tạo, giữ giường, chốt, email sale + khách (khách có link thanh toán dẫn qua đăng nhập vào đúng phiếu). Hàng đợi cũ trước, hiện thời gian chờ; duyệt yêu cầu đến sau phải ghi lý do, kèm lý do trong email của yêu cầu bị tự từ chối. Từ chối/quá 12 giờ → hồ sơ về sale, email. Tiền mặt: biên nhận ký 2 bản, sale xác nhận đã thu → "Đã thanh toán" ngay, kế toán đánh dấu "Đã nộp quỹ". Chuyển khoản tay do kế toán xác nhận. Nội dung chuyển khoản chuẩn, đếm ngược hạn, email nhắc trước 3 giờ, email thành công/quá hạn. Gửi email lỗi không làm hỏng thao tác; tôn trọng `MAIL_REDIRECT_TO`. |
| F-14 | Nhận phòng: duyệt cư trú theo ngoại lệ và email (D-024) | Sale đối chiếu CCCD gốc rồi gửi hồ sơ; đủ thông tin, đúng giới tính/sức chứa, CCCD không trùng, quốc tịch Việt Nam, từ 18 tuổi → `NVAUTO` duyệt từng người và hồ sơ; khác điều kiện → quản lý đúng chi nhánh nhận email, thấy lý do và duyệt tay. Có thể từ chối riêng thành viên và duyệt người còn lại để lập hợp đồng. Email cọc đã thanh toán kèm lịch/CCCD gốc; thành viên bị từ chối cho khách và Sale; hợp đồng đã lập kèm số tiền, link xem và trả kỳ đầu; nhắc trả khi còn không quá một ngày; trả xong báo khách và quản lý sẵn sàng bàn giao. Mail chống trùng theo từng lần gửi duyệt, lỗi gửi không hỏng thao tác; `MAIL_REDIRECT_TO` áp dụng. |
| F-12 | Tự động chốt phiếu cọc (D-019–D-021; lịch sử, được D-023 thay thế) | Quy trình công tắc Admin, Sale lập phiếu riêng và kế toán chốt tay không còn dùng. D-023 giữ quản lý duyệt, sau đó hệ thống tạo và chốt phiếu trong cùng transaction với `NVAUTO`. |
| F-09 | Triển khai và demo Fuji | Contract deploy và verify source; ABI/address/UI thống nhất; chạy luồng đầy đủ ba vai trò, có tx thật, test phù hợp, README setup và bằng chứng demo. Local pass không thay thế nghiệm thu này. |


## Nghiệp vụ bàn giao mới nhất — D-009

- **Không tự check-in.** Nhân viên vẫn dẫn sinh viên xem phòng, ghi tình trạng và ảnh, rồi phát hành biên bản Web2 từ hồ sơ hợp đồng. Tận dụng nghiệp vụ hiện tại; không coi dữ liệu SQL sẵn có là đã có UI khách.
- **Khách có thao tác thật:** Hợp đồng của tôi → Chi tiết → Biên bản bàn giao (UX đề xuất); đọc/lưu bản sao, phản hồi sai sót hoặc ký bằng ví nhúng. Nhân viên xử lý phản hồi và phát hành phiên bản mới; giữ lịch sử, chặn ký bản cũ.
- **Chưa ký tại chỗ:** gửi email link mở hồ sơ để đăng nhập/ký sau. Link/OTP không đồng nghĩa ký; kiểm tra quyền chủ hợp đồng; nhắc ký nếu chưa hoàn tất. Mốc 24 giờ là đề xuất, không là deadline cứng.
- **Bắt buộc chữ ký điện tử của chính khách** để hoàn tất xác nhận trên Avalanche; không nhân viên ký hộ, không coi ghi hash bởi nhân viên là chữ ký khách, không fallback giấy trong MVP.
- **Hai trạng thái khác nhau:** bàn giao thực tế/chìa khóa (Web2) và xác nhận điện tử (chờ ký/đang gửi/đã ký/lỗi/cần chỉnh). Khách có thể nhận phòng thực tế trước khi ký xong; không tự đồng ý/hủy hợp đồng khi quá hạn.
- Mất mạng hoặc chain lỗi: cho khách mở lại/ký sau, kiểm tra receipt, đồng bộ idempotent. Thêm UI khách/nhân viên, API phân quyền/phiên bản, email; tái dùng cấu trúc Web2 thay vì làm lại hệ thống. Không đưa dữ liệu nhạy cảm lên chain.
- **Test bắt buộc:** email không tự ký; user sai quyền không xem/ký; bản cũ không ký; từ chối/chỉnh sửa không ép chấp nhận; không báo ký thành công khi chưa có receipt; trạng thái bàn giao thực tế không tự đồng bộ thành chữ ký.

## Luồng demo đã thống nhất trong plan

1. Bàn giao ghi nệm đã rách, cọc còn giữ **3.000.000 VND giả lập**, demo hợp đồng đủ hạn/tỷ lệ 100%.
2. Kế toán lập v1: trừ 500.000 VND khoản khác + 400.000 VND vết rách; số hoàn dự kiến 2.100.000 VND.
3. Khách phản đối bằng biên bản cũ; con người xem xét; kế toán lập v2 bỏ 400.000 VND.
4. Khách lưu bằng chứng và xác nhận v2, hoàn dự kiến **2.500.000 VND**.
5. Verify file đúng, sửa một số để thấy lệch, mở tx và source trên explorer. Hồ sơ/giao dịch chuẩn bị trước phải nói rõ.

“Đã thống nhất đối soát” không đồng nghĩa “đã nhận tiền”. Chain không xác định sự thật về vết rách, không phân xử hoặc tự chuyển khoản hoàn.

## Ngoài MVP và phần tùy chọn

- Ngoài MVP: escrow/giữ hoặc chuyển tiền, NFT, token point, L1 riêng, AI phân xử; giao dịch riêng cho báo trả/thời gian báo trước; khai báo đã trả/đã nhận tiền on-chain.
- ~~Tùy chọn sau khi luồng chính đạt nghiệm thu: simulator thanh toán hoặc MoMo sandbox.~~ **D-013:** simulator thanh toán cọc đã vào scope chính (F-11). MoMo sandbox thật vẫn ngoài scope.
- Token point (D-014): dự phòng, chỉ cân nhắc sau khi luồng chính đạt nghiệm thu trên Fuji.
- Không chuyển nền SQL Server sang Supabase trong đợt chuẩn bị này.

## Điều kiện xuyên suốt

Không đưa CCCD, địa chỉ, tài khoản ngân hàng, ảnh hoặc nội dung biên bản lên chain. Chain chỉ giữ ID khó đoán, ví, commitment, version/state và số tiền tối thiểu cần thiết. Không khẳng định hash/salt bảo đảm ẩn danh hoặc chữ ký tự chứng minh hiệu lực pháp lý.

Kiểm thử cần phủ sai quyền/chữ ký, replay/hết hạn/sai domain, sai version/hash, tổng tiền và làm tròn, sửa file/thiếu salt/ảnh, relayer timeout/gas, SQL lệch chain và khôi phục ví. Ghi kết quả thực tế ở nhật ký; chưa có kết quả cho bộ yêu cầu này trong repo hiện hành.
