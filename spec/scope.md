# Phạm vi chức năng hiện hành

Ghi nhận ban đầu: **2026-11-05 00:38:27 +07:00**; cập nhật nghiệp vụ **2026-11-05 02:13:15 +07:00** (D-009) và **2026-11-05 14:58:04 +07:00** (D-010 → D-014). Tóm tắt từ [plan](../hackathon/plan.md), mục 1, 3, 4 và 8; [handoff](../hackathon/handoff.md), mục 6–9. Trạng thái triển khai xem [progress.md](progress.md).

## Mục tiêu và người dùng

Tiếp tục nền HomeStayDorm React/Vite + Express + SQL Server. Avalanche lưu lịch sử xác nhận bàn giao và đối soát cọc có phiên bản để khách biết ví nào đã đồng ý bản nào và tự đối chiếu file bằng chứng đã giữ.

MVP: dữ liệu giả, mục tiêu chạy Fuji. Web2 có năm vai trò (khách, Sale, quản lý, kế toán, Admin) và nhiều chi nhánh; phần xác nhận trên Avalanche có ba bên **quản lý – kế toán – khách thuê**. Contract nhận một địa chỉ quản lý và một địa chỉ kế toán cho cả hệ thống: hai khóa này nằm trên máy chủ và đại diện cho bên cho thuê, không phải ví riêng của từng nhân viên. Phần Web2 hiện có tiếp tục xử lý đăng ký, cọc, hợp đồng, hóa đơn và thanh toán.

## Các chức năng cần thực hiện

Vị trí code theo D-008: contract/test/toolchain/shared nằm trong [blockchain/](../blockchain/README.md); ví/ký ở frontend, adapter/relayer ở backend. Đã tạo khung thư mục, chưa triển khai F-01–F-09; không thay đổi phạm vi nghiệm thu dưới đây.

