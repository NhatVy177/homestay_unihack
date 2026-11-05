// Chuẩn bị chain Hardhat local cho run.ps1: chờ RPC, deploy DormSettlement nếu chain mới tinh.
// Chain local mất dữ liệu khi tắt; contract đầu tiên do ví dev #0 deploy luôn có cùng địa chỉ,
// nên .env không phải sửa lại sau mỗi lần khởi động.
import { createPublicClient, getAddress, getContractAddress, http } from "viem";
import { hardhat } from "viem/chains";
import { execFileSync } from "node:child_process";
const url = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";
const client = createPublicClient({ chain: hardhat, transport: http(url) });
for (let i = 0; ; i++) {
  try { if (await client.getChainId() === hardhat.id) break; } catch { /* chưa sẵn sàng */ }
  if (i > 60) throw new Error("Chain local chưa chạy ở " + url + ". Mở cửa sổ: cd blockchain; npm run chain");
  await new Promise(r => setTimeout(r, 1000));
}
const [deployer] = await client.request({ method: "eth_accounts" });
const expected = getContractAddress({ from: getAddress(deployer), nonce: 0n });
if (await client.getCode({ address: expected })) {
  console.log("Contract local đã sẵn sàng: " + expected);
} else if (await client.getTransactionCount({ address: deployer }) === 0) {
  execFileSync(process.execPath, ["scripts/compile.mjs"], { stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/deploy.mjs", "local"], { stdio: "inherit" });
  console.log("Đặt AVALANCHE_CONTRACT_ADDRESS và VITE_AVALANCHE_CONTRACT_ADDRESS = " + expected);
} else {
  throw new Error("Chain local đã có giao dịch nhưng không có contract ở " + expected + ". Tắt cửa sổ chain rồi chạy lại.");
}
