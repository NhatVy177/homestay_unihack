# Kịch bản video demo vòng 1 (3:00)

Bản ngày 18/11/2026, thay bản nháp 11/11 (J-C063). Vòng 1 chấm **kỹ thuật** và **mức tích hợp Avalanche**, nên video ưu tiên: hệ thống chạy thật, Avalanche gắn đúng chỗ cần, và bằng chứng kiểm chứng được (Snowtrace, trang kiểm chứng, khôi phục từ chuỗi). Giao diện đẹp để vòng sau.

## Ba điều giám khảo phải nhớ

1. **HomeStayDorm giải bài toán thuê phòng thật:** người thuê tìm phòng rời rạc qua Facebook/Zalo, chủ nhà quản lý thủ công, cuối cùng cãi nhau tiền cọc.
2. **Khách không cần biết blockchain:** đăng nhập email, nhập mã OTP, không cài ví, không cần AVAX. Ví nhúng Privy, chữ ký EIP-712, relayer trả gas.
3. **Kiểm chứng được, không phải lời hứa:** 2 contract trên Fuji (DormSettlement đã verify Sourcify, DormPoints), trang tự kiểm chứng file, dựng lại hồ sơ từ chuỗi khi mất database.

## Chia thời gian

| Đoạn | Thời gian | Nội dung |
|---|---|---|
| 1. Vì sao HomeStayDorm | 0:00–0:10 | Tìm phòng qua Facebook/Zalo rời rạc, chủ nhà quản lý thủ công, tranh chấp cọc |
| 2. Luồng thuê phòng trên Web2 | 0:10–1:00 | Lọc phòng, chia sẻ link, quan tâm/thuê nhóm, Sale xếp lịch, đổi/hủy lịch, kết quả buổi xem, duyệt và thanh toán cọc, cư trú, hợp đồng, kỳ đầu |
| 3. Mốc 1: bàn giao trên Avalanche | 1:00–1:35 | Phiên bản biên bản, ví nhúng, EIP-712, relayer, Snowtrace |
| 4. Đang ở và Mốc 2: đối soát cọc | 1:35–2:06 | Hóa đơn, báo hỏng, phản đối, bản 2, contract tự tính tiền |
| 5. Kiểm chứng độc lập + khôi phục | 2:06–2:20 | Trang kiểm chứng, lệnh khôi phục từ chuỗi |
| 6. Điểm thưởng DormPoints | 2:20–2:34 | Tích điểm khi trả đúng hạn, đổi ưu đãi bằng chữ ký |
| 7. Kỹ thuật | 2:34–2:53 | Kiến trúc, riêng tư, verify, gas đo thật |
| 8. Kết | 2:53–3:00 | Câu chốt |

Lời đọc khoảng 4,5–5 tiếng mỗi giây (tự nhiên, hơi nhanh). Hình chạy theo lời, cắt bỏ mọi đoạn chờ (OTP, giao dịch, tải trang). Nếu thu giọng bị gấp, cắt dòng 1:35–1:43 hoặc đoạn 6 trước, không đọc nhanh hơn.

## Kịch bản chi tiết