| Mã | Chức năng / người thao tác | Điều kiện nghiệm thu |
|---|---|---|
| F-01 | Ví trong tài khoản — khách thuê | (D-015, tạm thay D-011) Privy embedded wallet; khách nhập **mã OTP email một lần** trong khung HomeStayDorm khi xác nhận lần đầu, không popup ví; phiên Privy của tài khoản khác bị đăng xuất. (D-011, khi có gói Scale) theo **chính phiên đăng nhập HomeStayDorm** (JWT-based auth); liên kết tài khoản bằng challenge ký ngầm một lần; khôi phục = đăng nhập lại cùng tài khoản (cần thử thật). Không gửi khóa khách cho backend; thay ví không đổi người ký hồ sơ cũ. (D-016) Đăng ký tài khoản khách bắt buộc email đúng định dạng, không trùng tài khoản khác. |
| F-02 | Bàn giao trực tiếp + ký điện tử — nhân viên lập, sinh viên xác nhận | Nhân viên dẫn xem phòng, lập biên bản Web2 (không còn ô ký giấy) → hệ thống **tự phát hành** bản xem vào tab Hợp đồng của khách + email. Khách yêu cầu chỉnh sửa → quản lý phát hành bản mới (**ở Web2**, giữ lịch sử, D-010) hoặc khách xác nhận → backend ghi đúng bản đó lên chain rồi khách ký ngay; sau đó bản bị khóa. Email/link không là chữ ký; browser đối chiếu nội dung đang xem với snapshot; chỉ receipt/event hợp lệ mới hoàn tất điện tử. (D-028) Bàn giao trong buổi ký hợp đồng; ảnh tình trạng tùy chọn, mã băm vào gói biên bản; không ép xác nhận tại chỗ, giao chìa khóa không chờ chữ ký, nhắc 24/72 giờ, không xác nhận thay; khách kích hoạt xác nhận điện tử (OTP) sớm ngay sau khi trả cọc. (D-038) Mẫu hợp đồng giấy có điều khoản đồng ý dùng xác nhận điện tử; giao diện gọi "xác nhận điện tử". Khách không xác nhận bàn giao quá 7 ngày: khi trả phòng quản lý được dùng thao tác "Thanh lý không có xác nhận của khách" ở Web2, chuỗi vẫn ghi khách chưa xác nhận. |
| F-03 | Lập đối soát có phiên bản — kế toán | Snapshot khoản trừ, hoàn/thu thêm dựa trên calculator Web2; lưu phiên bản/hash và kiểm tra tổng, số học. Chốt nguồn cọc thực tế trước khi nối dữ liệu; không tự sao chép toàn bộ chính sách sang Solidity. |
| F-04 | Phản đối → sửa → đồng ý — khách/kế toán | Phản đối ràng buộc đúng bản và hash lý do; con người xem xét, tạo v2 giữ v1; khách ký đúng bản hiện hành. Chặn sửa bản đã chấp nhận và hành động sai thứ tự/quyền. (D-030) Bản nháp đối soát do hệ thống soạn, kế toán rà; thu thêm qua ví; khách không phản hồi → nhắc 24/72 giờ, quá 7 ngày chuyển quản lý, không tự chấp nhận thay. Tự thanh lý khi tiền đã xong theo 3 trường hợp (trả thêm/được hoàn/bằng 0), phiếu thu nợ và phiếu hoàn cọc tách loại; quản lý xác nhận đã thu chìa khóa. (D-031) Không thêm mốc chuỗi 3: khi tự thanh lý, chứng từ chi/thu được thêm vào gói bằng chứng cuối trên Web2 và email cho khách; chuỗi dừng ở mốc 2 (`Accepted`). (D-038) Khách im lặng quá hạn hoặc phản đối kéo dài: quản lý dùng thao tác Web2 "Thanh lý không có xác nhận của khách", bắt buộc lý do và bằng chứng đã liên hệ; không chấp nhận thay trên chuỗi; gói bằng chứng cuối ghi rõ trạng thái này. (D-041) Cả nhánh không có xác nhận vẫn phải đủ thu/hoàn/chứng từ; thiếu thì khóa nút đóng và chỉ rõ khoản thiếu. Thu chìa khóa/nhả phòng độc lập với hợp đồng đã đóng. |
| F-05 | App trả gas qua relayer | Chữ ký EIP-712 ràng buộc action, hồ sơ, version/hash, nonce, deadline và domain chain/contract. Kiểm tra EOA hoặc ERC-1271 theo ví đã chọn; chặn replay/sai signer. Relayer có quyền gửi, không ký thay khách; giới hạn yêu cầu/gas. |
| F-06 | Bộ bằng chứng (bản lưu) | Có nội dung, salt, mã hồ sơ, version, commitment, chain ID, contract và bản gốc file cần đối chiếu; không chỉ lưu URL. (D-012) Không bắt tải + tick “đã lưu” trước khi ký; bản lưu tải được bất cứ lúc nào trong hồ sơ và được gửi kèm email sau receipt. |
| F-07 | Verify độc lập — người giữ file | File + RPC đủ để kiểm tra, không xin lại tài liệu từ API quản lý. Dùng deployment đáng tin cậy để đối chiếu contract; chỉ rõ file bị sửa/thiếu, phiên bản cũ, trạng thái hiện tại và lỗi đọc RPC. |
| F-08 | Đồng bộ chain – SQL và trạng thái UI | Chỉ thành công sau receipt + event đúng. Gửi lặp không tạo bản ghi trùng; chain thành công/SQL lỗi có cách đọc lại để phục hồi. Lưu chain ID, contract, tx hash, log index; phân biệt đang gửi/thất bại/đã ghi nhận. |
| F-10 | Ẩn Web3 khỏi trải nghiệm (D-012) | Xác nhận nằm trong tab Hợp đồng của khách, tab “Khách xác nhận biên bản” (quản lý), “Khách xác nhận đối soát” (kế toán). ~~Không hiện ví/địa chỉ/tx ngoài mục thu gọn “Thông tin xác thực”;~~ (D-017) Khách chỉ thấy “đã xác nhận lúc …, đã lưu, không sửa được” + tải bản lưu + link kiểm tra; hồ sơ cũ thiếu giờ ghi nhận thì bỏ “lúc …”. Mã giao dịch/tên mạng/explorer chỉ ở tab quản lý, kế toán và trang kiểm chứng; báo “đã gửi email” chỉ khi trạng thái thông báo mới nhất là `sent`; dữ liệu cọc/chính sách/biên bản/đối soát lấy tự động từ Web2. Tính năng tắt → phần xác nhận tự ẩn, Web2 chạy bình thường. |
| F-11 | Thanh toán cọc và khoản thu kỳ đầu qua ví điện tử mô phỏng (D-013, D-018) | Tạo đơn → trang cổng ghi rõ mô phỏng → IPN ký HMAC; sai chữ ký/số tiền bị từ chối; IPN lặp/đồng thời chỉ xác nhận phiếu cọc/hóa đơn kỳ đầu một lần; tái dùng SP Web2. (D-018) Khoản thu kỳ đầu: số tiền lấy từ cách tính Web2 hiện có (trừ khoản hoàn cọc khi có), trả xong thì nút Bàn giao mở được. Hóa đơn lưu phương thức `Ví điện tử`, người thu `NULL` và màn kế toán hiện “Tự động (cổng thanh toán mô phỏng)”; `PaymentSimOrder` giữ liên kết hóa đơn/giao dịch. Luồng kế toán thu tay giữ nguyên. Không dùng thương hiệu/API thật, không nhận tiền thật. (D-029) Mở rộng cho hóa đơn tháng: trả xong tự "Đã thanh toán"; IPN lặp chỉ ghi nhận một lần. Trang khách hiện "Khoản dự kiến trừ khi trả phòng" (nợ, hư hỏng, phạt); mỗi khoản mới có email và cho khách phản hồi trên Web2. |
| F-13 | Luồng đặt cọc mới có email (D-023) | Sale gửi yêu cầu kèm hình thức + giường; email báo quản lý đúng chi nhánh, nhắc một lần sau 8 giờ. Quản lý duyệt → phiếu được tạo, giữ giường, chốt, email sale + khách (khách có link thanh toán dẫn qua đăng nhập vào đúng phiếu). Hàng đợi cũ trước, hiện thời gian chờ; duyệt yêu cầu đến sau phải ghi lý do, kèm lý do trong email của yêu cầu bị tự từ chối. Từ chối/quá 12 giờ → hồ sơ về sale, email. Tiền mặt: biên nhận ký 2 bản, sale xác nhận đã thu → "Đã thanh toán" ngay, kế toán đánh dấu "Đã nộp quỹ". Chuyển khoản tay do kế toán xác nhận. Nội dung chuyển khoản chuẩn, đếm ngược hạn, email nhắc trước 3 giờ, email thành công/quá hạn. Gửi email lỗi không làm hỏng thao tác; tôn trọng `MAIL_REDIRECT_TO`. |
| F-14 | Nhận phòng: duyệt cư trú theo ngoại lệ và email (D-024) | Sale đối chiếu CCCD gốc rồi gửi hồ sơ; đủ thông tin, đúng giới tính/sức chứa, CCCD không trùng, quốc tịch Việt Nam, từ 18 tuổi → `NVAUTO` duyệt từng người và hồ sơ; khác điều kiện → quản lý đúng chi nhánh nhận email, thấy lý do và duyệt tay. Có thể từ chối riêng thành viên và duyệt người còn lại để lập hợp đồng. Email cọc đã thanh toán kèm lịch/CCCD gốc; thành viên bị từ chối cho khách và Sale; hợp đồng đã lập kèm số tiền, link xem và trả kỳ đầu; nhắc trả khi còn không quá một ngày; trả xong báo khách và quản lý sẵn sàng bàn giao. Mail chống trùng theo từng lần gửi duyệt, lỗi gửi không hỏng thao tác; `MAIL_REDIRECT_TO` áp dụng. (D-026) Khách tự khai người ở; ô đối chiếu CCCD gốc chuyển sang màn lập hợp đồng. |
| F-15 | Luồng trước nhận phòng gọn hơn (D-026, triển khai một phần C5-a; chưa nghiệm thu A3) | Mỗi hồ sơ một buổi xem nhiều phòng, Sale ghi Đã xem / Khách không đến sau buổi xem; đọc lịch và scheduler không tự đánh dấu, chỉ đúng Sale phụ trách/cùng chi nhánh được ghi, không ghi đè kết quả đã có (C5-a có code + test J-X070, migration HOMEDORM4 đã kiểm tra J-X071; chưa nghiệm thu A3 thật); nút "Không thuê nữa". Khách tự gửi giữ chỗ trên web (hoặc Sale gửi thay), chỉ chọn phòng trong buổi xem, kiểm tra ngay; lời nhắn "chờ quản lý xác nhận"; phần sau giữ D-023. Từ chối/quá 12 giờ/hết hạn → hồ sơ về "Đã xem". Khách tự khai người ở, hệ thống kiểm tra như D-024; lập hợp đồng bắt buộc tích "Đã đối chiếu CCCD gốc". Thành viên bị loại: nhả giường ngay, hoàn 80% phần cọc trừ vào kỳ đầu, phần dư/cả nhóm bị loại do kế toán chi. Đổi đại diện bằng email mời tạo tài khoản (sau cùng). (D-027) Hợp đồng "Chờ ký" kèm email xem trước; kỳ đầu trả trước qua ví hoặc tại quầy; ký giấy + đối chiếu CCCD + bàn giao trong một lần đến; bản chụp hợp đồng đã ký và điều khoản chính được băm vào gói bằng chứng bàn giao. (D-031) Phiếu cọc và email cọc hiện chính sách hoàn cọc kèm phiên bản; phiên bản đó đi vào `policyHash` lúc bàn giao. Thẻ lịch xem của khách có thanh tiến trình. Không làm hỏng các luồng Sale đang chạy. (D-038) Khi khai người ở bắt buộc tích ô xác nhận các thành viên đồng ý cung cấp thông tin; CCCD không vào gói bằng chứng. (D-042) Khách quan tâm phòng còn trống hoặc đang chờ cọc (không chọn phòng hết hẳn) rồi gửi hồ sơ kèm `phongQuanTam`; Sale tiếp nhận và lập lịch ngay; bỏ form "Tạo phiếu mới cho khách vãng lai" của Sale; form đăng ký của khách chặn dưới 18 tuổi, quốc tịch khác Việt Nam chỉ cảnh báo. Có code + test local (J-C075); chưa nghiệm thu A3 với dữ liệu thật. |
| F-12 | Tự động chốt phiếu cọc (D-019–D-021; lịch sử, được D-023 thay thế) | Quy trình công tắc Admin, Sale lập phiếu riêng và kế toán chốt tay không còn dùng. D-023 giữ quản lý duyệt, sau đó hệ thống tạo và chốt phiếu trong cùng transaction với `NVAUTO`. |
| F-09 | Triển khai và demo Fuji | Contract deploy và verify source; ABI/address/UI thống nhất; chạy luồng đầy đủ ba vai trò, có tx thật, test phù hợp, README setup và bằng chứng demo. Local pass không thay thế nghiệm thu này. |


