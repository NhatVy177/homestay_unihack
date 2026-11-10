import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { createPublicClient, createWalletClient, formatEther, getAddress, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { FujiSetupError } from './fuji-keygen.mjs';

export async function loadFujiFunding(directory = process.cwd()) {
  const env = parseEnv(await readFile(resolve(directory, '.env'), 'utf8'));
  const backend = parseEnv(await readFile(resolve(directory, '.fuji-backend-env.local'), 'utf8'));
  const names = ['FUJI_DEPLOYER_PRIVATE_KEY', 'AVALANCHE_MANAGER_PRIVATE_KEY', 'AVALANCHE_ACCOUNTANT_PRIVATE_KEY', 'AVALANCHE_RELAYER_PRIVATE_KEY'];
  const values = [env[names[0]], ...names.slice(1).map(name => backend[name])];
  if (!values.every(value => /^0x[0-9a-fA-F]{64}$/.test(value || ''))) {
    throw new FujiSetupError('Wallet configuration is missing or invalid. Run fuji:keygen first.');
  }
  const [deployer, manager, accountant, relayer] = values.map(value => privateKeyToAccount(value));
  if (deployer.address !== manager.address || deployer.address !== getAddress(env.FUJI_MANAGER_ADDRESS)
    || accountant.address !== getAddress(env.FUJI_ACCOUNTANT_ADDRESS)
    || new Set([deployer.address, accountant.address, relayer.address]).size !== 3) {
    throw new FujiSetupError('Wallet files do not match. Funding stopped; preserve and check the original files.');
  }
  const url = process.env.FUJI_RPC_URL || env.FUJI_RPC_URL || avalancheFuji.rpcUrls.default.http[0];
  return {
    addresses: { deployer: deployer.address, accountant: accountant.address, relayer: relayer.address },
    client: createPublicClient({ chain: avalancheFuji, transport: http(url) }),
    wallet: createWalletClient({ account: deployer, chain: avalancheFuji, transport: http(url) }),
  };
}

export async function fundFuji({ client, wallet, addresses, log = console.log }) {
  if (await client.getChainId() !== avalancheFuji.id) {
    throw new FujiSetupError('RPC is not Avalanche Fuji (43113). No funds sent.');
  }
  const printBalances = async () => {
    const balances = await Promise.all(Object.values(addresses).map(address => client.getBalance({ address })));
    Object.entries(addresses).forEach(([role, address], i) => log(`${role}: ${address} — ${formatEther(balances[i])} test AVAX`));
    return balances;
  };
  const [balance] = await printBalances();
  if (balance === 0n) throw new FujiSetupError('Deployer has no test AVAX. Request faucet funds for its address, then run fuji:fund again.');

  const value = parseEther('0.3');
  const transfers = ['accountant', 'relayer'].map(role => ({ account: wallet.account, to: addresses[role], value }));
  const gasPrice = await client.getGasPrice();
  const gas = await Promise.all(transfers.map(transfer => client.estimateGas(transfer)));
  // Reserve twice the quoted gas cost to allow for fee changes before submission.
  if (balance < value * 2n + gas.reduce((sum, amount) => sum + amount, 0n) * gasPrice * 2n) {
    throw new FujiSetupError('Deployer needs more than 0.6 test AVAX plus gas. No funds sent; request more from the faucet.');
  }
  for (const transfer of transfers) {
    const hash = await wallet.sendTransaction(transfer);
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new FujiSetupError('Funding transaction failed. Check balances and the explorer before retrying.');
    log(`Sent 0.3 test AVAX to ${transfer.to}: ${hash}`);
  }
  await printBalances();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await fundFuji(await loadFujiFunding()); }
  catch (error) {
    console.error(error instanceof FujiSetupError ? error.message
      : 'Fuji funding failed. Check wallet files, RPC connectivity and transaction status before retrying.');
    process.exitCode = 1;
  }
}
