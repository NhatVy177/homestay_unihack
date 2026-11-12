// Read-only proof collector. Inputs are six public hashes, never a key or session token.
import { createPublicClient, decodeEventLog, decodeFunctionData, formatEther, getAddress, http, zeroHash } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { abi } from '../src/abi.js';

export class ReceiptError extends Error {}
const steps = [
  ['Ghi biên bản', 'HandoverProposed', 'proposeHandover', 'manager', null, null],
  ['Khách xác nhận', 'HandoverAccepted', 'confirm', 'relayer', 0, 1],
  ['Đối soát v1', 'SettlementProposed', 'proposeSettlement', 'accountant', 1, null],
  ['Khách phản đối v1', 'SettlementDisputed', 'confirm', 'relayer', 1, 3],
  ['Đối soát v2', 'SettlementProposed', 'proposeSettlement', 'accountant', 2, null],
  ['Khách đồng ý v2', 'SettlementAccepted', 'confirm', 'relayer', 2, 2],
];
const sameAddress = (a, b) => getAddress(a) === getAddress(b);

export async function collectReceipts({ client, manifest, hashes }) {
  if (manifest.chainId !== 43113 || await client.getChainId() !== 43113) throw new ReceiptError('Expected Fuji chain 43113.');
  if (hashes.length !== 6 || new Set(hashes.map(hash => hash.toLowerCase())).size !== 6
    || hashes.some(hash => !/^0x[0-9a-fA-F]{64}$/.test(hash))) throw new ReceiptError('Exactly six distinct transaction hashes are required.');
  const relayer = manifest.fundingTransactions?.find(item => item.role === 'relayer')?.address;
  if (!relayer) throw new ReceiptError('Relayer address is missing from the public deployment manifest.');
  const roles = { manager: manifest.manager, accountant: manifest.accountant, relayer };
  const rows = [];
  let agreementId, tenant, previous;
  for (let i = 0; i < steps.length; i++) {
    const [label, eventName, functionName, role, version, action] = steps[i];
    const hash = hashes[i];
    const [receipt, transaction] = await Promise.all([client.getTransactionReceipt({ hash }), client.getTransaction({ hash })]);
    if (receipt.status !== 'success' || !sameAddress(transaction.to, manifest.address) || !sameAddress(transaction.from, roles[role])) {
      throw new ReceiptError(`Step ${i + 1}: failed receipt, wrong contract or wrong operator.`);
    }
    if (previous && (receipt.blockNumber < previous.blockNumber || (receipt.blockNumber === previous.blockNumber && receipt.transactionIndex <= previous.transactionIndex))) {
      throw new ReceiptError('Transaction order does not match the six-step flow.');
    }
    const matches = receipt.logs.filter(log => sameAddress(log.address, manifest.address)).flatMap(log => {
      try { const value = decodeEventLog({ abi, data: log.data, topics: log.topics }); return value.eventName === eventName ? [value] : []; }
      catch { return []; }
    });
    if (matches.length !== 1) throw new ReceiptError(`Step ${i + 1}: expected exactly one ${eventName} event.`);
    const event = matches[0];
    if (!agreementId) { agreementId = event.args.agreementId; tenant = event.args.tenant; }
    if (event.args.agreementId !== agreementId || (event.args.tenant && !sameAddress(event.args.tenant, tenant))) throw new ReceiptError('Events belong to different agreements or tenants.');
    if (version !== null && event.args.version !== undefined && Number(event.args.version) !== version) throw new ReceiptError('Wrong settlement version in event.');
    const call = decodeFunctionData({ abi, data: transaction.input });
    if (call.functionName !== functionName) throw new ReceiptError('Unexpected contract function.');
    if (action !== null && (Number(call.args[0].action) !== action || Number(call.args[0].version) !== version || call.args[0].agreementId !== agreementId)) {
      throw new ReceiptError('Confirmation action/version/agreement does not match the expected step.');
    }
    if (typeof receipt.gasUsed !== 'bigint' || typeof receipt.effectiveGasPrice !== 'bigint') throw new ReceiptError('RPC omitted measured gas fields.');
    const feeWei = receipt.gasUsed * receipt.effectiveGasPrice;
    rows.push({ number: i + 1, label, event: eventName, version, action, hash, explorer: `https://testnet.snowtrace.io/tx/${hash}`,
      blockNumber: receipt.blockNumber.toString(), gasUsed: receipt.gasUsed.toString(), effectiveGasPriceWei: receipt.effectiveGasPrice.toString(), feeWei: feeWei.toString(), feeAvax: formatEther(feeWei) });
    previous = receipt;
  }
  const agreement = await client.readContract({ address: manifest.address, abi, functionName: 'getAgreement', args: [agreementId] });
  const [first, second] = await Promise.all([1, 2].map(version => client.readContract({ address: manifest.address, abi, functionName: 'getSettlement', args: [agreementId, version] })));
  if (Number(agreement.status) !== 5 || Number(agreement.latestVersion) !== 2 || !sameAddress(agreement.tenant, tenant)
    || first.accepted || !first.disputeHash || first.disputeHash === zeroHash || !second.accepted) {
    throw new ReceiptError('Final agreement must be Accepted v2, retaining the disputed v1.');
  }
  const totalFeeWei = rows.reduce((sum, row) => sum + BigInt(row.feeWei), 0n);
  return { recordedAt: new Date().toISOString(), chainId: 43113, contract: manifest.address, agreementId,
    finalStatus: 'Accepted', latestVersion: 2, transactions: rows, totalFeeWei: totalFeeWei.toString(), totalFeeAvax: formatEther(totalFeeWei) };
}

export function receiptTable(report) {
  return ['| # | Bước | Link explorer | Gas used | Phí AVAX |', '|---|---|---|---|---|',
    ...report.transactions.map(row => `| ${row.number} | ${row.label} | [${row.hash.slice(0, 10)}…](${row.explorer}) | ${row.gasUsed} | ${row.feeAvax} |`),
    `\nTổng phí thực đo của 6 giao dịch: **${report.totalFeeAvax} AVAX**.`].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] !== '--hashes' || !args[1] || (args.length !== 2 && !(args.length === 4 && args[2] === '--output'))) {
    throw new ReceiptError('Usage: fuji-e2e-receipts.mjs --hashes hash1,hash2,hash3,hash4,hash5,hash6 [--output report.json]');
  }
  const manifest = JSON.parse(await readFile(new URL('../deployments/fuji.json', import.meta.url), 'utf8'));
  const client = createPublicClient({ chain: avalancheFuji, transport: http(process.env.FUJI_RPC_URL || avalancheFuji.rpcUrls.default.http[0]) });
  const report = await collectReceipts({ client, manifest, hashes: args[1].split(',').map(value => value.trim()) });
  if (args[3]) await writeFile(resolve(args[3]), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(receiptTable(report));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof ReceiptError ? error.message : 'Receipt collection failed; no proof report was written. Check the RPC and hashes.'); process.exitCode = 1; });
}
