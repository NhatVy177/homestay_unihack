# HomeStayDorm

Hệ thống quản lý thuê phòng HomeStayDorm, được dùng làm nền tảng cho bài thi Team1 Vietnam UniHack 2026 và phần tích hợp Avalanche.

## Cấu trúc repository

```text
HomeStayDorm/
├─ database/       # Schema, seed data, stored procedures và trigger SQL Server
├─ blockchain/     # Khung riêng: contract, test, scripts, shared và deployment
├─ web/
│  ├─ backend/     # REST API Node.js + Express
│  ├─ frontend/    # React + Vite
│  └─ scripts/     # Công cụ hỗ trợ phân tích code
├─ hackathon/      # Bối cảnh, proposal và kế hoạch UniHack/Avalanche
├─ spec/           # Phạm vi, quyết định, tiến độ và nhật ký làm việc
├─ AGENTS.md       # Hướng dẫn AI đọc và cập nhật hồ sơ mỗi phiên
├─ run.bat         # Chạy nhanh trên Command Prompt
└─ run.ps1         # Chạy nhanh trên PowerShell
```

Phần Avalanche có [khung module riêng](blockchain/README.md), chưa có contract/toolchain chạy được. Ví/ký sẽ nằm ở `web/frontend/src/lib/avalanche/`; adapter/relayer sẽ nằm ở `web/backend/integrations/avalanche/`. Hai app tiếp tục dùng các lệnh chạy hiện tại; trạng thái thực tế theo [spec/progress.md](spec/progress.md).

## Chạy local

Yêu cầu: Node.js, npm và SQL Server đã được cấu hình theo `web/backend/.env.example`.

Trên Windows, chạy một trong hai lệnh tại thư mục gốc:

```powershell
.\run.ps1
```

hoặc:

```bat
run.bat
```

Có thể chạy riêng từng phần:

```powershell
cd web/backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Tài liệu UniHack

- [Bắt đầu cho Vy và AI tiếp nối](spec/README.md) — xem [tiến độ hiện tại](spec/progress.md) và [nhật ký có thời gian](spec/journal.md).
- [Tổng quan cuộc thi](hackathon/README.md)
- [Kế hoạch thực hiện](hackathon/plan.md)
- [Proposal](hackathon/Proposal.md)
- [Bối cảnh Avalanche](hackathon/Unihack_Context.md)
