import { createPublicClient, createWalletClient, defineChain, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { loyaltyAbi } from '@homestaydorm/settlement/loyalty';
import { chainConfig, makeChain } from '../avalanche/chain.js';
import { avalancheEnabled } from '../avalanche/index.js';

export function loyaltyDeployment() {
  if (process.env.LOYALTY_ENABLED !== 'true' || !avalancheEnabled()) return null;
  const base = chainConfig();
  const address = process.env.LOYALTY_CONTRACT_ADDRESS;
  const startDate = process.env.LOYALTY_START_DATE;
  if (!isAddress(address || '')
    || !/^\d{4}-\d{2}-\d{2}$/.test(startDate || '') || !process.env.LOYALTY_OPERATOR_PRIVATE_KEY) return null;
  const date = new Date(startDate);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== startDate) return null;
  return { ...base, address, startDate };
}

export function getLoyaltyChain(deployment) {
  const key = process.env.LOYALTY_OPERATOR_PRIVATE_KEY;
  const account = privateKeyToAccount(key);
  const sharedKey = ['MANAGER', 'ACCOUNTANT', 'RELAYER'].some(role =>
    process.env[`AVALANCHE_${role}_PRIVATE_KEY`]?.toLowerCase() === key.toLowerCase());
  if (sharedKey) throw new Error('Ví vận hành điểm thưởng cần dùng khóa riêng.');
  const chain = defineChain({
    id: deployment.chainId,
    name: 'HomeStayDorm test',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: { default: { http: [deployment.rpcUrl] } },
  });
  const publicClient = createPublicClient({ chain, transport: http() });
  const wallet = createWalletClient({ account, chain, transport: http() });
  return makeChain(deployment, publicClient, { relayer: wallet }, loyaltyAbi);
}
