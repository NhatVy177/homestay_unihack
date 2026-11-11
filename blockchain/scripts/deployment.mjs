import { createPublicClient, createWalletClient, encodeAbiParameters, encodeDeployData, formatEther, getAddress, http, zeroAddress } from 'viem';
import { hardhat, avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FujiSetupError } from './fuji-keygen.mjs';

export async function preflightFuji({ client, wallet, artifact, manager, accountant, log = console.log }) {
  if (await client.getChainId() !== 43113) throw new FujiSetupError('RPC is not Avalanche Fuji (43113). No deployment sent.');
  if ([manager, accountant].some(address => getAddress(address) === zeroAddress) || manager.toLowerCase() === accountant.toLowerCase()) {
    throw new FujiSetupError('Manager and accountant must be distinct nonzero addresses.');
  }
  const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args: [manager, accountant] });
  const gas = await client.estimateGas({ account: wallet.account, data });
  const gasPrice = await client.getGasPrice();
  const balance = await client.getBalance({ address: wallet.account.address });
  const reserve = gas * gasPrice * 2n;
  log(`Deployment estimate: ${gas} gas; reserve ${formatEther(reserve)} test AVAX; balance ${formatEther(balance)}.`);
  if (balance < reserve) throw new FujiSetupError('Deployer balance is below estimated deployment gas plus reserve. No deployment sent.');
  return { gas, reserve };
}

export async function verifyRoles(client, artifact, deployment) {
  const roles = ['manager', 'accountant'];
  const results = await Promise.all(roles.map(functionName => client.readContract({ address: deployment.address, abi: artifact.abi, functionName })));
  if (results.some((address, i) => getAddress(address) !== getAddress(deployment[roles[i]]))) {
    throw new FujiSetupError('Deployed roles do not match the manifest. Preserve deployment files and investigate.');
  }
}

export async function main() {
  const target = process.argv[2], checkOnly = process.argv.includes('--check');
  if (!['local', 'fuji'].includes(target) || process.argv.slice(3).some(arg => arg !== '--check')) throw new FujiSetupError('Usage: deploy.mjs local|fuji [--check]');
  const fuji = target === 'fuji';
  const recordPath = new URL(fuji ? '../deployments/fuji.json' : '../deployments/local/deployment.json', import.meta.url);
  const pendingPath = new URL('../deployments/fuji.pending.json', import.meta.url);
  if (fuji) {
    try { await readFile(recordPath); throw new FujiSetupError('A Fuji deployment manifest already exists. Do not redeploy or overwrite it.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const chain = fuji ? avalancheFuji : hardhat;
  const url = fuji ? (process.env.FUJI_RPC_URL || avalancheFuji.rpcUrls.default.http[0]) : (process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545');
  const client = createPublicClient({ chain, transport: http(url) });
  if (await client.getChainId() !== chain.id) throw new FujiSetupError('RPC chain ID is different from the requested target.');
  let manager, accountant, wallet;
  if (fuji) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(process.env.FUJI_DEPLOYER_PRIVATE_KEY || '') || !process.env.FUJI_MANAGER_ADDRESS || !process.env.FUJI_ACCOUNTANT_ADDRESS) {
      throw new FujiSetupError('Load the original Fuji .env locally before deployment. Never paste wallet keys into chat.');
    }
    manager = getAddress(process.env.FUJI_MANAGER_ADDRESS); accountant = getAddress(process.env.FUJI_ACCOUNTANT_ADDRESS);
    wallet = createWalletClient({ account: privateKeyToAccount(process.env.FUJI_DEPLOYER_PRIVATE_KEY), chain, transport: http(url) });
  } else {
    const addresses = await client.request({ method: 'eth_accounts' });
    if (addresses.length < 2) throw new FujiSetupError('Local node must expose at least two unlocked development accounts.');
    manager = getAddress(addresses[0]); accountant = getAddress(addresses[1]);
    wallet = createWalletClient({ account: manager, chain, transport: http(url) });
  }
  const artifact = JSON.parse(await readFile(new URL('../artifacts/DormSettlement.json', import.meta.url), 'utf8'));
  const standardInput = await readFile(new URL('../artifacts/standard-input.json', import.meta.url), 'utf8');
  const standardInputSha256 = createHash('sha256').update(standardInput).digest('hex');
  let pending;
  if (fuji) {
    try { pending = JSON.parse(await readFile(pendingPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (pending && (pending.chainId !== chain.id || pending.manager !== manager || pending.accountant !== accountant || pending.standardInputSha256 !== standardInputSha256)) {
    throw new FujiSetupError('Pending deployment differs from current configuration or compiler input. Preserve it and investigate.');
  }
  if (!pending && fuji) await preflightFuji({ client, wallet, artifact, manager, accountant });
  if (checkOnly) { console.log(pending ? `Pending deployment ${pending.transactionHash}; check only, no new transaction.` : 'Check only; no deployment sent.'); return; }
  await mkdir(new URL(fuji ? '../deployments/' : '../deployments/local/', import.meta.url), { recursive: true });
  if (!pending) {
    const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [manager, accountant] });
    console.log(`Deployment broadcast: ${hash}`);
    pending = {
      chainId: chain.id, manager, accountant, transactionHash: hash,
      compilerVersion: artifact.compilerVersion, standardInputSha256,
      constructorArguments: encodeAbiParameters([{ type: 'address' }, { type: 'address' }], [manager, accountant]),
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' }).trim(),
    };
    // If receipt lookup fails, rerunning resumes this hash instead of deploying again.
    if (fuji) await writeFile(pendingPath, JSON.stringify(pending, null, 2) + '\n', { flag: 'wx' });
  }
  const receipt = await client.waitForTransactionReceipt({ hash: pending.transactionHash, confirmations: 1 });
  if (receipt.status !== 'success' || !receipt.contractAddress) throw new FujiSetupError(`Deployment failed: ${pending.transactionHash}. Preserve the pending record before retrying.`);
  const deployment = { ...pending, address: getAddress(receipt.contractAddress), blockNumber: receipt.blockNumber.toString(), protocolVersion: '2', sourceVerification: 'pending' };
  await verifyRoles(client, artifact, deployment);
  await writeFile(recordPath, JSON.stringify(deployment, null, 2) + '\n', { flag: fuji ? 'wx' : 'w' });
  if (fuji) await unlink(pendingPath);
  console.log(`Deployed on chain ${chain.id}: ${deployment.address} (tx ${deployment.transactionHash}).`);
  console.log('Manifest saved; source verification is still pending.');
}
