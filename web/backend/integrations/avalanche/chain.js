import { createPublicClient, createWalletClient, defineChain, http, keccak256, decodeEventLog, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { abi as settlementAbi } from '@homestaydorm/settlement/abi';
const json = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v));
export function chainConfig() {
  const chainId = Number(process.env.AVALANCHE_CHAIN_ID || 43113);
  if (![31337, 43113].includes(chainId)) throw new Error('Chỉ hỗ trợ chain local/Fuji trong MVP.');
  return {
    chainId, address: process.env.AVALANCHE_CONTRACT_ADDRESS || '',
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
  };
}
export function makeChain(deployment, publicClient, wallets, abi = settlementAbi) {
  const read = (functionName, args) => publicClient.readContract({ address: deployment.address, abi, functionName, args });
  return {
    deployment, read, publicClient,
    async prepare(role, functionName, args, event, eventArgs) {
      if (await publicClient.getChainId() !== deployment.chainId) throw new Error('RPC sai mạng.');
      const wallet = wallets[role];
      if (!wallet) throw new Error('Chưa cấu hình khóa vận hành cho ' + role);
      if (role !== 'relayer' && (await read(role)).toLowerCase() !== wallet.account.address.toLowerCase()) throw new Error('Khóa vận hành không đúng vai trò contract.');
      await publicClient.simulateContract({ address: deployment.address, abi, functionName, args, account: wallet.account });
      const request = await wallet.prepareTransactionRequest({
        account: wallet.account, to: deployment.address, data: encodeFunctionData({ abi, functionName, args }),
      });
      if (request.gas > BigInt(process.env.AVALANCHE_MAX_GAS || '600000')) throw new Error('Giao dịch vượt giới hạn gas của ứng dụng.');
      const rawTransaction = await wallet.signTransaction(request);
      return json({ rawTransaction, hash: keccak256(rawTransaction), signer: wallet.account.address, event, eventArgs });
    },
    async settle(pending) {
      // Re-broadcast exactly the same signed bytes after restart/timeout.
      let receipt = await publicClient.getTransactionReceipt({ hash: pending.hash }).catch(() => null);
      if (!receipt) {
        try { await publicClient.sendRawTransaction({ serializedTransaction: pending.rawTransaction }); }
        catch (error) {
          const exists = await publicClient.getTransaction({ hash: pending.hash }).catch(() => null);
          if (!exists) throw error;
        }
        receipt = await publicClient.waitForTransactionReceipt({ hash: pending.hash, timeout: 45000 });
      }
      if (receipt.status !== 'success') return { failed: true, hash: pending.hash };
      const events = receipt.logs.filter(l => l.address.toLowerCase() === deployment.address.toLowerCase()).flatMap(log => {
        try { return [{ ...decodeEventLog({ abi, ...log }), logIndex: log.logIndex }]; } catch { return []; }
      });
      const match = events.find(e => e.eventName === pending.event && Object.entries(pending.eventArgs).every(([key, value]) =>
        String(e.args[key]).toLowerCase() === String(value).toLowerCase()));
      if (!match) throw new Error('Receipt không có sự kiện đúng hồ sơ/phiên bản.');
      return json({ hash: receipt.transactionHash, blockNumber: receipt.blockNumber, logIndex: match.logIndex });
    },
  };
}
let cached;
export function configuredChain() {
  if (cached) return cached;
  const deployment = chainConfig();
  const chain = defineChain({ id: deployment.chainId, name: 'HomeStayDorm test', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [deployment.rpcUrl] } } });
  const client = createPublicClient({ chain, transport: http(deployment.rpcUrl) });
  const wallets = Object.fromEntries(['manager', 'accountant', 'relayer'].flatMap(role => {
    const key = process.env['AVALANCHE_' + role.toUpperCase() + '_PRIVATE_KEY'];
    return key ? [[role, createWalletClient({ account: privateKeyToAccount(key), chain, transport: http(deployment.rpcUrl) })]] : [];
  }));
  cached = makeChain(deployment, client, wallets);
  return cached;
}
