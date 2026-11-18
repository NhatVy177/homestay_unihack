import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { recoverFromChain } from '../integrations/avalanche/recoverFromChain.js';

// npm run avalanche:recover — dựng lại danh sách bàn giao/đối soát chỉ từ chuỗi, rồi đối chiếu với AvalancheCase.
// Thêm --json để in toàn bộ kết quả; --no-db để không đọc cơ sở dữ liệu (chỉ chuỗi).
const here = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
async function deployBlock() {
  if (process.env.AVALANCHE_DEPLOY_BLOCK) return process.env.AVALANCHE_DEPLOY_BLOCK;
  try {
    const d = JSON.parse(await readFile(path.join(here, '../../../blockchain/deployments/fuji.json'), 'utf8'));
    if (String(d.address).toLowerCase() === String(process.env.AVALANCHE_CONTRACT_ADDRESS).toLowerCase()) return d.blockNumber;
  } catch { /* không có file triển khai thì đọc từ khối 0 */ }
  return '0';
}
const money = (v) => (v == null ? '' : `${Number(v).toLocaleString('vi-VN')}đ`);
const env = { ...process.env, AVALANCHE_DEPLOY_BLOCK: await deployBlock() };
const query = args.has('--no-db') ? undefined : (await import('../database/connection.js')).executeQuery;
const result = await recoverFromChain({ env, query });
if (args.has('--json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Contract ${result.address} · từ khối ${result.fromBlock} · ${result.events} sự kiện trên chuỗi\n`);
  for (const a of result.agreements) {
    const s = a.settlement ? `đối soát v${a.settlement.version}: ${a.settlement.status} (hoàn ${money(a.settlement.refundDue)}, thu thêm ${money(a.settlement.topUpDue)})` : 'chưa có đối soát';
    console.log(`- ${a.contractId || '(không có trong DB)'} · ${a.agreementId.slice(0, 10)}… · bàn giao: ${a.handover} · ${s} · ${a.events.length} giao dịch`);
  }
  if (query) console.log(`\nChỉ có trên chuỗi (DB thiếu): ${result.onlyOnChain.length ? result.onlyOnChain.join(', ') : 'không'}\nChỉ có trong DB (chưa lên chuỗi): ${result.onlyInDatabase.length ? result.onlyInDatabase.join(', ') : 'không'}`);
}
process.exit(0);