### Chuẩn bị ví vận hành Fuji — A1

Theo yêu cầu Vy ngày 11/11: tạo ba ví mới (deployer kiêm manager, accountant, relayer), chỉ in địa chỉ; khóa lưu trong `.env` và `.fuji-backend-env.local` bị ignore, từ chối ghi đè khóa cũ. Script chia 0,3 AVAX thử cho accountant và relayer, kiểm tra đúng Fuji và đủ tiền/gas trước giao dịch, in số dư ba ví; chưa deploy. Khóa vận hành không phải khóa ví khách. Không chạy SQL hoặc đổi cấu hình ứng dụng trong A1; deploy/verify/nghiệm thu thật vẫn thuộc F-09/A2–A3.

### C3 — Bản nháp đối soát, tỷ lệ hoàn, thu thêm qua ví (D-030 mục 2, 3; D-040)

- Bản nháp đã có sẵn trước C3: màn kế toán tự điền nợ thuê, nợ dịch vụ, chi phí sửa chữa (từ biên bản kiểm tra), tiền phạt; kế toán rà, chỉnh, gửi; khách phản hồi thì lập bản điều chỉnh. Thu thêm và hoàn cọc là hai luồng riêng theo loại quyết toán.
- D-040: tỷ lệ hoàn đọc từ chính sách đã khóa trên phiếu cọc (`DepositPolicySnapshot`), nhận dạng 4 trường hợp theo tên quy định; màn kế toán ghi "theo chính sách phiên bản …". Phiếu cọc chưa có chính sách đã khóa, hoặc chính sách không có dòng rõ ràng cho trường hợp đó: dùng tỷ lệ mặc định và ghi rõ lý do. Màn kế toán hiển thị đúng tỷ lệ backend tính, không tự tính lại.
- Thu thêm qua ví mô phỏng: khách thấy thẻ "Thanh toán khi trả phòng" trong tab Hợp đồng khi đối soát mới nhất ở "Chờ thanh toán thêm"; đơn loại `thu-them-doi-soat` gắn với mã đối soát; IPN thành công gọi `SP_TraPhong_ThuThemQuaViMoPhong` (đúng chủ hợp đồng, đúng số tiền) và đổi đơn sang Paid trong cùng transaction; IPN lặp chỉ ghi nhận một lần. Phương thức `Ví điện tử`, không ghi kế toán là người thu. Tiền mặt/chuyển khoản do kế toán ghi nhận vẫn giữ.
- Kế toán đúng chi nhánh xem biên bản lúc nhận phòng, tình trạng từng món lúc vào và ảnh lúc trả phòng ngay trong hộp thoại lập đối soát (chỉ đọc). Khách xem ảnh trả phòng: chưa làm.

