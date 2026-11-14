# HomeStayDorm × Avalanche — Kế hoạch UniHack 2026

Cập nhật: **2026-11-05 14:58:04 +07:00** (D-010 → D-014: vòng sửa biên bản ở Web2, ví nhúng theo phiên HomeStayDorm, ẩn Web3, cổng thanh toán mô phỏng, point dự phòng; trạng thái code xem spec/progress.md). Mốc trước: 02:13:15 (D-009).

> Tiếp nối **2026-11-05 00:38:27 +07:00**: repo hiện hành là `NhatVy177/homestay_unihack` (`D:\HomeStayDorm`, main lúc kiểm tra), mốc nền `40acf39`. Dùng [spec/](../spec/README.md) để theo dõi chức năng, quyết định, nhật ký và tiến độ. Phần “đã có” bên dưới nói về nhánh Avalanche cũ ở homedorm; nền đó **chưa được nhập/xác minh lại trong repo mới**. Xem [progress.md](../spec/progress.md) trước khi triển khai. Phạm vi kỹ thuật của kế hoạch này giữ nguyên; spec là bản tóm tắt và hồ sơ thực hiện, không phải kế hoạch thay thế.

Bối cảnh lịch sử: [handoff.md](handoff.md). Quy trình bàn giao điện tử D-009 bên dưới là quyết định mới nhất của Vy, ưu tiên khi mâu thuẫn với mô tả cũ. Cập nhật tài liệu không chứng minh code đã triển khai.

Quy ước làm việc theo yêu cầu Vy: sau mỗi đợt thay đổi hoàn tất, kiểm tra phù hợp, commit với danh tính Git `NhatVy177` và push lên đúng repo/nhánh đang làm; báo lại liên kết và commit đã push. Nếu push thất bại, báo rõ trạng thái để tránh nhầm với bản đã có trên GitHub.

Đây là bản kế hoạch hiện hành để Vy chia sẻ và triển khai. Bản này hợp nhất phản hồi BTC, hai lần phản biện của Claude và trạng thái mã nguồn; thay thế những lựa chọn scope cũ còn mâu thuẫn. Lịch sử đã commit vẫn nằm trong Git. Tài liệu nền: [README.md](README.md), [Unihack_Context.md](Unihack_Context.md), [Proposal.md](Proposal.md).

## 1. Phương án đề xuất và căn cứ

**Tiếp tục HomeStayDorm. Phần mới chính là xác nhận bàn giao và đối soát tiền cọc có phiên bản trên Avalanche Fuji, dùng ví trong app và app trả phí ghi nhận.** Người thuê xem tài liệu, chủ động xác nhận, giữ được bằng chứng và tự kiểm tra về sau.

Mục tiêu trải nghiệm: người thuê dùng tài khoản HomeStayDorm, không phải cài MetaMask/Core hay tự xin AVAX thử. Ví nhúng và chữ ký được triển khai từ một thử nghiệm nhỏ sớm, trước khi nối toàn bộ hệ thống. Đây là quyết định thiết kế đề xuất, không phải yêu cầu bắt buộc được suy ra từ lời BTC.

| Nội dung | Căn cứ và trạng thái |
|---|---|
| Nền HomeStayDorm | React/Vite, Express, SQL Server. Vy xác nhận bản mới đưa lên GitHub từ local chạy tốt. Đã đọc mã và kiểm thử phần blockchain; chưa kiểm thử toàn bộ app với SQL Server của Vy. |
| Đóng góp | Theo Vy, Vy là leader, trực tiếp thực hiện phần lớn UI/UX, frontend/backend và nghiệp vụ từ trước cuộc thi; một số phần do thành viên khác đóng góp. Chưa có bảng ghi công chi tiết. |
| Solo và dự án cũ | Ảnh phản hồi người Vy giới thiệu là BTC ngày 04/11: được nộp solo, được nộp nhiều project và được dùng project cũ. Giữ ảnh làm căn cứ; không tự gán chức danh khác. |
| Định hướng tích hợp | BTC phản hồi phù hợp với hướng Web2 đưa sang Web3 một cách hợp lý; gợi ý ví trong tài khoản, token/point, ưu đãi và thanh toán mô phỏng. Những ví dụ này không đồng nghĩa phải làm tất cả. |
| README | BTC nhấn mạnh cách setup/run và công nghệ; có thể dùng AI hỗ trợ soạn. Vẫn ghi công và mô tả đúng phần làm thêm. |
| Điểm thi | Slide: Technical Implementation 25 và Avalanche Integration 25; Vy cho biết vòng 1 ưu tiên hai mục này. Ảnh phản hồi hiện có chưa nói rõ cách chia điểm nền cũ/phần mới. Câu “BTC chấm toàn bộ sản phẩm” trong bản Claude chưa có trích dẫn trực tiếp để xác nhận. |
| Phạm vi Web3 | Hash, phiên bản, xác nhận/phản đối và kiểm chứng. Contract không giữ/chuyển tiền hoặc phân xử hư hỏng. |
| Thanh toán và point | Quyết toán tiền tiếp tục qua nghiệp vụ Web2. Cổng mô phỏng là phần tùy chọn. Token điểm chưa thuộc bản thi dự kiến. |

### Đã có và còn phải làm

