import { decodeEventLog } from 'viem';
import { abi } from '@homestaydorm/settlement/abi';

// Khôi phục danh sách hồ sơ bàn giao/đối soát CHỈ từ chuỗi (không cần cơ sở dữ liệu), rồi đối chiếu với bảng AvalancheCase.
// Dùng để chứng minh: kể cả khi cơ sở dữ liệu của bên cho thuê mất hoặc bị sửa, biên bản khách đã xác nhận vẫn dựng lại được.
// Nguồn nhật ký: API kiểu Etherscan của Snowtrace/Routescan (RPC công khai Fuji chỉ cho đọc 100 khối mỗi lần).
// Chỉ đọc dữ liệu công khai của contract; không có tên, CCCD hay nội dung biên bản (trên chuỗi chỉ có mã băm và số tiền).
const DEFAULT_LOGS_API = 'https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api';

export async function fetchContractLogs({ address, fromBlock, logsApi = DEFAULT_LOGS_API, fetchImpl = fetch } = {}) {
  const url = `${logsApi}?module=logs&action=getLogs&address=${address}&fromBlock=${fromBlock}&toBlock=latest`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Không đọc được nhật ký chuỗi (HTTP ${response.status}).`);
  const body = await response.json();
  if (body.status !== '1' && !(Array.isArray(body.result) && body.result.length === 0)) throw new Error(`Không đọc được nhật ký chuỗi: ${body.message || 'lỗi không rõ'}.`);
  return Array.isArray(body.result) ? body.result : [];
}

export function decodeLogs(logs, address) {
  return logs.filter((log) => String(log.address).toLowerCase() === String(address).toLowerCase()).flatMap((log) => {
    try {
      const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
      return [{ name: decoded.eventName, args: decoded.args, blockNumber: BigInt(log.blockNumber), logIndex: Number(log.logIndex || 0), hash: log.transactionHash, at: log.timeStamp ? new Date(Number(log.timeStamp) * 1000).toISOString() : null }];
    } catch { return []; }
  }).sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : Number(a.blockNumber - b.blockNumber)));
}

// Gom sự kiện theo hồ sơ (agreementId): trạng thái bàn giao, phiên bản đối soát mới nhất và kết quả, số tiền hoàn/thu thêm.
export function rebuildAgreements(events) {
  const map = new Map();
  const get = (id) => {
    const key = String(id).toLowerCase();
    if (!map.has(key)) map.set(key, { agreementId: key, handover: 'chưa có', settlement: null, events: [] });
    return map.get(key);
  };
  for (const e of events) {
    if (!e.args?.agreementId) continue;
    const item = get(e.args.agreementId);
    item.events.push({ name: e.name, hash: e.hash, blockNumber: e.blockNumber.toString(), at: e.at });
    if (e.name === 'HandoverProposed' && item.handover === 'chưa có') item.handover = 'đã phát hành, chờ khách';
    if (e.name === 'HandoverAccepted') item.handover = 'khách đã xác nhận';
    if (e.name === 'SettlementProposed') item.settlement = { version: Number(e.args.version), status: 'chờ khách', refundDue: e.args.refundDue?.toString?.() ?? null, topUpDue: e.args.topUpDue?.toString?.() ?? null };
    if (e.name === 'SettlementDisputed' && item.settlement && Number(e.args.version) === item.settlement.version) item.settlement.status = 'khách phản hồi';
    if (e.name === 'SettlementAccepted' && item.settlement && Number(e.args.version) === item.settlement.version) item.settlement.status = 'khách đồng ý';
  }
  return [...map.values()];
}

// So danh sách dựng từ chuỗi với AvalancheCase (Id = agreementId). Không đọc nội dung biên bản.
export async function compareWithDatabase(agreements, query) {
  const rows = (await query('SELECT Id AS id, ContractId AS contractId FROM dbo.AvalancheCase')).recordset || [];
  const byId = new Map(rows.map((r) => [String(r.id).toLowerCase(), r.contractId]));
  const chainIds = new Set(agreements.map((a) => a.agreementId));
  return {
    agreements: agreements.map((a) => ({ ...a, contractId: byId.get(a.agreementId) || null, inDatabase: byId.has(a.agreementId) })),
    onlyOnChain: agreements.filter((a) => !byId.has(a.agreementId)).map((a) => a.agreementId),
    onlyInDatabase: rows.filter((r) => !chainIds.has(String(r.id).toLowerCase())).map((r) => r.contractId),
  };
}

export async function recoverFromChain({ env = process.env, query, fetchImpl = fetch } = {}) {
  const address = env.AVALANCHE_CONTRACT_ADDRESS;
  if (!address) throw new Error('Chưa cấu hình AVALANCHE_CONTRACT_ADDRESS.');
  const fromBlock = env.AVALANCHE_DEPLOY_BLOCK || env.AVALANCHE_START_BLOCK || '0';
  const logs = await fetchContractLogs({ address, fromBlock, logsApi: env.AVALANCHE_LOGS_API || DEFAULT_LOGS_API, fetchImpl });
  const agreements = rebuildAgreements(decodeLogs(logs, address));
  const result = query ? await compareWithDatabase(agreements, query) : { agreements, onlyOnChain: [], onlyInDatabase: [] };
  return { address, fromBlock: String(fromBlock), events: logs.length, ...result };
}