### C2 — Kiểm tra trả phòng so trước/sau (D-030 mục 1)

- Màn kiểm tra trả phòng của quản lý hiện cột "Lúc nhận phòng" cạnh hiện trạng từng tài sản, ảnh lúc nhận phòng và trạng thái biên bản: bản khách đã xác nhận điện tử (kèm phiên bản, giờ), bản mới nhất chưa xác nhận, hoặc chỉ có biên bản Web2. Ghép theo mã tài sản khi tra được, nếu không theo tên; không đổi cấu trúc bản đã ký.
- Món đã ghi hư hỏng lúc nhận phòng mà quản lý chọn hư hỏng thì hiện cảnh báo "hư hỏng cũ không tính cho khách"; chỉ cảnh báo, không chặn, vì món đó có thể hư thêm.
- Quản lý tải tối đa 10 ảnh PNG/JPG/WebP (5 MB mỗi ảnh), gắn cả phòng hoặc một món; file lưu riêng trong `web/backend/secrets/checkout-photos/`, bảng `KiemTraTraPhongAnh` giữ tên file và SHA-256. Sau khi lưu biên bản kiểm tra thì không thêm/xóa ảnh. Chỉ quản lý đúng chi nhánh dùng được; kế toán và khách xem ảnh sẽ thêm ở C3.

