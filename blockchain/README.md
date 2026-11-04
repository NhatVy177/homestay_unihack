# Blockchain — HomeStayDorm

Module riêng trong cùng repository, dành cho xác nhận bàn giao và đối soát trên Avalanche. Web React/Express tiếp tục nằm trong `web/`; không cần một server blockchain hay repo thứ hai.

**Trạng thái:** khung thư mục, chưa có smart contract, ABI, công cụ compile/deploy hoặc tích hợp chạy thật. Các thư mục trống được giữ bằng `.gitkeep`. Nền ở `homedorm/feature/avalanche-settlement` trong handoff chưa được nhập về; kiểm tra lại trước khi tái sử dụng. Không có địa chỉ deployment Fuji ở đây.

## Cấu trúc và trách nhiệm

```text
blockchain/
├─ contracts/       # Source Solidity (DormSettlement khi nhập/triển khai)
├─ test/            # Test contract và mã thuần dùng chung
├─ scripts/         # Compile, export ABI, chạy chain local, deploy, verify source
├─ src/             # Mã JS thuần dùng chung: snapshot, hash, typed data, evidence
│  └─ abi/          # ABI được xuất từ contract đã compile
├─ deployments/     # Hồ sơ deployment công khai đã xác minh, phân theo mạng
├─ package.json     # Package riêng; hiện chưa chọn/cài toolchain
└─ .gitignore       # Bỏ qua output và dữ liệu local
```

| Phần | Nơi đặt | Ranh giới |
|---|---|---|
| Contract, test, compile/deploy | `blockchain/` | Không phụ thuộc React, Express hoặc SQL Server; deploy không chạy khi bật web. |
| ABI, canonical snapshot, hash/evidence và typed data | `blockchain/src/` | Browser và Node cùng dùng một định nghĩa; không import backend, SQL, khóa riêng, `process.env`, filesystem hay SDK ví UI. ABI được sinh từ build, không sửa tay. |
| Ví nhúng, ký, tải file bằng chứng, đọc chain | [web/frontend/src/lib/avalanche/](../web/frontend/src/lib/avalanche/README.md) | Chạy trong browser; component/page gọi các hàm này. Trang Verify vẫn thuộc frontend. |
| Adapter từ nghiệp vụ, relayer, đối chiếu receipt/event | [web/backend/integrations/avalanche/](../web/backend/integrations/avalanche/README.md) | Chạy ở server; dùng calculator/repository hiện có, quản lý khóa relayer và quyền gửi. |
| Schema, dữ liệu, migration lưu liên kết giao dịch | `database/` | SQL vẫn ở đây; không đưa nghiệp vụ SQL vào contract/shared code. |

Chiều phụ thuộc khi triển khai: **frontend → mã dùng chung**, **backend → mã dùng chung**; shared không import ngược web. Service nghiệp vụ gọi adapter backend, adapter không được import controller/router. Không có import runtime nào được nối trong đợt dựng khung.

`package.json` khai báo module private độc lập để bổ sung dependencies/toolchain sau. Chưa cấu hình npm workspaces, package exports hay dependency `file:` trong web. Chọn cách tiêu thụ shared package và kiểm tra build/deploy hai app khi thực sự thêm mã dùng chung; không import chéo bằng đường dẫn chưa tồn tại.

## Quy ước build và deployment khi triển khai

- Rà toolchain nhánh Avalanche cũ trước khi chọn tiếp; không mặc định chuyển sang Foundry chỉ vì Senpai dùng Foundry. Chưa có lệnh `npm test`, `compile` hay `deploy` ở package này.
- Khi thêm toolchain, khóa dependencies bằng lockfile và thêm lệnh compile/test/export/deploy có kiểm tra lỗi. Compile → export ABI vào `src/abi/`; output đầy đủ/bytecode ở artifacts hoặc output toolchain, không đưa bộ deploy vào frontend.
- Deployment public ghi chain ID, contract address, transaction hash, block, commit nguồn và phiên bản ABI/source verification; chỉ ghi sau khi đối chiếu receipt và mạng. Không tạo address/tx mẫu trông như deployment thật.
- `deployments/local/` bị ignore; bản deployment Fuji đã xác minh có thể commit. Giữ bí mật deploy trong môi trường riêng của toolchain; runtime relayer dùng môi trường backend. Không biến private key thành biến `VITE_*` hoặc export qua shared.
- Nghiệm thu MVP vẫn theo [scope](../spec/scope.md) và [plan](../hackathon/plan.md). Việc có folder/package không chứng minh F-01–F-09 đã hoàn thành.

## Căn cứ từ Senpai

Đọc bản local `D:\Nam4\Contest\senpai` tại commit `cde33571a348c26bae614f11aa31b32487cbc285` ngày 05/11/2026. Đây là nhận xét từ code, chưa chạy Senpai hoặc xác minh deployment của nó.

- `web/contracts/src/MiuCoin.sol` và `foundry.toml`: contract/toolchain riêng; Foundry dùng OpenZeppelin trong `web/node_modules`.
- `web/scripts/export-artifact.mjs`: xuất ABI + bytecode để script deploy/server sử dụng.
- `web/lib/vault.ts`, `pay.ts`: tạo/mở ví và ký phía trình duyệt.
- `web/lib/relayer.ts`, `app/api/session/route.ts`: phần server xác thực yêu cầu rồi gửi giao dịch trả gas; relayer có `server-only`.

HomeStayDorm học cách phân chia các trách nhiệm trên. Senpai dùng token MIU/EIP-3009/x402 để trả tiền phiên; HomeStayDorm cần ký bàn giao/đối soát theo scope hiện tại. Chưa chọn mô hình ví tự tạo bằng mật khẩu của Senpai: README của nó nêu quên mật khẩu mất ví, còn kế hoạch của mình yêu cầu thử phương án khôi phục.

Không sao chép mã Senpai trong đợt này. Nếu dùng mã của nó sau này, giữ thông báo MIT/bản quyền tương ứng. Xem quyết định D-008 và nhật ký J-004 trong `spec/`.