| Giây | Quay gì trên màn hình | Lời đọc (lồng tiếng) |
|---|---|---|
| 0:00–0:10 | Ba cảnh cắt nhanh, mỗi cảnh 3 giây: nhóm Facebook/Zalo tìm trọ (che thông tin) → sổ tay, Excel của chủ trọ → nệm rách và bảng trừ cọc. Giây cuối: logo HomeStayDorm. Góc: "Avalanche Fuji · dữ liệu demo · thanh toán sandbox" | "Sinh viên, người đi làm tìm phòng qua Facebook, Zalo rời rạc; chủ nhà quản lý bằng sổ tay, Excel; trả phòng lại cãi nhau tiền cọc. HomeStayDorm gom tất cả về một nền tảng, dùng Avalanche để hai bên tin nhau." |
| 0:10–0:17 | **Khách**: trang chủ → danh sách phòng, chọn khu vực và mức giá → chi tiết phòng (ảnh, giá/giường, giới tính, dịch vụ đi kèm) | "Khách vào trang chủ, lọc phòng theo khu vực, giá, loại phòng. Mỗi phòng có ảnh, giá theo giường, giới tính phù hợp và dịch vụ đi kèm." |
| 0:17–0:22 | Bấm **Chia sẻ** → "Đã sao chép link" → dán vào Messenger/Facebook, thẻ xem trước hiện ảnh, giá | "Bấm Chia sẻ là sao chép link, dán lên Facebook, Zalo hiện sẵn ảnh, giá, địa chỉ phòng." |
| 0:22–0:29 | Bấm **Tôi quan tâm phòng này** → phiếu nhu cầu; lướt sang **Đăng ký thuê theo nhóm** (danh sách thành viên) | "Khách bấm Tôi quan tâm để gửi phiếu nhu cầu, hoặc đăng ký thuê theo nhóm; hệ thống tự kiểm tra giới tính và số giường còn trống." |
| 0:29–0:36 | **Sale**: danh sách phiếu chờ xếp lịch → chọn phòng, đặt giờ → **Khách**: lịch xem, nút Xác nhận lịch, Đổi lịch, Hủy lịch | "Phiếu vào hàng chờ của Sale đúng chi nhánh. Sale đối chiếu phòng phù hợp, xếp lịch xem; khách nhận email, xác nhận lịch, có thể xin đổi hoặc hủy." |
| 0:36–0:42 | **Sale**: thẻ lọc Chờ xem / Đã xem / Khác → ghi nhận "Đã xem" → **Khách** bấm **Tôi muốn đặt cọc** | "Sau buổi xem, Sale ghi kết quả đã xem hoặc khách không đến; khách ưng phòng thì bấm Tôi muốn đặt cọc." |
| 0:42–0:50 | **Quản lý** duyệt yêu cầu giữ chỗ → **Khách**: trang thanh toán cọc, tab MoMo → mã QR MoMo Sandbox → **Kế toán** xác nhận đã nhận tiền | "Yêu cầu giữ chỗ được quản lý chi nhánh duyệt, kế toán chốt số tiền. Khách trả bằng QR chuyển khoản hoặc MoMo, đây là QR thật từ MoMo Sandbox, kế toán xác nhận đã nhận tiền." |
| 0:50–1:00 | **Khách** khai người ở cùng (tự duyệt khi đủ điều kiện) → **Sale** lập hợp đồng → khách trả khoản thu kỳ đầu → hộp thư có các email thông báo | "Khách khai người ở cùng, hệ thống tự duyệt cư trú nếu đủ điều kiện. Sale lập hợp đồng, khách trả khoản kỳ đầu; mỗi bước đều có email báo đúng người." |
| 1:00–1:08 | **Quản lý**, Bàn giao phòng: hợp đồng "Chờ bàn giao" → lập biên bản, điền tài sản và tình trạng → Phát hành | "Avalanche xuất hiện đúng hai lúc cần cả hai bên đồng ý. Lúc thứ nhất là nhận phòng: quản lý lập biên bản bàn giao, liệt kê tài sản và tình trạng, rồi phát hành." |
| 1:08–1:16 | **Khách**, tab Hợp đồng: đọc biên bản → **Yêu cầu chỉnh sửa**, gõ "Nệm có vết rách sẵn ở góc" → **Quản lý** phát hành bản 2, lịch sử hiện 2 bản | "Khách thấy biên bản thiếu vết rách có sẵn trên nệm, nên bấm yêu cầu chỉnh sửa thay vì xác nhận. Quản lý phát hành bản hai, bản một vẫn được giữ lại." |
| 1:16–1:26 | **Khách** bấm Xác nhận → khung nhập mã 6 số → (cắt) nhập mã từ email → "Bạn đã xác nhận biên bản lúc …" | "Khách bấm xác nhận và nhập mã gửi về email. Phía sau, ví nhúng Privy tạo chữ ký EIP-712 gắn đúng phiên bản biên bản này. Khách không cần cài ví, không cần mua AVAX." |
| 1:26–1:35 | **Quản lý** thấy "Đã ghi nhận" + mã giao dịch → mở Snowtrace, phóng to "Success" và hàm `confirm` | "Relayer của hệ thống trả phí gas và gửi giao dịch lên Fuji. Relayer không thể giả chữ ký, vì contract chỉ chấp nhận đúng chữ ký của ví khách. Quản lý thấy ngay mã giao dịch trên Snowtrace." |
| 1:35–1:43 | **Khách**: tab Hóa đơn (2 kỳ) → tab Báo hỏng, gửi ảnh → **Quản lý** hoàn tất "do khách gây ra", phí cộng vào kỳ sau | "Trong thời gian ở, khách nhận hóa đơn tháng qua email, báo hỏng có ảnh; nếu do khách gây ra, phí sửa tự cộng vào hóa đơn tháng sau." |
| 1:43–1:49 | Chữ "Vài tháng sau: trả phòng". **Kế toán** lập đối soát bản 1: cọc 3.000.000đ, trừ 400.000đ "nệm rách" → Gửi khách | "Lúc thứ hai là trả phòng. Kế toán gửi bảng đối soát cọc, trừ luôn bốn trăm nghìn tiền nệm rách." |
| 1:49–1:57 | **Khách** bấm **Phản đối**, gõ "Vết rách đã có trong biên bản tôi xác nhận lúc nhận phòng" | "Khách bấm phản đối, ghi rõ vết rách đã có trong biên bản lúc nhận phòng. Lý do phản đối cũng lên chuỗi dưới dạng mã băm." |
| 1:57–2:06 | **Kế toán** lập bản 2 bỏ khoản nệm → **Khách** bấm **Đồng ý** → "Bạn đã đồng ý kết quả đối soát lúc …", tải bản lưu | "Kế toán lập bản hai, bỏ khoản nệm, contract tự tính số tiền hoàn. Khách đồng ý và tải bản lưu. Cả hai phiên bản đều nằm trên chuỗi, không bên nào sửa kín được." |
| 2:06–2:13 | `/kiem-chung-avalanche`: chọn file → "Khớp". Mở file, đổi số tiền hoàn, chọn lại → "File đã bị sửa" | "Ai có file bản lưu cũng tự kiểm tra được trên trang kiểm chứng, chỉ cần mạng công khai. Sửa một con số là trang báo file đã bị sửa." |
| 2:13–2:20 | Terminal `npm run avalanche:recover`: danh sách hồ sơ dựng lại từ chuỗi, so với database | "Nếu bên cho thuê mất hay sửa database, lệnh khôi phục đọc lại sự kiện trên chuỗi để dựng lại toàn bộ hồ sơ đã xác nhận." |
| 2:20–2:26 | **Kế toán** ghi nhận hóa đơn tháng đúng hạn → **Khách**, Thông tin cá nhân → ô Điểm thưởng: "+100 điểm", "Đã cộng điểm" | "Avalanche còn giúp giữ chân khách: trả hóa đơn đúng hạn, khách nhận một trăm điểm DormPoints trên Fuji." |
| 2:26–2:34 | Khách bấm **Đổi ưu đãi** → ký → hóa đơn kỳ sau có dòng giảm 20.000đ và link Snowtrace | "Khách ký để đổi điểm lấy ưu đãi hai mươi nghìn cho hóa đơn kỳ sau; mỗi lần cộng và đổi điểm đều có giao dịch kiểm chứng." |
| 2:34–2:44 | Slide kiến trúc: React → Express + SQL Server → relayer → 2 contract trên C-Chain; ví nhúng Privy phía khách | "Về kỹ thuật: hai contract Solidity trên Avalanche C-Chain, chữ ký có cấu trúc EIP-712, OpenZeppelin và viem; backend Express, SQL Server, giao diện React." |
| 2:44–2:53 | Slide bảng "lên chuỗi / không lên chuỗi" → Sourcify có dấu verify → số "≈ 430.000 gas / hợp đồng" | "Tên, CCCD, ảnh không bao giờ lên chuỗi, chỉ có mã băm và số tiền. Mã nguồn đã verify, cả vòng đời một hợp đồng chỉ khoảng bốn trăm ba mươi nghìn gas." |
| 2:53–3:00 | Slide kết: tên đội, link GitHub, địa chỉ 2 contract | "HomeStayDorm: tìm phòng dễ, quản lý gọn, khách tự giữ bằng chứng. Cảm ơn ban giám khảo." |

