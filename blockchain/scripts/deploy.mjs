import { createPublicClient, createWalletClient, getAddress, http } from "viem";
import { hardhat, avalancheFuji } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const target = process.argv[2];
if (!["local", "fuji"].includes(target)) throw new Error("Usage: node scripts/deploy.mjs local|fuji");
const recordPath = new URL(target === 'local' ? '../deployments/local/deployment.json' : '../deployments/fuji.json', import.meta.url);
try { await readFile(recordPath); throw new Error(`A deployment record already exists for ${target}; preserve it before redeploying.`); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const fuji = target === "fuji";
const chain = fuji ? avalancheFuji : hardhat;
const url = fuji
  ? (process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc")
  : (process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545");
const client = createPublicClient({ chain, transport: http(url) });
if (await client.getChainId() !== chain.id) throw new Error("RPC chain ID is different from the requested target.");
let manager;
let accountant;
let wallet;
if (fuji) {
  if (!process.env.FUJI_DEPLOYER_PRIVATE_KEY || !process.env.FUJI_MANAGER_ADDRESS || !process.env.FUJI_ACCOUNTANT_ADDRESS) {
    throw new Error("Set FUJI_DEPLOYER_PRIVATE_KEY, FUJI_MANAGER_ADDRESS and FUJI_ACCOUNTANT_ADDRESS in the local process environment.");
  }
  const account = privateKeyToAccount(process.env.FUJI_DEPLOYER_PRIVATE_KEY);
  if ((await client.getBalance({ address: account.address })) === 0n) throw new Error("Fuji deployer has no test AVAX for gas.");
  manager = getAddress(process.env.FUJI_MANAGER_ADDRESS);
  accountant = getAddress(process.env.FUJI_ACCOUNTANT_ADDRESS);
  wallet = createWalletClient({ account, chain, transport: http(url) });
} else {
  const addresses = await client.request({ method: "eth_accounts" });
  if (addresses.length < 2) throw new Error("Local node must expose at least two unlocked development accounts.");
  manager = getAddress(addresses[0]);
  accountant = getAddress(addresses[1]);
  wallet = createWalletClient({ account: manager, chain, transport: http(url) });
}
const artifact = JSON.parse(await readFile(new URL("../artifacts/DormSettlement.json", import.meta.url), "utf8"));
const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [manager, accountant] });
const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1 });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`Deployment failed: ${hash}`);
const deployment = {
  chainId: chain.id, address: receipt.contractAddress, manager, accountant,
  transactionHash: hash, compilerVersion: artifact.compilerVersion,
  blockNumber: receipt.blockNumber.toString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  protocolVersion: '2', sourceVerification: 'pending',
};
await mkdir(new URL(target === 'local' ? "../deployments/local/" : "../deployments/", import.meta.url), { recursive: true });
await writeFile(recordPath, JSON.stringify(deployment, null, 2) + "\n", { flag: "wx" });
console.log(`Deployed on chain ${chain.id}: ${receipt.contractAddress} (tx ${hash}).`);
console.log(`Saved ${target} deployment metadata; verify source with artifacts/standard-input.json before presenting it.`);