Mã nguồn: [NhatVy177/homedorm](https://github.com/NhatVy177/homedorm). Nền Web2: `d1dd520b4e55377ffe1821b178c4c89dd48db08c`. Phần bổ sung: nhánh [feature/avalanche-settlement](https://github.com/NhatVy177/homedorm/tree/feature/avalanche-settlement), commit `09f8270` sau khi sửa metadata tác giả.

- Đã có contract `DormSettlement`, adapter dùng calculator của HomeDorm, utility bộ bằng chứng và trang Verify. Theo lần thực hiện trước: kiểm thử contract/adapter local, build frontend và deploy local đã qua.
- Contract hiện dùng quyền qua `msg.sender`; chưa có đường xác nhận EIP-712 qua relayer. Nó vẫn có bước báo trả và khai báo/xác nhận thanh toán. Bản triển khai tiếp theo cần thu gọn các bước này theo scope mới.
- Chưa có ví nhúng, relayer, các nút xác nhận nối SQL, xuất bằng chứng trong luồng ký, deployment Fuji hoặc verify mã nguồn trên explorer.
- Đổi plan không đồng nghĩa các phần trên đã được xây dựng hay kiểm thử.
- **Cập nhật 05/11 (J-006/J-007):** repo hiện hành đã có contract EIP-712 + relayer + Privy (`fadd0ec`) và luồng D-010 → D-013 (J-007). Test local/SQL/UI ghi ở spec/journal.md; **chưa deploy/verify Fuji, chưa thử Privy thật**. Các gạch đầu dòng trên mô tả nhánh cũ.

## 2. Yêu cầu từ workshop và cách học từ Senpai

Ảnh workshop thể hiện:

- Nộp **by 21 November** tại `team1vn.xyz`; ảnh không ghi giờ đóng cổng/múi giờ.
- dApp chạy trên Avalanche L1 riêng, Fuji testnet hoặc C-Chain mainnet.
- Repo có README; public hoặc thêm `tuantqse90` nếu private; giám khảo phải mở được mọi liên kết.
- Slide Canva/Google Slides; video demo 2–3 phút, nêu vấn đề trong 30 giây đầu, thể hiện một luồng hoàn chỉnh.
- “Your own contract, verified on the block explorer.” Deploy và verify source là hai việc riêng.
- “Built with AI? Fine. Be ready to explain every part.”

| Tiêu chí trong slide | Điểm |
|---|---:|
| Technical implementation | 25 |
| Avalanche integration | 25 |
| Creativity & innovation | 15 |
| Impact & use case | 15 |
| Presentation & pitching | 10 |
| UI/UX & demo | 10 |

Giữ ưu tiên kỹ thuật/tích hợp như Vy đã nêu, đồng thời dành thời gian cho trải nghiệm, hướng dẫn chạy và demo toàn sản phẩm. Chưa suy ra công thức chấm mới từ việc BTC cho dùng project cũ.

Tham khảo [tuantqse90/senpai](https://github.com/tuantqse90/senpai), bản đã đọc `cde33571a348c26bae614f11aa31b32487cbc285`. Đã đọc mã, chưa xác minh deployment hay chạy kiểm thử của Senpai. Nó dùng token MIU thử, HTTP 402 và ủy quyền EIP-3009 cho thanh toán; HomeStayDorm sẽ dùng typed data cho hành động bàn giao/đối soát, không sao chép nguyên giao thức thanh toán.

Nguồn cố định: [MiuCoin.sol](https://github.com/tuantqse90/senpai/blob/cde33571a348c26bae614f11aa31b32487cbc285/web/contracts/src/MiuCoin.sol), [client pay.ts](https://github.com/tuantqse90/senpai/blob/cde33571a348c26bae614f11aa31b32487cbc285/web/lib/pay.ts), [API session](https://github.com/tuantqse90/senpai/blob/cde33571a348c26bae614f11aa31b32487cbc285/web/app/api/session/route.ts), [tests](https://github.com/tuantqse90/senpai/blob/cde33571a348c26bae614f11aa31b32487cbc285/web/scripts/e2e.mjs), [MIT License](https://github.com/tuantqse90/senpai/blob/cde33571a348c26bae614f11aa31b32487cbc285/LICENSE). Nếu dùng mã theo giấy phép này, giữ thông báo bản quyền/giấy phép.

Senpai minh họa cách giấu thao tác kỹ thuật khỏi luồng thông thường và trả gas hộ người dùng. Nó không phải thang chấm hay yêu cầu HomeStayDorm có token/x402. Tốc độ, giá gas của demo đó không được dùng như số liệu đo của HomeStayDorm.

## 3. Luồng sản phẩm và kiến trúc mới

### Tổ chức code đã chọn sau khi đọc Senpai local (05/11/2026)

Tách `blockchain/` ở root, cùng cấp `web/` và `database/`: `contracts/`, `test/`, `scripts/`, `src/` dùng chung (gồm `src/abi/`) và `deployments/`. Ví/ký/đọc chain thuộc `web/frontend/src/lib/avalanche/`; adapter nghiệp vụ, relayer và đồng bộ thuộc `web/backend/integrations/avalanche/`. Giữ calculator và SQL ở backend/database. Chi tiết: [blockchain/README.md](../blockchain/README.md), D-008/J-004 trong spec.

Senpai dùng một app Next.js nên đặt contract trong `web/contracts/` và dùng `web/lib/` cho client/server. HomeStayDorm có React và Express riêng nên module root giúp tách toolchain và dùng chung định nghĩa bằng chứng. Đây mới là khung, không phải đã nhập nền `09f8270`, có ABI/SDK, relayer hay deployment; scope tính năng giữ nguyên. Chọn toolchain sau khi rà nhánh cũ.

**Một câu giới thiệu:** HomeStayDorm giúp khách thuê và đơn vị vận hành xác nhận cùng một bản bàn giao/đối soát tiền cọc, lưu lịch sử trên Avalanche và tự kiểm chứng hồ sơ đã đồng ý.

Tình huống demo: nệm đã rách lúc nhận phòng, nhưng khi trả phòng bảng đối soát lại tính phí vết rách đó. Khách dùng bản bàn giao đã lưu để phản hồi; kế toán điều chỉnh thành phiên bản mới; khách xác nhận bản đúng.

### Phần đưa vào bản thi

| Bước | Người dùng thấy | Hệ thống thực hiện |
|---|---|---|
| 1. Thiết lập xác nhận trong tài khoản | Đăng nhập và thiết lập khả năng xác nhận hồ sơ trong app | Khởi tạo/liên kết ví nhúng, chứng minh kiểm soát ví và hướng dẫn khôi phục theo cơ chế đã chọn. |
| 2. Bàn giao lúc nhận phòng | Nhân viên dẫn xem phòng và lập biên bản; khách xem hiện trạng/ảnh/cọc trên trang hợp đồng, yêu cầu chỉnh sửa hoặc ký bằng ví nhúng. Nếu chưa ký tại chỗ, nhận email link ký sau. | Web2 phân quyền và phát hành phiên bản; khách tự ký đúng snapshot; relayer gửi Avalanche và chỉ báo đã xác nhận khi receipt/event hợp lệ. |
| 3. Đối soát lúc trả phòng | Kế toán lập bản 1 với khoản trừ và số hoàn/thu thêm | Calculator Web2 lập snapshot; contract ghi nhận phiên bản và bảo vệ số học cơ bản. |
| 4. Phản hồi và sửa đổi | Khách phản đối; kế toán lập bản 2; khách xác nhận | Mỗi hành động ràng buộc đúng hồ sơ/phiên bản/hash. Giữ lịch sử bản cũ; phản đối được xử lý bởi con người. |
| 5. Lưu và kiểm chứng | Khách có file bằng chứng, nút “Kiểm tra hồ sơ” và “Xem giao dịch trên Avalanche” | Verify dùng file khách giữ và RPC để đối chiếu; không cần lấy lại bản gốc từ server quản lý. |


### Luồng nhận phòng và ký điện tử đã chốt — D-009 (05/11/2026)

HomeStayDorm hướng tới **sinh viên có smartphone**. Giữ nhân viên dẫn khách đến xem phòng và kiểm tra thiết bị/tài sản trực tiếp; **không chuyển sang mô hình tự check-in**.

1. **Nhân viên (Web2):** lập biên bản bàn giao từ hồ sơ hợp đồng, hiện trạng/ảnh, cọc và chính sách liên quan; phát hành phiên bản để khách xem. Biên bản tồn tại trong SQL không đồng nghĩa giao diện khách đã có.
2. **Khách thuê (Web2):** đăng nhập vào Hợp đồng của tôi → Chi tiết hợp đồng → Biên bản bàn giao (vị trí UI đề xuất), xem đầy đủ nội dung, ảnh và bản sao trước khi quyết định. Có thể **yêu cầu chỉnh sửa**; nhân viên xử lý và phát hành phiên bản mới, giữ lịch sử bản cũ; không cho ký bản bị thay thế.
3. **Chưa ký ngay tại phòng:** gửi **email có link mở đúng hồ sơ/biên bản** để khách đăng nhập, xem và ký sau. Email/link hoặc OTP **không phải chữ ký** và không được cấp quyền đọc công khai; server phải kiểm tra tài khoản, hợp đồng và phiên bản. Nếu chưa ký, có thể nhắc lại và nhân viên theo dõi. Mốc 24 giờ chỉ là **gợi ý lịch nhắc**, chưa chốt thành hạn cứng hoặc tự hủy hợp đồng.
4. **Xác nhận bắt buộc:** để biên bản chuyển sang **Hoàn tất xác nhận điện tử**, chính khách thuê phải chủ động ký snapshot hiện hành qua ví nhúng; relayer chỉ trả gas, không ký thay. Browser đối chiếu hash của bản đang hiển thị; khi Fuji có receipt/event đúng mới đánh dấu đã xác nhận trong SQL/UI và xuất bằng chứng đầy đủ.
5. **Hai trạng thái riêng:** (a) bàn giao thực tế/chìa khóa do nhân viên ghi nhận; (b) xác nhận điện tử chờ ký/đang gửi/lỗi/đã ký/yêu cầu sửa. Khách có thể đã nhận phòng thực tế nhưng biên bản vẫn chờ ký; không tự động coi đã đồng ý.
6. **Khi mạng/Privy/chain lỗi:** giữ trạng thái chưa hoàn tất, cho mở lại link và ký lại có kiểm tra receipt/chống giao dịch trùng; không tự ký. **Không xây nhánh ký giấy song song trong MVP** và không thể ghi hash tài liệu bằng ví nhân viên rồi gọi là khách đã ký.

**Bổ sung D-010/D-012 (05/11, 14:58):**

- Lưu biên bản Web2 → hệ thống **tự phát hành** bản xem số 1 (tài sản, ghi chú, cọc theo phiếu đặt cọc, chính sách sinh từ `QuyDinhHoanCoc`) vào tab **Hợp đồng** của khách và gửi email. Nhân viên không nhập lại mã biên bản/chính sách/cọc. Ô “khách đã ký biên bản” (giấy) bị bỏ khỏi màn và SP lập biên bản.
- **Yêu cầu chỉnh sửa → bản mới chạy hoàn toàn ở Web2**, lịch sử bản cũ giữ trong hồ sơ (SQL). Chưa có gì lên chain trong vòng này.
- Khách bấm **Xác nhận biên bản**: backend ghi bản hiện hành lên chain (ví vận hành trả phí), trình duyệt đối chiếu nội dung đang xem với snapshot/commitment, khách ký ngầm bằng ví nhúng, relayer gửi. Từ lúc này biên bản bị khóa. Chỉ receipt/event đúng mới chuyển “Đã xác nhận”.
- Biên bản lập trước khi bật tính năng (hoặc gửi tự động lỗi) có nút “Gửi khách xác nhận” trong tab **Khách xác nhận biên bản** của quản lý; tab này cũng xử lý yêu cầu sửa và gửi email nhắc (không tự nhắc theo giờ — Q-09).
- Kế toán chọn bảng đối soát Web2 có sẵn trong tab **Khách xác nhận đối soát**, không gõ tay mã.

**Web2 cần bổ sung, không xây lại toàn hệ thống:** giao diện khách xem/phản hồi/ký, giao diện nhân viên phát hành/sửa/theo dõi, API quyền truy cập theo hợp đồng và phiên bản, gửi email thông báo/nhắc; tái dùng dữ liệu bàn giao và màn hợp đồng hiện có. Không đưa email, ảnh, nội dung biên bản hoặc PII lên chain. Email provider và lịch nhắc chi tiết là Q-08/Q-09.

Báo trả phòng vẫn có thể diễn ra trong Web2; MVP không yêu cầu giao dịch on-chain riêng cho thời điểm báo trước. Hoàn/thu thêm tiền nằm trong luồng thanh toán Web2; trạng thái “đã xác nhận đối soát” không có nghĩa “đã nhận tiền”.

Trạng thái xác nhận: chờ xác nhận bàn giao → đã xác nhận bàn giao → chờ xác nhận đối soát ↔ phản đối/phiên bản mới → đã thống nhất đối soát. **Nhận phòng thực tế/đã giao chìa khóa là trạng thái Web2 riêng, không suy ra từ chữ ký trên chain.** Contract bản MVP không cần bước `PaymentReported` hay `Closed` chứng minh thanh toán. Việc chỉnh bản đã chấp nhận cần quy trình đồng thuận mới; không cho ghi đè trong MVP.

### Luồng trước nhận phòng gọn hơn — D-026 (10/11/2026)

**C1 / D-034 (11/11):** bàn giao v2 bổ sung điều khoản thực từ hợp đồng, cọc theo `PhieuDatCoc.SoTienCoc`, phiên bản SHA-256 ngắn của snapshot chính sách theo phiếu, tên/mã băm ảnh hợp đồng ký do Sale tải. Phiếu/email cọc dùng cùng chính sách; hồ sơ cũ phải bổ sung ảnh và khách xác nhận chính sách trước v2. Không nhúng file hợp đồng/PII, không sửa contract Solidity hoặc bằng chứng v1 đã khóa. Review v1 chưa lên chuỗi chuyển bằng bản sửa v2 giữ lịch sử; đọc/verify tiếp tục hỗ trợ v1. Migration mới cần Vy cho phép trước HOMEDORM4. Tiêu chí và mức bằng chứng tại `spec/scope.md`/`spec/progress.md`; không mở rộng sang hoàn một phần D-026.

Vy bàn lại luồng theo D-022 (hợp lý ngoài thực tế), tham khảo dự án nhóm Hằng: khách tự làm nhiều hơn nhưng giữ quản lý duyệt. Đã chốt: một buổi xem nhiều phòng, chỉ ghi trạng thái buổi; khách tự gửi giữ chỗ trên web (Sale gửi thay khi cần), quản lý duyệt rồi hệ thống tự tạo phiếu như D-023; bị từ chối/hết hạn → hồ sơ về "Đã xem"; khách tự khai người ở, xem CCCD gốc lúc ký hợp đồng giấy; thành viên bị loại → nhả giường, hoàn 80% trừ vào kỳ đầu; đổi đại diện qua email mời tạo tài khoản (sau cùng). Chi tiết ở D-026/F-15. Danh sách đầy đủ các hướng còn chờ chốt (mốc chuỗi 3 "đóng hồ sơ" đã quyết **không làm trong bản thi** theo D-031, giữ ghi chú "không cần `Closed`" ở trên; thay bằng gói bằng chứng cuối trên Web2. Giai đoạn 5–9 chốt ở D-027 → D-031) và lịch đề xuất nằm ở `spec/progress.md` mục "Hướng luồng D-026". Đây không phải kế hoạch song song.

**D-042 (13/11, J-C074):** khách chọn phòng quan tâm trên cổng khách (phòng còn trống hoặc đang chờ cọc; phòng hết hẳn không chọn được) rồi gửi hồ sơ; Sale chỉ tiếp nhận hồ sơ đó và lập lịch xem ngay bằng nút "Tiếp nhận & lập lịch xem phòng" đã có. Bỏ form "Tạo phiếu mới cho khách vãng lai" của Sale. Đã làm ngày 13/11 theo yêu cầu Vy (J-C075): thẻ phòng và chi tiết phòng có nhãn Còn trống / Đang chờ cọc / Hết chỗ (đếm giường ở backend, không đổi SP), nút mờ khi hết chỗ và backend chặn phòng hết chỗ, form khách chặn dưới 18 tuổi, bỏ form khách vãng lai ở Sale. Chưa nghiệm thu với dữ liệu thật. **D-044 (14/11, J-C084):** bỏ bước tiếp nhận hồ sơ riêng của Sale; "Lập lịch hẹn" hiện danh sách phiếu chờ xếp lịch, lập lịch cho phiếu "Chờ tiếp nhận" đồng thời chuyển "Đã tiếp nhận" và gán Sale; từ chối phiếu có lý do ngay trên thẻ. **D-043 (13/11, J-C079):** khách quan tâm nhiều phòng trong một hồ sơ (bấm "Thêm vào hồ sơ", không điền lại; tối đa 5 phòng cùng chi nhánh), Sale lập lịch thấy các phòng đó chọn sẵn; lưu ở bảng mới `PhieuDangKyPhongQuanTam`, migration đã chạy HOMEDORM4.

### Ví nhúng và app trả phí: mục tiêu của bản thi

- Ví nhúng giải quyết việc cài ví; relayer giải quyết việc khách phải có AVAX. Đây là hai phần khác nhau và đều cần thử trên Fuji.
- Ưu tiên SDK ví nhúng có hỗ trợ Fuji, ký EIP-712, liên kết được với tài khoản HomeStayDorm và có cơ chế khôi phục rõ. Chưa chọn nhà cung cấp hay khẳng định miễn phí trước khi kiểm tra SDK, mô hình giữ khóa, điều khoản và chi phí.
- Không mặc định tự làm ví chỉ được bảo vệ bằng PIN ngắn trong trình duyệt. Mã hóa như vậy chưa giải quyết việc đoán PIN ngoại tuyến, mã JavaScript độc hại hay mất dữ liệu trình duyệt. Nếu chọn ví local cho bản thử, phải xác định cách bảo vệ khóa/sao lưu và giới hạn dùng với khóa thử; không mô tả như ví sản phẩm đã an toàn.
- Gắn ví với tài khoản vẫn cần xác thực phiên đăng nhập và challenge ký một lần. “Ví nằm trong tài khoản” không cho phép server tùy ý gán ví khác cho khách. Thay ví trong SQL không được thay người ký của hồ sơ đã chốt trên chain.
- Khách xem và chủ động xác nhận từng bản; khóa khách không gửi cho backend ứng dụng. UX có thể dùng bước xác nhận trong app theo SDK, không hứa tuyệt đối không có màn xác nhận bảo mật.
- Vai trò quản lý/kế toán có thể dùng khóa thử do dịch vụ vận hành giữ, với phân quyền và nhật ký thao tác rõ. Khóa relayer dùng trả gas không được quyền ký thay khách.
- Thử một lát cắt nhỏ: tài khoản thử → ví nhúng → ký → relayer → contract → receipt. Chọn mô hình ví và khôi phục sau thử nghiệm này, trước khi làm nhiều màn hình.
- **Đã chọn (D-011):** Privy embedded wallet với **JWT-based auth**: backend ký JWT RS256 ngắn hạn (`sub` = mã người dùng) cho khách; Privy tạo/mở ví theo chính tài khoản HomeStayDorm, không có màn đăng nhập thứ hai; liên kết ví bằng challenge ký ngầm một lần; tắt popup ví (`showWalletUIs: false`) vì app đã hiển thị nội dung và nút quyết định. Cần cấu hình public key trong Privy Dashboard và thử khôi phục ví thật trước khi demo.
- **Tạm thay bởi D-015 (05/11, 23:50):** JWT-based auth của Privy cần gói Scale trả phí. Bản thi dùng **mã OTP email của Privy trong khung giao diện HomeStayDorm**, chỉ hiện khi khách xác nhận lần đầu (email điền sẵn từ tài khoản); ví tạo + liên kết ngầm; thao tác tự chạy tiếp sau khi nhập mã. Đã hỏi BTC về gói (Q-10). Bật lại JWT bằng `PRIVY_AUTH_MODE=jwt`.
- **D-016 (05/11, 17:31):** form đăng ký khách bắt buộc email (đúng định dạng, không trùng tài khoản khác) để mã OTP và thông báo biên bản luôn có nơi nhận, và mỗi tài khoản có ví riêng. (Đính chính J-022: thời điểm thực tế 06/11, 00:31.)
- **D-017 (06/11, 02:19):** giao diện khách chỉ báo “đã xác nhận lúc …, đã lưu, không sửa được” + tải bản lưu; hồ sơ cũ chưa có giờ thì bỏ phần “lúc …”. Mã giao dịch, tên mạng, link explorer chuyển sang tab quản lý/kế toán (chỗ demo phần Avalanche cho giám khảo). Thông báo email chỉ hiện khi trạng thái thông báo mới nhất là `sent`.

### Quy tắc chữ ký và đồng bộ

- Typed data ràng buộc domain với chain ID, địa chỉ contract, phiên bản giao thức; message chứa loại hành động, mã hồ sơ, phiên bản, commitment/hash, nonce và hạn dùng. Phản đối phải ràng buộc cả hash lý do.
- Contract kiểm tra người ký đúng vai trò, trạng thái, phiên bản hiện tại và chống replay. Không coi `msg.sender` của relayer là người dùng. Nếu giữ đường giao dịch trực tiếp để phát triển, nó phải tuân cùng quy tắc.
- Chọn hỗ trợ chữ ký phù hợp loại ví SDK thực sự trả về: EOA hoặc smart account/ERC-1271. Không giả định mọi chữ ký đều kiểm tra được chỉ bằng khôi phục địa chỉ EOA.
- Relayer chỉ nhận các hành động được phép, kiểm tra quyền và chữ ký trước khi gửi; giới hạn yêu cầu và ngân sách gas. Nó vẫn có thể chậm/từ chối gửi, nên chữ ký cục bộ chưa được coi là đã ghi trên chain.
- UI phân biệt đang gửi, đã ghi nhận, thất bại. SQL chỉ đánh dấu xác nhận on-chain sau receipt thành công và sự kiện đúng hồ sơ/phiên bản.
- Gửi lặp không tạo hành động trùng. Nếu chain đã thành công nhưng SQL lỗi, có tác vụ đọc lại event để phục hồi; lưu chain ID, contract, tx hash và log index để đối chiếu.

### Bằng chứng phải đi cùng hành động xác nhận

1. Chuẩn hóa snapshot một lần: biên bản/chính sách/bảng tiền, mã hồ sơ, phiên bản và manifest tài liệu đính kèm. Giao diện hiển thị và chữ ký dùng cùng snapshot; không gửi một hash do backend tạo mà không tự đối chiếu nội dung.
2. Trình duyệt tính hash và kiểm tra các số tiền, sau đó cho xuất bộ bằng chứng trước hoặc ngay tại bước xác nhận. Bao gồm nội dung, salt từng tài liệu, mã hồ sơ/phiên bản, chain ID, contract và commitment; ảnh/file cần có bản gốc kèm hash, không chỉ URL có thể hết hạn.
3. ~~Có bước lưu bản sao và xác nhận người dùng đã lưu.~~ **Thay bởi D-012:** không bắt tải file + tick “đã lưu” trước khi ký; bản lưu luôn tải được trong hồ sơ và được **gửi qua email sau receipt** (email là nơi khách giữ bản sao). Trình duyệt/email không đảm bảo file được giữ lâu dài; không coi việc gửi là bằng chứng khách đã giữ file.
4. Sau receipt, bổ sung tx hash/sự kiện/trạng thái và cho tải bản hoàn chỉnh. Bản trước khi gửi phải ghi rõ chưa được chain xác nhận.
5. Verify chạy với file khách giữ và RPC. Đổi nội dung làm hash lệch; bản cũ đã bị thay thế phải hiển thị đúng lịch sử, không báo như bản hiện hành.

Thông tin cư trú, CCCD, tài khoản ngân hàng, ảnh và nội dung chi tiết ở ngoài chain. On-chain có ID khó đoán, ví, commitment, phiên bản, trạng thái và số tiền tối thiểu cần cho logic. Demo dùng dữ liệu giả; không gọi toàn bộ biên bản là “công khai”. Salt giảm rủi ro dò nội dung, không bảo đảm ẩn danh.

### Thanh toán mô phỏng và point

- Giữ quy trình chuyển khoản/tiền mặt hiện có. Chỉ thêm cổng thanh toán mô phỏng sau khi luồng chính trên Fuji đạt nghiệm thu; dùng để minh họa đặt cọc hoặc quyết toán nếu nó giúp demo.
- Simulator tự dựng phải được gọi rõ là mô phỏng, không phải API MoMo chính thức. Nếu chọn MoMo sandbox thật, kiểm tra tài liệu, tài khoản và API thu/hoàn riêng trước khi tích hợp.
- Nếu làm callback mô phỏng, kiểm tra mã yêu cầu, số tiền, trạng thái và chống ghi nhận hai lần; tách rõ thu tiền và hoàn tiền. Không nhận tiền hoặc thông tin thanh toán thật cho demo.
- Chưa thêm token loyalty. Nếu làm ở giai đoạn sau, điểm thưởng là ưu đãi riêng có quy tắc tích/đổi; không dùng point thay khoản tiền cọc phải hoàn.
- **D-013 (05/11):** cổng **ví điện tử mô phỏng** thuộc scope chính, làm nhỏ cho **thanh toán cọc**: khách chọn “Ví điện tử (mô phỏng)” → tạo đơn (`PaymentSimOrder`) → trang `/thanh-toan-mo-phong/:id` ghi rõ “MÔI TRƯỜNG MÔ PHỎNG” → IPN ký HMAC (kiểm tra chữ ký, số tiền, claim nguyên tử chống ghi nhận hai lần) → tái dùng `SP_CapNhatMinhChungThanhToanCoc` + `SP_XacNhanThanhToanCoc` để tự xác nhận phiếu cọc. Không dùng tên/logo/API của nhà cung cấp thật.
- **D-018 (06/11, 02:36):** mở rộng cùng cổng mô phỏng cho **khoản thu kỳ đầu khi nhận phòng** (khách tự trả → hóa đơn kỳ đầu "Đã TT" → quản lý bàn giao được ngay); luồng kế toán ghi nhận tay vẫn giữ. Chi tiết Vy chốt ở J-026: DB lưu phương thức `Ví điện tử`, người thu `NULL`, màn kế toán hiện “Tự động (cổng thanh toán mô phỏng)”, liên kết mã hóa đơn ở `PaymentSimOrder`; số tiền tính theo SP Web2 trừ hoàn cọc nếu có. Pitch mở đầu bằng nỗi đau trong đề đồ án (§3.1.3, §3.1.4); video bắt đầu từ hợp đồng chuẩn bị sẵn ở bước "Chờ bàn giao", phần Web2 phía trước gói trong một slide sơ đồ đánh dấu bước tự động.
- **D-022 (07/11, 00:01):** không cần bám đề đồ án; thiết kế theo hợp lý thực tế và thuận tiện cho người thuê lẫn bên cho thuê.
- **D-024 (07/11, 01:00):** nhận phòng — duyệt cư trú theo ngoại lệ (đạt hết điều kiện thì hệ thống tự duyệt, bất thường mới cần quản lý); thêm email cọc thành công + danh sách cần mang, thành viên bị từ chối, hợp đồng đã lập kèm nút thanh toán kỳ đầu, nhắc trả kỳ đầu, sẵn sàng bàn giao. Code và kiểm thử local thực hiện cùng sửa T-19 trên nhánh `feat/t20-checkin-deposit-fixes`; SQL kiểm tra transaction rollback, email test bằng transport giả, browser smoke dùng API giả. Cần E2E HTTP/SMTP thật với dữ liệu demo trước khi kết luận nghiệm thu tích hợp; không suy ra kết quả Fuji.
- **Kịch bản video:** bản hiện hành ở [video-script.md](video-script.md) (D3, J-C063: 10 giây mở đầu, 110 giây demo từ "Chờ bàn giao", 30 giây vì sao Avalanche và giới hạn). Dàn ý slide ở [slides.md](slides.md). Đề xuất cũ (J-041, không chọn), 2:50: 0:00–0:15 vấn đề tranh chấp cọc · 0:15–0:50 Web2 tua nhanh (sale gửi yêu cầu → quản lý duyệt → email khách → trả ví → hợp đồng → trả kỳ đầu) · 0:50–1:40 bàn giao (biên bản ghi nệm rách → khách yêu cầu sửa → bản mới → khách xác nhận OTP → màn quản lý mở tx Snowtrace) · 1:40–2:30 trả phòng (đối soát v1 → khách phản đối → v2 → đồng ý → kiểm chứng file, sửa số thì báo lệch) · 2:30–2:50 kiến trúc, giới hạn, link. Nói ngay đầu: thanh toán mô phỏng, mạng thử Fuji. Thay ý "chỉ quay từ Chờ bàn giao" của D-018 vì BTC chấm cả Web2.
- **D-023 (07/11, 00:15; bổ sung 00:33):** luồng đặt cọc mới — Sale gửi yêu cầu kèm giường, email cho quản lý đúng chi nhánh và nhắc sau 8 giờ; hàng đợi cũ trước, duyệt yêu cầu đến sau phải ghi lý do. Quản lý duyệt → phiếu tạo + chốt + email Sale/khách có link thanh toán; từ chối hoặc quá 12 giờ → hồ sơ về Sale + email; tiền mặt xác nhận ngay bởi Sale, kế toán đánh dấu đã nộp quỹ; chuyển khoản tay do kế toán xác nhận; nội dung chuyển khoản chuẩn, đếm ngược, email nhắc/thành công/quá hạn. Ước tính ban đầu 2–3 ngày cho agent code → lùi E2E local và Fuji tương ứng; quá 10/11 chưa xong thì dừng phần còn lại, ưu tiên Fuji. Trạng thái thực hiện xem `spec/progress.md` T-19.
- **D-021 (06/11, 23:39):** nguyên tắc người/máy: việc cần nhìn tận nơi hoặc phán đoán thì người làm, việc theo công thức hay chuyền tay thì máy. Giữ tự chốt phiếu cọc, sale thấy ngay số tiền; khi bật, ẩn tab "Chốt phiếu đặt cọc" của kế toán. Kế toán vẫn giữ thu nhận phòng, quyết toán và đối soát trên Avalanche.
- **D-020 (06/11, 23:14):** đính chính D-019: quản lý vẫn duyệt nhận cọc (đề §3.1.2: kiểm tra tình trạng thực tế); hệ thống chỉ còn tự "Chốt phiếu đặt cọc".
- **D-019 (06/11, 10:45):** ~~hệ thống tự "Duyệt nhận cọc" (khi phòng còn phù hợp) và~~ tự "Chốt phiếu đặt cọc", đứng tên tài khoản "Hệ thống tự động"; công tắc trong Admin, tắt thì về duyệt tay như đề. Bước cần người thật giữ nguyên. **Lịch 15 ngày (06/11 → ~21/11, deadline chính thức chờ Q-06):** ngày 1–3 tối ưu Web2 (T-17, T-18) — quá ngày 3 thì dừng; ngày 4–5 E2E local với dữ liệu thật (không bỏ); ngày 6–8 deploy + verify Fuji và chạy lại trọn luồng (không bỏ); ngày 9–10 dự phòng + hợp đồng demo ở "Chờ bàn giao"; ngày 11–13 video, slides, README; ngày 14–15 dự phòng, nộp.
- **D-014:** token point là dự phòng sau khi luồng chính đạt nghiệm thu trên Fuji.

## 4. Chính sách cọc và giới hạn contract

| Điểm | Quyết định/công việc |
|---|---|
| Cọc ban đầu và cọc còn giữ | Chốt nguồn dữ liệu thực tế; nếu cọc đã cấn vào tiền thuê, không gọi toàn bộ cọc ban đầu là số đang giữ. Adapter hiện lấy `tienCocBanDau`, nên cần đối chiếu trước khi nối hồ sơ thật. |
| Tỷ lệ hoàn | Code `doiSoatCalculator.service.js` có 80% cho cọc chưa ký hợp đồng, 100% khi hết hạn, 50% nếu trả sớm và ở dưới 6 tháng, 70% từ 6 tháng. Đây là logic quan sát trong code, cần Vy xác nhận nghiệp vụ nếu mô tả cũ khác. |
| Thời gian | Code dùng tháng lịch qua `calculateStayMonths`; không đổi sang 180 ngày hay thời gian báo trước khi chưa chốt yêu cầu. |
| Chính sách đầu kỳ | Giữ bản chính sách và hash tại lúc nhận phòng để khách đồng ý, cùng số cọc đã được hai bên xác nhận. MVP demo hợp đồng đủ hạn/tỷ lệ 100% trước; không tự sáng tác tỷ lệ khác. |
| Kiểm tra on-chain | Contract hiện tự tính `refund = max(depositHeld − deductions, 0)` và `topUp = max(deductions − depositHeld, 0)`. Adapter gộp phần cọc không được hoàn theo chính sách vào khoản trừ. |
| Điều contract chưa kiểm tra | Chưa tự quyết định tỷ lệ 80/50/70/100, khoản hư hỏng hợp lý hay ngày ở thực tế. `policyHash` ràng buộc tài liệu, không tự thi hành toàn bộ nội dung tài liệu. |
| Giữ tính nhất quán | Dùng chung calculator Web2 qua adapter và kiểm tra tổng/số học on-chain. Nếu mở rộng để contract áp dụng tỷ lệ, phải chốt dữ liệu đầu vào, cách làm tròn và thêm kiểm thử đối chiếu; không chép toàn bộ nghiệp vụ sang Solidity. |

Lý do dùng chain: khách và bên vận hành có lịch sử chung để kiểm tra phiên bản, thứ tự giao dịch và thời điểm ghi nhận, giảm khả năng quản trị viên sửa kín lịch sử so với một DB do một bên giữ. Thời điểm ghi on-chain không chứng minh thời điểm sự kiện ngoài đời hay lúc chữ ký được tạo.

Chữ ký trên PDF/timestamp bên thứ ba và nhật ký DB cũng giải quyết một phần bài toán. Lựa chọn Avalanche dựa vào triển khai EVM và khả năng phục vụ luồng xác nhận; chỉ đưa số phí/tốc độ sau khi đo, ghi rõ Fuji là testnet, không suy ra cam kết cho mainnet. Việc thêm phép tính vào contract tự nó không tạo ra lợi thế độc quyền cho Avalanche.

## 5. Dùng nền dự án nhóm để thi solo

BTC đã chấp nhận solo và dùng dự án cũ trong phạm vi cuộc thi. Ghi rõ nền cũ và phần mới, lưu ảnh phản hồi; không cần tiếp tục chờ lại cùng câu hỏi.

1. Ghi đúng phần Vy làm và đóng góp của thành viên khác; lập bảng dựa trên thông tin thực tế, không tự điền tên hoặc tỷ lệ.
2. Thống nhất việc dùng/sửa/demo/công khai phần thành viên khác đóng góp; lưu sự đồng ý nếu có. Chưa ghi nhận trong trao đổi rằng mọi người đã đồng ý.
3. README ghi tech stack, setup/run, dữ liệu mẫu, phần nền Web2, phần mới cho UniHack, thư viện/tham khảo và AI hỗ trợ.
4. Giữ mốc nền `d1dd520` và lịch sử thay đổi mới. Không biến phần code có sẵn thành phần tự nhận mới xây dựng trong cuộc thi.

Nếu một phần không được phép dùng, thay phần đó hoặc tách contract/Verify thành demo độc lập với dữ liệu giả. Phương án này là dự phòng, không phải nhánh phát triển song song.

## 6. Phản hồi BTC và những gì còn cần xác minh

Ảnh ngày 04/11 đã trả lời: được solo/nhiều project; README cần hướng dẫn chạy và công nghệ; được dùng project cũ; hướng Web2 → Web3 hợp lý được khuyến khích. Ảnh sau gợi ý ví nhúng, point/ưu đãi và thanh toán mô phỏng.

Không cần xin BTC duyệt từng lựa chọn SDK, token hay kiến trúc. Những điểm chưa có nguồn trực tiếp:
- Giờ đóng cổng theo giờ Việt Nam, cổng nộp cuối cùng và có phải nộp thêm Builder Hub hay không.
- Cách tính điểm riêng cho phần có sẵn/phần làm mới, nếu cần làm rõ.
- Ngày công bố top 10/địa điểm chung kết; lịch workshop 11/11 và office hours 19/11 xuất hiện trong bản Claude nhưng chưa được xác minh từ nguồn BTC trong lượt này.

Tin nhắn ngắn nếu lịch chính thức vẫn chưa rõ:

> Dạ anh cho em xác nhận thêm giờ đóng cổng theo giờ Việt Nam và mình chỉ nộp trên team1vn.xyz hay cần thêm Builder Hub ạ? Nếu đã có lịch công bố top 10 và địa điểm chung kết thì anh cho em xin thông tin để em sắp xếp ạ.

## 7. Tin nhắn cho thành viên nhóm cũ

Mẫu tự gửi, điều chỉnh đúng các phần được dùng và phạm vi chia sẻ repo:

> Mình muốn phát triển thêm HomeStayDorm để thi UniHack solo. BTC đã cho phép dùng project cũ. Mình sẽ dùng lại các phần [liệt kê], thêm chức năng xác nhận bàn giao/đối soát trên Avalanche và demo/chia sẻ repo [public hay private cho giám khảo].
>
> Mình sẽ ghi đúng đóng góp của từng người và phần làm thêm. Các bạn có đồng ý cho mình sử dụng, chỉnh sửa và trình diễn các phần trên không? Nếu cần giới hạn phần nào thì nói giúp mình để thống nhất nhé.

Đồng ý dùng cho cuộc thi không mặc nhiên là đồng ý cho mọi hình thức sử dụng về sau.

## 8. Nghiệm thu và demo

### Điều kiện hoàn thành bản thi

- Một chi nhánh, ba vai trò quản lý–kế toán–khách; dữ liệu mẫu có thể khởi tạo lại.
- Người thuê xác nhận trong app, không phải cài ví ngoài hoặc tự chuẩn bị gas; ví và phương thức khôi phục đã thử đúng với SDK lựa chọn.
- Luồng bàn giao → đối soát v1 → phản đối → v2 → chấp nhận → kiểm chứng chạy trên Fuji.
- Khách nhận bằng chứng ngay trong quá trình xác nhận, mở lại được dù không gọi API tài liệu của bên quản lý.
- Contract verify được mã nguồn, địa chỉ/ABI/UI thống nhất; README hướng dẫn dựng và chạy bản demo.
- UI thể hiện đúng khi người dùng từ chối, chữ ký hết hạn, relayer/chain/SQL lỗi. Không báo đã xác nhận chỉ vì người dùng đã bấm nút.
- Test bàn giao D-009: nhân viên lập và phát hành; sinh viên xem đúng tài liệu và ảnh, yêu cầu sửa rồi ký bản mới; email link chỉ mở hồ sơ sau đăng nhập; người khác không đọc/ký hộ; bản cũ không ký được; giao chìa khóa không tự đổi trạng thái on-chain.

### Các kiểm thử cần giữ/thêm khi triển khai

- Quyền của cả ba vai trò, sai người ký, replay, hết hạn, sai loại hành động, sai chain/contract, sai phiên bản/hash, lý do phản đối bị thay.
- Không bỏ test phân quyền đường giao dịch trực tiếp nếu vẫn giữ nó. Backend/nhân viên không thể tự xác nhận thay khách.
- Hồ sơ trùng, hành động sai thứ tự, phiên bản đã chấp nhận không bị sửa. Không có chữ ký mới thì không tự chuyển sang “đã đồng ý”.
- Hoàn/thu thêm/bằng 0; tổng từng khoản khớp tổng trừ; quy tắc làm tròn khớp calculator.
- Tải bundle rồi sửa tài liệu, đổi một con số, thiếu ảnh/salt hoặc sai deployment: Verify chỉ ra không khớp/thiếu dữ liệu; không gọi API quản lý để lấy bản gốc.
- Relayer gửi lặp, không đủ gas, timeout; chain thành công nhưng SQL chưa cập nhật: đọc lại receipt/event phục hồi đúng một lần.
- Thử khóa ví/đăng nhập lại/khôi phục theo phương án chọn; không âm thầm gán địa chỉ mới làm chủ hồ sơ cũ.
- Chỉ khi làm simulator mới thêm kiểm tra callback sai số tiền và callback gửi lặp.

Đây là tiêu chí cần đạt cho phiên bản tiếp theo; kiểm thử local đã có không chứng minh các chức năng chưa viết.

### Kịch bản demo 2–3 phút

1. 0–30 giây: giới thiệu HomeStayDorm và vấn đề vết rách nệm bị tính phí dù đã có trước; thông báo Fuji, dữ liệu thử và phần mô phỏng nếu dùng.
2. Mở bản bàn giao đã xác nhận và đã lưu vào máy khách: ghi nhận vết rách, cọc 3.000.000 VND giả lập, hợp đồng đủ hạn.
3. Đối soát v1 trừ 500.000 VND khoản khác và 400.000 VND cho vết rách. Khách phản đối. Con người xem hồ sơ, kế toán lập v2 bỏ 400.000 VND; khách xem bản tiền hoàn 2.500.000 VND, lưu bản sao và bấm “Xác nhận đối soát”.
4. Hiển thị app đã ghi nhận trên Avalanche. Dùng file khách giữ kiểm chứng; sửa một khoản để Verify báo lệch; mở explorer và source contract.
5. Nói rõ: chain kiểm tra phiên bản và chữ ký, không xác định nệm có rách thật, không chuyển tiền hoàn hay thay hợp đồng thuê. Không kết luận hiệu lực pháp lý của chữ ký khi chưa được đánh giá.

Cổng thanh toán mô phỏng chỉ xuất hiện thêm nếu hoàn thiện sớm; demo chính vẫn kết thúc trọn vẹn ở việc hai bên thống nhất và kiểm chứng đối soát. Nêu rõ ảnh/hồ sơ hay giao dịch nào đã chuẩn bị trước.

## 9. Thứ tự thực hiện và mốc nội bộ

**Việc Vy giao ngày 11/11 (J-X058):** tạm dừng UI, làm lần lượt A1 (`chore/fuji-setup`) rồi C1 (`feat/t22-handover-bundle`), hai worktree/nhánh riêng từ `origin/chore/audit-cleanup`. A1 chuẩn bị ba ví vận hành và script chia AVAX thử; chưa deploy. Sau A1 báo địa chỉ deployer để Vy xin faucet; C1 không sửa contract và không tự chạy SQL trên HOMEDORM4. Yêu cầu này chỉ chốt hai việc đang làm, không mặc định phê duyệt toàn bộ lịch đề xuất dưới đây.

**Tiếp A2 ngày 11/11 (J-X067):** Vy cho tiếp tục code trong lúc thao tác ví. Nhánh `chore/fuji-deploy` từ main đã merge tích hợp (`3725840`); nạp đủ 0,1 AVAX mỗi ví phụ và bỏ qua ví đủ tiền theo `spec/viec-cho-agent.md`. Code deploy/verify source và kiểm tra tự động đã chuẩn bị; deployer mới nhận 0,05 AVAX, hai ví phụ chưa có tiền. Chưa gửi funding/deploy, chưa verify thật, chưa đổi env đang chạy. Bước kế nạp thêm vào deployer → funding → deploy → Sourcify exact match → cấu hình app/đọc chain → A3. Hướng dẫn và lệnh khác worktree trong `blockchain/README.md`.

**Kết quả A2 ngày 11/11 (J-X068):** Vy gửi thêm 0,3 AVAX; đã nạp hai ví phụ 0,1 mỗi ví và deploy contract `0x70bF83f4742BEE4093Aa51622b0BCb53Ed91389C` trên Fuji, block 60882820. Sourcify xác nhận creation/runtime exact match; manifest công khai `blockchain/deployments/fuji.json`. Đã đọc lại vai trò, build frontend với địa chỉ thật và kiểm route config bằng env A2. Env và backup local-chain nằm riêng trong worktree A2, không commit; chưa restart server đầy đủ/chạy SQL hoặc nghiệm thu người thuê/OTP/SMTP. A3 là việc tiếp theo, không coi ba giao dịch hạ tầng này là năm giao dịch demo nghiệp vụ.

**C4 / D-041 (12/11, Vy chốt):** giao Codex triển khai `feat/t22-auto-liquidation` trong `D:\HomeStayDorm-c4` khi chờ A3/lịch xem. Mọi nhánh đóng hợp đồng, kể cả không có xác nhận của khách, phải đủ thu/hoàn và chứng từ; thiếu thì khóa nút, hiện khoản thiếu. Thu chìa khóa/nhả phòng là bước riêng, không phụ thuộc đóng hợp đồng. Giữ D-031 không mốc chuỗi 3; migration C4 phải xin riêng khi code/test sẵn sàng. Chưa triển khai hoặc chạy SQL C4 ở mốc ghi quyết định này.

**Gỡ A3-01 bằng C5-a (J-X070, Vy giao lại Codex ở J-C067):** Sale tự ghi Đã xem / Khách không đến theo D-026, bỏ tự đánh dấu ở JS/scheduler/SP và không ghi đè kết quả đã chốt. Code/test trên `fix/c5a-viewing-status` từ main `0b42fb2`; backend 45 qua/2 bỏ qua, blockchain 25 qua/1 bỏ qua, SQL tích hợp qua trên CSDL tạm riêng, build/smoke/ảnh 1440–390 qua. Migration HOMEDORM4 đã chạy sau khi Vy cho phép (J-X071, 12/11): 8 SP không còn khối tự đánh dấu, SP/ràng buộc đúng, số dòng/checksum ba bảng lịch/đăng ký/cọc khớp trước–sau. Chờ Vy merge PR #9 rồi restart backend cũ trước khi tiếp A3. Không nới ngày/giờ hoặc sửa dữ liệu để đi tắt. Không coi phần giữ chỗ/Không thuê nữa/chặn lịch thứ hai còn lại của C5 là đã xong. Hướng dẫn ở `docs/cau-hinh.md`, phân công ở `spec/viec-cho-agent.md`.

> **Lịch hiện hành theo D-037 (Vy chốt 2026-11-11):** Fuji trước (11–12/11) → phần T-22 và giao diện nằm trên đường demo (13–15/11) → phần T-22 còn lại nếu kịp, dự phòng (16–17/11) → README, slide, video (18–19/11) → nộp 20/11, dự phòng 21/11. Bảng ngày, mức ưu tiên T-22 và trạng thái ở `spec/progress.md`; việc cho AI ở `spec/viec-cho-agent.md`. **Phần lịch của D-025 bên dưới là lịch sử**; các ràng buộc thiết kế của D-025 vẫn giữ. Bổ sung luồng theo D-038 (đường thoát khi khách im lặng, điều khoản xác nhận điện tử, ô đồng ý dữ liệu cá nhân): chi tiết ở `spec/luong-tong-hop.md`.

**Điều chỉnh Sale D-036 (11/11, J-X065):** theo phản hồi Vy, nền xanh dùng chung sidebar/nội dung, Tra cứu chỉ tìm/xem khách; bỏ lối Trả phòng của Sale. Các việc bắt buộc theo D-023/D-026 giữ ở ngữ cảnh liên quan (tiếp nhận trong lịch/tổng quan, cọc trong tổng quan, nhập hộ trong hợp đồng). Làm lại danh sách đầu vào hợp đồng theo bố cục mẫu, giữ quy tắc và API; không tạo bản nháp giả, không chạy SQL. Thay cách tổ chức D-035, không thay nghiệp vụ đã chốt.

**Xác nhận lịch khách D-045 (14/11, J-X081):** thêm xác nhận đúng phiên bản và reset khi Sale đổi giờ; Sale chỉ ghi kết quả buổi xem sau khi khách xác nhận (Vy đã chốt). Làm lại trang lịch khách theo ảnh, tự viết React/CSS token. Nhánh `feat/customer-viewing-confirmation` từ main; chuẩn bị migration chạy lại được và kiểm quyền/chống xác nhận nhầm phiên bản/đồng thời. Hỏi Vy trước khi chạy HOMEDORM4; chưa coi phần này là nghiệm thu A3/Fuji.

J-X082: code D-045 và kiểm tự động/SQL tạm đã qua; chờ Vy cho chạy migration mới trên HOMEDORM4 rồi khách nghiệm thu. Một bản xem `localhost:5199` chứa thêm các sửa UI Codex đã làm ở J-X079/J-X080 (khung phòng, bố cục lịch Sale), không merge code Claude chưa duyệt hoặc main. Nguồn/lệnh SQL và trạng thái duyệt nằm ở `docs/cau-hinh.md` và `spec/progress.md`.

**Đợt Sale D-035 (11/11, J-X063):** Vy cho sửa Sale trước theo bố cục mẫu Hằng: menu 5 mục, tổng quan, lịch tháng và form lập lịch; bỏ mục kiểm tra phòng/giường và tab cư trú riêng, giữ nhập hộ trong Tra cứu khách hàng. Nghiệp vụ hồ sơ/cọc/trả phòng vẫn có lối truy cập. Nhánh `feat/ui-sale-workspace` từ `origin/main` (`dcc1a59`), worktree riêng; không tự merge/push main. Phạm vi này không làm khách tự khai cư trú hoặc thay backend/SQL/quyền/luồng D-026; phần đó tiếp tục ở đợt nghiệp vụ tương ứng.

**Lịch hiện hành theo D-025 (Vy chốt 2026-11-10 00:47 +07:00): làm giao diện trước Fuji.** Lịch này thay bảng mốc cũ tại mục này và phần lịch 15 ngày của D-019; không thay scope nghiệp vụ hoặc coi kiểm thử local là kết quả Fuji. Đây là lịch nội bộ của Vy, không phải xác minh lại hạn BTC.

| Mốc | Đầu ra |
|---|---|
| 10–11/11 | T-21 giao diện đợt 1: tokens sage/nâu gỗ; tiêu đề Lexend, nội dung Inter; component và lớp dùng chung; khung mọi vai trò, trang chủ và đăng nhập. Giữ luồng/API/SP/dữ liệu/route/props/class/id cũ, không đổi ký/verify. CSS thường, không thêm UI library, tự viết. Ảnh trước/sau 1440px và 390px, menu nhân viên thu gọn được; build frontend và test backend. Nhánh `feat/ui-refresh-1` từ main đã chứa T-20; chỉ push nhánh để Vy duyệt. |
| 12–13/11 | Giao diện đợt 2: rà nội dung từng tab, form/modal/bảng dài và dữ liệu demo; xử lý danh sách còn lại của T-21. **Hạn chót giao diện 13/11.** Chỉ đổi giao diện, không đổi luồng. |
| 14–17/11 | Fuji: deploy + verify source; thử Privy/HTTP/SQL/SMTP và trọn luồng ba vai trò, bằng chứng/Verify, receipt/event và phục hồi lỗi. Ghi tx/kết quả thật, không suy từ ảnh mock. |
| 18–20/11 | Hồ sơ và nộp: setup từ đầu, README/ghi công, slide/video, kiểm tra link và bằng chứng Fuji. Mục tiêu hoàn tất nộp trong khoảng này, không coi 21/11 là ngày dự phòng mặc định. |

Kết quả T-21 và danh sách đợt 2 nằm ở `spec/progress.md` / J-045: ưu tiên trạng thái rỗng lặp ở Quản lý/Kế toán, màu inline trong modal/form/badge của các tab Sale/Quản lý/Kế toán/khách, bảng dài và form với dữ liệu demo; rà các tab Admin/khách chưa được chụp chi tiết. Ảnh khung dùng API giả không thay nghiệm thu tài khoản thật.

**Bổ sung D-032 / J-054:** Vy chọn `D:\Nam4\Contest\Homestay-Dorm` làm mẫu cho quy tắc icon/form/modal. T-21 bổ sung lớp quy chuẩn CSS tự viết, icon SVG sẵn có, form khách vãng lai và đăng nhập/đăng ký, trình bày form Admin; kiểm ảnh và thao tác form ở 1440px/390px. Quy chuẩn cụ thể và mức áp dụng ở `spec/scope.md`; giữ native controls và handler/validation, không chép code/asset, không chuyển sang stack hoặc nghiệp vụ của dự án mẫu. Đợt 2 tiếp tục áp dụng vào các form chuyên biệt chưa rà; lịch D-025 giữ nguyên.

**Bổ sung D-033 / J-056:** đồng bộ danh sách theo ảnh Vy gửi: thẻ tổng quan dùng số đếm sẵn có, thanh tìm kiếm dạng viên kèm bộ lọc, bảng riêng. Áp dụng qua `OverviewCards` và CSS chung cho Sale/Quản lý/Kế toán/Admin; giữ các bộ chọn ngày và toàn bộ tìm kiếm/lọc hiện hành. Kiểm tra 22 màn/tab ở 1440px/390px, có ca dữ liệu giả xác minh số đếm, tìm kiếm và lọc trạng thái. Phần này vẫn là T-21/UI, không thực hiện thay đổi nghiệp vụ T-22 hay đổi lịch.

Nếu thử ví nhúng/relayer chưa đạt, ưu tiên sửa lát cắt nhỏ này và cắt simulator/point trước. Ví giao dịch trực tiếp trên Fuji có thể dùng kiểm thử nội bộ trong lúc phát triển, nhưng chưa đạt mục tiêu UX nộp bài. Không âm thầm coi fallback là chức năng đã hoàn thành.

Các phụ thuộc còn lại: chốt nghiệp vụ cọc với Vy; quyền truy cập SQL/dữ liệu mẫu; chọn và cấu hình SDK ví; kết nối RPC/nguồn AVAX thử cho relayer/deploy. Không yêu cầu Vy gửi khóa bí mật qua chat.

## 10. Nhật ký và quyết định so với bản Claude mới

- 04/11: Vy xác nhận nền Web2 chạy tốt, gửi repo từ local và làm rõ mình thực hiện phần lớn; ghi nhận đóng góp còn lại từ thành viên nhóm.
- 04/11: BTC xác nhận solo/dùng project cũ, README và hướng tích hợp phù hợp; các gợi ý ví/point/MoMo được ghi nhận là đề xuất.
- 04/11: Đã có nền contract/adapter/Verify local. Đây chưa phải luồng hoàn chỉnh trên Fuji.
- 04/11, bản hợp nhất: đưa ví trong app + app trả gas vào mục tiêu MVP. Thực hiện thử nghiệm sớm để chọn SDK và cách giữ/khôi phục khóa; không mặc định ví tự chế với PIN ngắn.
- 04/11, bản hợp nhất: đưa việc tải bằng chứng vào chính bước xác nhận, tính hash từ nội dung hiển thị ở trình duyệt; xử lý trạng thái trước/sau receipt.
- 04/11, bản hợp nhất: bỏ khai báo/xác nhận tiền và thời điểm báo trước khỏi scope on-chain MVP; giữ quy trình tiền ở Web2.
- 04/11, bản hợp nhất: simulator thanh toán là tùy chọn sau nghiệm thu; chưa làm token point để tập trung một use case.
- 04/11, bản hợp nhất: chưa ghi “BTC chấm toàn bộ sản phẩm” hoặc lịch workshop/office hours thành sự thật khi thiếu nguồn trực tiếp. Hai tiêu chí kỹ thuật/tích hợp vẫn được ưu tiên.