## Cảnh mở đầu: lấy hình ở đâu

- **Nhóm Facebook, chat Zalo:** quay màn hình thật nhưng làm mờ tên, ảnh đại diện, số điện thoại, hoặc tự dựng một nhóm/đoạn chat giả bằng tài khoản của đội.
- **Sổ tay, Excel của chủ trọ:** tự dựng cảnh với danh sách giả.
- **Nệm rách, bảng trừ cọc:** tự chụp hoặc dùng ảnh miễn phí bản quyền (Pexels, Pixabay).
- Không đưa con số thống kê nếu không có nguồn ghi được trên màn hình.

## Dữ liệu và tab cần chuẩn bị trước khi quay

1. **Ba cửa sổ Chrome riêng profile:** Quản lý, Kế toán, Khách (thêm Sale nếu cần). Mỗi cửa sổ 1440px, zoom 110%, ẩn thanh dấu trang.
2. **Chia sẻ link Facebook:** thẻ xem trước chỉ hiện ảnh/giá khi link là địa chỉ công khai (Facebook không đọc được localhost). Quay cảnh dán link bằng bản trên Azure, hoặc chỉ quay "Đã sao chép link" rồi dán vào ô chat.
3. **Hợp đồng demo ở "Chờ bàn giao"** trên HOMEDORM4, kỳ đầu đã trả, khách đã xác nhận chính sách cọc, Sale đã tải ảnh hợp đồng giấy.
4. **Tài khoản khách chưa từng xác nhận** để quay bước nhập mã lần đầu; một tài khoản dự phòng. Hộp thư nhận OTP mở sẵn (`MAIL_REDIRECT_TO`).
5. **Khách đang ở có 2 kỳ hóa đơn và báo hỏng:** dùng DB demo của Codex cho cảnh 1:35–1:43, hoặc chuẩn bị trên HOMEDORM4.
6. **Hồ sơ trả phòng** đã qua bước quản lý kiểm tra, để kế toán lập đối soát (cọc 3.000.000đ, bản 1 trừ 400.000đ nệm rách).
7. **Điểm thưởng:** một hóa đơn tháng (không phải kỳ đầu) chưa trả để kế toán ghi nhận đúng hạn khi quay. Backend và frontend đã chạy lại sau khi bật `LOYALTY_*`.
8. **MoMo:** backend đã chạy lại sau khi thêm khóa `MOMO_TEST_*`; chỉ cần quay cảnh QR hiện ra.
9. **Tab mở sẵn:** Snowtrace contract DormSettlement và DormPoints, Sourcify, trang `/kiem-chung-avalanche`, terminal ở `web/backend`.
10. **File để thử sửa:** bản sao file lưu đối soát mở sẵn trong trình soạn thảo, con trỏ ở số tiền hoàn.
11. **Slide** kiến trúc, bảng lên chuỗi/không lên chuỗi, số liệu và slide kết đã xuất ảnh để chèn.

## Cách quay và dựng

- Quay từng đoạn theo bảng, mỗi đoạn một lần thu, rồi ghép. Thu lời sau khi ghép hình; nếu lời dài hơn hình thì kéo dài cảnh tĩnh (trang kết quả) thay vì đọc nhanh hơn.
- Chạy thử trọn luồng một lần trước khi quay để chắc các giao dịch Fuji thành công; ví quản lý, kế toán, relayer và ví điểm thưởng phải còn AVAX test.
- Giao dịch lỗi khi quay: giữ nguyên hồ sơ, dùng hồ sơ dự phòng, không sửa database bằng tay.
- Khi giao dịch hiện trên Snowtrace, phóng to vùng "Success" và tên hàm 1–2 giây.
- Phụ đề tiếng Việt chạy dưới; chữ trên màn hình dùng đúng nhãn giao diện đang hiện.
- Xuất 1080p, nhạc nền nhỏ dưới giọng đọc. Mở link video bằng cửa sổ ẩn danh trước khi nộp.
