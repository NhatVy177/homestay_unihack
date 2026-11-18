import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createPublicClient, createWalletClient, getContractAddress, http, isAddressEqual } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji, hardhat } from 'viem/chains';

const envPath = process.env.LOYALTY_DEPLOY_ENV || '.env';
if (process.env.LOYALTY_DEPLOY_ENV || existsSync(envPath)) process.loadEnvFile(envPath);
const key = process.env.LOYALTY_OPERATOR_PRIVATE_KEY;
if (!/^0x[0-9a-fA-F]{64}$/.test(key || '')) throw new Error('Cần LOYALTY_OPERATOR_PRIVATE_KEY hợp lệ.');
const chain = process.argv.includes('--local') ? hardhat : avalancheFuji;
const rpc = process.env.AVALANCHE_RPC_URL || (chain.id === 31337 ? 'http://127.0.0.1:8545' : undefined);
const account = privateKeyToAccount(key);
const client = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
if (await client.getChainId() !== chain.id) throw new Error('RPC sai mạng.');
const { abi, bytecode } = JSON.parse(await readFile(new URL('../artifacts/DormPoints.json', import.meta.url), 'utf8'));
const hash = await wallet.deployContract({ abi, bytecode, args: [account.address] });
console.log(JSON.stringify({ chainId: chain.id, hash, operator: account.address }));
const receipt = await client.waitForTransactionReceipt({ hash, timeout: 60_000 });
if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('Triển khai token thất bại.');
const tx = await client.getTransaction({ hash });
if (!isAddressEqual(getContractAddress({ from: account.address, nonce: BigInt(tx.nonce) }), receipt.contractAddress)) {
  throw new Error('Địa chỉ token khác giao dịch triển khai.');
}
console.log(`LOYALTY_CONTRACT_ADDRESS=${receipt.contractAddress}`);
