// Báo lỗi biến CSS dùng mà không được khai báo ở đâu trong src (vd var(--space-5) khi tokens.css chỉ có --space-4 và --space-6).
// Biến không khai báo làm thuộc tính bị bỏ qua (padding thành 0, màu mất), nên giao diện bị dính sát hoặc mất màu mà không có lỗi build.
// Chạy: npm run check:ui-tokens. Biến có giá trị dự phòng var(--x, ...) được bỏ qua.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(css|jsx?|html)$/.test(name)) files.push(full);
  }
})(root);

const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const declared = new Set();
for (const content of text.values()) for (const m of content.matchAll(/(?<![\w-])(--[a-zA-Z0-9-]+)\s*:/g)) declared.add(m[1]);
for (const content of text.values()) for (const m of content.matchAll(/setProperty\(\s*['"`](--[a-zA-Z0-9-]+)/g)) declared.add(m[1]);

const problems = [];
for (const [file, content] of text) {
  content.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g)) {
      if (!declared.has(m[1])) problems.push(`${relative(root, file)}:${i + 1}  ${m[1]}`);
    }
  });
}
if (problems.length) {
  console.error(`Có ${problems.length} chỗ dùng biến CSS chưa khai báo:\n` + problems.join('\n'));
  process.exit(1);
}
console.log('OK: mọi var(--...) đều đã khai báo.');
