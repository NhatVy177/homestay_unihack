import { createPublicClient, decodeEventLog, http } from 'viem';
import { abi } from '@homestaydorm/settlement/abi';

// Số liệu công khai cho trang chủ, lấy từ BIÊN LAI GIAO DỊCH TRÊN CHUỖI, không lấy từ số liệu tự khai của bên cho thuê.
// RPC công khai của Fuji chỉ cho đọc nhật ký trong 100 khối mỗi lần nên không quét cả chuỗi được. Cách làm: cơ sở dữ liệu chỉ cung cấp
// DANH SÁCH mã giao dịch; mỗi mã được đọc lại biên lai từ chuỗi, chỉ giữ các sự kiện do đúng contract này phát ra và giải mã.
// Mã giả hoặc đã bị xóa khỏi cơ sở dữ liệu không làm tăng số liệu (không có sự kiện hợp lệ thì không được tính).
// Chỉ có số đếm, số tiền gộp và mã giao dịch; không có tên, CCCD hay nội dung biên bản.
const TYPES = {
  HandoverProposed: 'Bàn giao phòng được phát hành',
  HandoverAccepted: 'Khách xác nhận biên bản bàn giao',
  SettlementProposed: 'Đối soát tiền cọc được gửi cho khách',
  SettlementDisputed: 'Khách phản hồi bản đối soát',
  SettlementAccepted: 'Khách đồng ý đối soát tiền cọc',
};

export function summarize(events) {
  const count = (name) => events.filter((e) => e.name === name).length;
  const proposed = new Map(events.filter((e) => e.name === 'SettlementProposed').map((e) => [`${e.args.agreementId}:${e.args.version}`, e.args]));
  const accepted = events.filter((e) => e.name === 'SettlementAccepted');
  const disputedAgreements = new Set(events.filter((e) => e.name === 'SettlementDisputed').map((e) => e.args.agreementId));
  let refundVnd = 0n, topUpVnd = 0n;
  for (const e of accepted) {
    const p = proposed.get(`${e.args.agreementId}:${e.args.version}`);
    if (p) { refundVnd += BigInt(p.refundDue); topUpVnd += BigInt(p.topUpDue); }
  }
  const acceptedAgreements = new Set(accepted.map((e) => e.args.agreementId));
  return {
    handoversPublished: count('HandoverProposed'),
    handoversConfirmed: count('HandoverAccepted'),
    settlementsSent: new Set(events.filter((e) => e.name === 'SettlementProposed').map((e) => e.args.agreementId)).size,
    settlementsAccepted: acceptedAgreements.size,
    acceptedWithoutDispute: [...acceptedAgreements].filter((id) => !disputedAgreements.has(id)).length,
    disputes: count('SettlementDisputed'),
    refundVnd: refundVnd.toString(),
    topUpVnd: topUpVnd.toString(),
  };
}

export function createStatsReader({ client, address, listHashes, now = () => Date.now(), staleMs = 60 * 1000 }) {
  const byHash = new Map(); // mã giao dịch đã đọc xong -> các sự kiện hợp lệ của nó
  const stamps = new Map();
  let updatedAt = null, running = null;

  async function readReceipt(hash) {
    const receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
    if (!receipt || receipt.status !== 'success') return null; // chưa có biên lai (hoặc thất bại): thử lại lần sau
    return receipt.logs.filter((log) => String(log.address).toLowerCase() === String(address).toLowerCase()).flatMap((log) => {
      try {
        const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
        return TYPES[decoded.eventName] ? [{ name: decoded.eventName, args: decoded.args, blockNumber: log.blockNumber, logIndex: log.logIndex, hash }] : [];
      } catch { return []; }
    });
  }

  async function sync() {
    const hashes = [...new Set((await listHashes()).map((h) => String(h).toLowerCase()))].filter((h) => /^0x[0-9a-f]{64}$/.test(h));
    const fresh = hashes.filter((h) => !byHash.has(h));
    const results = await Promise.all(fresh.map(async (h) => [h, await readReceipt(h)]));
    for (const [h, events] of results) if (events) byHash.set(h, events);
    updatedAt = now();
  }

  function refresh() {
    running ||= sync().catch(() => {}).finally(() => { running = null; });
    return running;
  }

  async function timestamp(blockNumber) {
    const key = blockNumber.toString();
    if (!stamps.has(key)) stamps.set(key, Number((await client.getBlock({ blockNumber })).timestamp) * 1000);
    return stamps.get(key);
  }

  return {
    refresh,
    async snapshot({ recent = 6 } = {}) {
      if (updatedAt === null) await refresh();
      else if (now() - updatedAt > staleMs) refresh(); // làm mới ở nền, vẫn trả số liệu đang có
      if (updatedAt === null) return { ready: false };
      const events = [...byHash.values()].flat();
      const latest = [...events].sort((a, b) => (a.blockNumber === b.blockNumber ? Number(b.logIndex - a.logIndex) : Number(b.blockNumber - a.blockNumber))).slice(0, recent);
      const items = await Promise.all(latest.map(async (e) => ({
        type: e.name, label: TYPES[e.name], hash: e.hash, blockNumber: e.blockNumber.toString(),
        at: await timestamp(e.blockNumber).then((ms) => new Date(ms).toISOString()).catch(() => null),
      })));
      return { ready: true, updatedAt: new Date(updatedAt).toISOString(), transactions: byHash.size, ...summarize(events), recent: items };
    },
  };
}

// Danh sách mã giao dịch lấy từ các hồ sơ xác nhận đã lưu (chỉ để biết cần đọc biên lai nào).
// Chỉ lấy các đối tượng biên lai (có hash và số khối), bỏ qua mã băm nội dung và giao dịch chưa được xác nhận.
export async function hashesFromCases(query) {
  const rows = (await query('SELECT Data FROM dbo.AvalancheCase')).recordset || [];
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(node.hash) && node.blockNumber !== undefined) found.push(node.hash);
    for (const value of Object.values(node)) walk(value);
  };
  for (const row of rows) { try { walk(JSON.parse(row.Data || '{}')); } catch { /* hồ sơ hỏng thì bỏ qua */ } }
  return found;
}

let shared;
export function sharedStatsReader(env = process.env, { query } = {}) {
  if (shared !== undefined) return shared;
  const address = env.AVALANCHE_CONTRACT_ADDRESS;
  if (env.AVALANCHE_ENABLED !== 'true' || !address || !query) return (shared = null);
  const rpc = env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
  shared = createStatsReader({ client: createPublicClient({ transport: http(rpc) }), address, listHashes: () => hashesFromCases(query) });
  return shared;
}
