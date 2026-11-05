// Tạo cặp khóa RS256 cho Privy JWT-based auth (D-011). Khóa riêng chỉ nằm trên máy chạy backend.
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../secrets/', import.meta.url));
const file = dir + 'privy-jwt-private.pem';
if (existsSync(file) && !process.argv.includes('--force')) {
  console.error('Đã có ' + file + '. Thêm --force nếu thật sự muốn tạo khóa mới (Privy cần cập nhật lại public key).');
  process.exit(1);
}
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
mkdirSync(dir, { recursive: true });
writeFileSync(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
console.log('Đã lưu khóa riêng: ' + file + ' (đã nằm trong .gitignore, không gửi cho ai).');
console.log('Thêm vào web/backend/.env:\n  PRIVY_JWT_PRIVATE_KEY_FILE=' + file.replace(/\\/g, '/'));
console.log('\nDán public key sau vào Privy Dashboard → User management → Authentication → JWT-based auth (Verification key):\n');
console.log(publicKey.export({ type: 'spki', format: 'pem' }));
console.log('JWT ID claim: sub. Nếu bật kiểm tra aud, đặt PRIVY_APP_ID trong .env trùng App ID.');
