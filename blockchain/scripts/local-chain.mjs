import { network } from "hardhat";
import { createPublicClient, createWalletClient, custom } from "viem";
import { hardhat } from "viem/chains";
import { readFile } from "node:fs/promises";

export async function localChain() {
  const connection = await network.create("local");
  const transport = custom(connection.provider);
  const client = createPublicClient({ chain: hardhat, transport, pollingInterval: 10, cacheTime: 0 });
  const addresses = await connection.provider.request({ method: "eth_accounts" });
  const wallets = addresses.slice(0, 4).map((account) => createWalletClient({ account, chain: hardhat, transport }));
  const artifact = JSON.parse(await readFile(new URL("../artifacts/DormSettlement.json", import.meta.url), "utf8"));
  const hash = await wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [addresses[0], addresses[1]] });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Local contract deployment failed.");
  return {
    client, wallets, addresses, artifact, deployment: { chainId: 31337, address: receipt.contractAddress },
    provider: connection.provider, close: () => connection.close(),
  };
}