**A2 (J-X067, theo việc cho agent bản 11/11 09:40):** thay mức nạp A1 bằng mục tiêu 0,1 AVAX mỗi ví phụ; bỏ qua ví đủ tiền, ví thiếu chỉ nhận phần chênh lệch. Có chế độ chỉ kiểm tra, dự phòng gas và kiểm receipt. Deploy tự nạp env, kiểm mạng/vai trò/phí, giữ pending hash để tiếp tục đọc receipt, không ghi đè manifest Fuji. Verify source dùng Sourcify API v2, đối chiếu input/compiler/constructor và yêu cầu creation/runtime exact match; chưa có kết quả thật thì giữ pending. Trang kiểm chứng hiện link contract khi cấu hình Fuji hợp lệ. Không thay contract hoặc quy tắc xác nhận; đổi env ứng dụng sau khi có deployment/verification thật, rồi nghiệm thu A3.

### C1 — Điều khoản và bản chụp hợp đồng trong bàn giao v2 (D-027/D-031/D-034)

- Payload `homestaydorm.handover.v2`: `contractTerms` chứa mã hợp đồng, giá thuê, ngày bắt đầu/kết thúc, kỳ thanh toán, cọc theo `PhieuDatCoc.SoTienCoc`; chưa trừ hoàn một phần. Không thêm thông tin định danh cá nhân vào điều khoản.
- `policyVersion` = 8 ký tự đầu SHA-256 UTF-8 của chính sách đã lưu theo phiếu; phiếu khách/email cọc dùng cùng nội dung và phiên bản. Policy document text/version vẫn đi qua hàm băm có salt hiện có; không đổi contract/thuật toán commitment.
- Sale tải ảnh/PDF hợp đồng đã ký ở bản xem hợp đồng; file lưu riêng có quyền, bộ JSON chỉ chứa tên file hệ thống và SHA-256. Hồ sơ cũ phải có ảnh và khách đứng tên xác nhận chính sách bổ sung trước v2, không ghi hồi tố đã đọc lúc cọc.
- Bản v1 đã khóa tiếp tục đọc/verify được, không sửa bản đã khóa; review v1 chưa lên chuỗi phải được quản lý phát hành bản sửa v2. V2 thiếu dữ liệu hoặc file sai hash bị chặn. Thay số tiền/điều khoản/hash ảnh/phiên bản trong bundle bị phát hiện khi kiểm chứng.
- Migration hai bảng mới chỉ áp dụng sau khi Vy cho phép; test giả lập/local không thay nghiệm thu HOMEDORM4/Privy/Fuji.

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

