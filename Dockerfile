# Một image cho cả giao diện và backend (Azure App Service for Containers). Build bằng: az acr build -r <acr> -t homestaydorm:latest .
FROM node:24-slim AS web
COPY blockchain /src/blockchain
RUN cd /src/blockchain && npm install --omit=dev --no-audit --no-fund
WORKDIR /src/web/frontend
COPY web/frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY web/frontend ./
# Giao diện gọi API cùng địa chỉ (/api); các biến VITE_ công khai khác (Privy app id, Avalanche) lấy từ web/frontend/.env.
ENV VITE_API_URL=/api
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY blockchain/package*.json blockchain/
RUN cd blockchain && npm install --omit=dev --no-audit --no-fund
COPY blockchain blockchain
COPY web/backend/package*.json web/backend/
RUN cd web/backend && npm install --omit=dev --omit=optional --no-audit --no-fund
COPY web/backend web/backend
COPY --from=web /src/web/frontend/dist web/frontend/dist
WORKDIR /app/web/backend
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.js"]