### Không gian Sale — D-035

**Xác nhận lịch xem — D-045:** khách sở hữu lịch bấm xác nhận đúng phiên bản; Sale đổi ngày/giờ thì cần xác nhận lại. Cả giao diện, API và SQL chặn ghi Đã xem/Khách không đến khi bản hiện tại chưa được khách xác nhận. Không bịa xác nhận lịch sử hoặc thêm mốc Fuji. Trang lịch khách dùng tìm kiếm trong dữ liệu của tài khoản, tổng quan, thẻ lịch có tiến trình/xác nhận/đổi/hủy/liên hệ và lịch tháng theo ảnh Vy, giữ tông xanh.

**D-036 thay phần trình bày/vị trí:** nền sidebar và nội dung cùng token xanh; Tra cứu chỉ tìm/xem khách, không chứa thanh hồ sơ/cọc/cư trú/trả phòng. Sale không còn lối Trả phòng; luồng các vai trò khác giữ nguyên. Tiếp nhận hồ sơ mở từ lịch hẹn/tổng quan, xử lý cọc tiền mặt từ tổng quan, nhập hộ cư trú từ lập hợp đồng. Màn hợp đồng mở bằng danh sách đủ điều kiện và lối xem hợp đồng đã lập; không thêm chức năng bản nháp không có API. Các mô tả vị trí ở D-035 bên dưới là mốc trước D-036.

- Menu chính 5 mục theo bố cục Vy gửi: Tổng quan, Lịch hẹn xem phòng, Lập hợp đồng thuê, Tra cứu khách hàng, Hồ sơ cá nhân. Không có tab Kiểm tra phòng/giường hoặc Ghi nhận cư trú độc lập.
- Tổng quan dùng dữ liệu API được phân quyền chi nhánh: hồ sơ mới, lịch hôm nay/sắp tới, việc cần xử lý, liên kết nhanh; không đưa số liệu mẫu vào ứng dụng. Lịch hẹn có lịch tháng, bộ lọc, danh sách/chi tiết và lối tạo lịch từ hồ sơ đã tiếp nhận; phần chọn phòng/ngày/giờ dùng quy tắc và API sẵn có.
- Tra cứu khách hàng lấy từ hồ sơ Sale được phép xem; tiếp tục mở được hồ sơ đăng ký, đặt cọc, nhập hộ cư trú và trả phòng. Đây là tổ chức lại giao diện, không bỏ nghiệp vụ. Hồ sơ cá nhân hiển thị thông tin tài khoản hiện có, không tạo API chỉnh sửa mới.
- Đợt này chưa làm khách tự khai cư trú: D-026 vẫn áp dụng cho đợt nghiệp vụ tiếp theo; hiện giữ nhập hộ để không đứt luồng. Không đổi quản lý duyệt ngoại lệ, SQL/SP, luồng ký/verify, quyền hoặc trạng thái; không tự mang code chưa merge của A1/C1/T-22 vào nhánh Sale.

### Giao diện trước Fuji — D-025 / T-21

- Đợt 1 (10–11/11): nền tokens sage/nâu gỗ, Lexend cho tiêu đề và Inter cho nội dung; lớp dùng chung cho nút, thẻ, input, bảng, badge, tabs, số liệu, trạng thái rỗng; cập nhật component chung và khung Sale/Quản lý/Kế toán/Admin/khách/trang chủ/đăng nhập. Không thêm thư viện UI, không đổi class/id cũ được script dùng.
- Menu nhân viên mở/đóng được trên mobile; các màn được chụp ở 1440px và 390px, không cuộn ngang toàn trang. Ảnh local trong `web/frontend/.ui-screens/`, không commit; phân biệt API giả lập với đăng nhập/dữ liệu thật. Frontend build và backend test phải được chạy trong đợt này.
- Giữ nguyên luồng, API, SP, dữ liệu, route, props, chữ nghiệp vụ và cơ chế Avalanche; đợt 1 chỉ sửa phần khung, chưa làm lại nội dung từng tab. Đợt 2 (12–13/11) xử lý nội dung/form/bảng còn lệch, hạn chót 13/11; Fuji 14–17/11, nộp 18–20/11 theo lịch nội bộ mới của Vy.

### Quy chuẩn icon và form tham chiếu — D-032

Vy chọn `D:\Nam4\Contest\Homestay-Dorm` làm mẫu cho cách trình bày, không chỉ bảng màu. Đã đọc source frontend của mẫu tại commit `6e3fa9b` và xem màn đăng nhập đang chạy; không sửa repo mẫu. Các quy tắc dưới đây là lựa chọn triển khai của Codex để Vy xem, không phải yêu cầu pixel đã được Vy nghiệm thu.

| Phần | Quy chuẩn triển khai trong repo hiện tại |
|---|---|
| Icon | SVG nét viền 2, màu kế thừa; cỡ 16/20/24px qua tokens, menu/nút/ô nhập thường 20px, biểu tượng tiêu đề 24px. Giữ khả năng phóng icon minh họa theo cỡ chữ hiện có. Icon trang trí không nhận focus; nút chỉ có icon đóng cần nhãn truy cập và vùng bấm 40px. |
| Trường nhập | Nhãn nằm trên, 14px/500, cách ô 8px; ô cao tối thiểu 48px, góc 12px, padding 12–16px. Dấu bắt buộc và lỗi dùng màu danger, lỗi nằm dưới trường; readonly/disabled nền surface-alt và không làm mờ nội dung quá mức. Giữ nguyên loại trường, value/onChange, giới hạn, validation và native select/date. |
| Nhóm form | Desktop hai cột ở form khách vãng lai, khoảng cách 24px; mobile dưới 600px về một cột, khoảng cách 16px. Từng khối có tiêu đề rõ; không thêm/bớt trường hoặc thay thứ tự xử lý. |
| Hộp thoại/nút | Thẻ trắng góc 20px, tiêu đề có biểu tượng trong ô nền dịu; nút đóng độc lập. Nội dung dài cuộn trong modal, giữ thanh thao tác thấy được; nút chính sage, nút hủy viền, thao tác nguy hiểm giữ màu danger; nút thường cao tối thiểu 44px. |
| Mức áp dụng đã làm | Lớp dùng chung nối các class form/modal hiện có; làm cụ thể form Sale “Tạo phiếu mới cho khách vãng lai”, đăng nhập/đăng ký và phần trình bày form Admin. Các form chuyên biệt và inline style còn lại tiếp tục rà đợt 2, không mặc định đã đồng bộ mọi tab. |

### Tổng quan và thanh tìm kiếm danh sách — D-033

- Thẻ số liệu: nền trắng, viền nhẹ, góc 20px; hàng icon/nhãn nhỏ ở trên, số lớn ở dưới, màu semantic theo trạng thái. Dữ liệu lấy đúng `items/counts` của bộ lọc hiện có; Admin giữ nguyên cả số liệu và ghi chú. Không đưa số liệu mẫu vào ứng dụng và không thêm quy tắc tổng hợp nghiệp vụ.
- Thanh tìm kiếm: một thẻ trắng chứa ô dạng viên có icon, tiếp theo là bộ lọc trạng thái dạng viên có số trong ngoặc; nút xóa lọc và các bộ chọn ngày/trạng thái riêng vẫn hoạt động như cũ. Desktop tự phân bổ chỗ, mobile xuống hàng; bảng dài cuộn trong thẻ, không làm rộng toàn trang.
- Áp dụng cho các danh sách Sale/Quản lý/Kế toán đang có bộ lọc và số đếm, cùng kiểu thẻ tổng quan/lọc Admin. Trang không có số đếm hoặc không có tìm kiếm trước đó không được thêm số liệu hay control không có xử lý. Không đổi API, phép lọc, handler, native controls, trạng thái hoặc quyền thao tác.

Không đưa CCCD, địa chỉ, tài khoản ngân hàng, ảnh hoặc nội dung biên bản lên chain. Chain chỉ giữ ID khó đoán, ví, commitment, version/state và số tiền tối thiểu cần thiết. Không khẳng định hash/salt bảo đảm ẩn danh hoặc chữ ký tự chứng minh hiệu lực pháp lý.

Kiểm thử cần phủ sai quyền/chữ ký, replay/hết hạn/sai domain, sai version/hash, tổng tiền và làm tròn, sửa file/thiếu salt/ảnh, relayer timeout/gas, SQL lệch chain và khôi phục ví. Ghi kết quả thực tế ở nhật ký; chưa có kết quả cho bộ yêu cầu này trong repo hiện hành.
