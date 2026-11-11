import { encodeAbiParameters, getAddress, keccak256, sha256, stringToHex } from "viem";
import { abi } from "./abi.js";

export const STATUS = Object.freeze({
  None: 0, HandoverProposed: 1, Active: 2,
  SettlementProposed: 3, Disputed: 4, Accepted: 5,
});
export const STATUS_LABELS = [
  "Chưa tồn tại", "Chờ xác nhận bàn giao", "Đã xác nhận bàn giao",
  "Chờ xác nhận đối soát", "Đang có phản đối", "Đã đồng ý đối soát",
];
const UINT128_MAX = (1n << 128n) - 1n;
const DOCUMENT_TYPEHASH = keccak256(stringToHex("HomeStayDorm.Document.v1"));
const HANDOVER_TYPEHASH = keccak256(stringToHex(
  "Handover(uint256 chainId,address verifyingContract,bytes32 agreementId,address manager,address accountant,address tenant,uint128 depositHeld,bytes32 policyHash,bytes32 handoverHash)",
));
const SETTLEMENT_TYPEHASH = keccak256(stringToHex(
  "Settlement(uint256 chainId,address verifyingContract,bytes32 agreementId,bytes32 handoverCommitment,uint32 version,uint128 deductions,uint128 refundDue,uint128 topUpDue,bytes32 statementHash)",
));

export function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error("JSON numbers must be safe integers; use decimal strings for VND.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length !== Object.keys(value).length) throw new Error("Sparse arrays are not allowed.");
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  throw new Error("Evidence must contain plain JSON values only.");
}

export function bytes32(value, name = "hash") {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value) || /^0x0{64}$/.test(value)) {
    throw new Error(`${name} must be a nonzero bytes32 value.`);
  }
  return value.toLowerCase();
}

export function amount(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) > UINT128_MAX) {
    throw new Error("VND amounts must be unsigned decimal strings within uint128.");
  }
  return BigInt(value);
}

export function documentHash(payload, salt) {
  return keccak256(encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }],
    [DOCUMENT_TYPEHASH, keccak256(stringToHex(canonicalize(payload))), bytes32(salt, "salt")],
  ));
}

// A short public label, not a replacement for the salted full policy commitment.
export function policyVersion(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Policy text is required.');
  return sha256(stringToHex(text)).slice(2, 10);
}

export function validateHandover(payload, policy) {
  if (!['homestaydorm.handover.v1', 'homestaydorm.handover.v2'].includes(payload?.schema)) throw new Error('Unsupported handover document schema.');
  if (payload.schema === 'homestaydorm.handover.v1') return;
  const terms = payload.contractTerms, file = payload.signedContract;
  const allowed = ['contractId', 'rentVnd', 'startDate', 'endDate', 'paymentCycle', 'depositVnd'];
  if (!terms || Object.keys(terms).length !== allowed.length || Object.keys(terms).some(key => !allowed.includes(key))
    || !/^[A-Za-z0-9]{1,6}$/.test(terms.contractId || '')) throw new Error('Invalid contract terms; personal fields are not allowed.');
  amount(terms.rentVnd);
  if (amount(terms.depositVnd) !== amount(payload.depositHeldVnd)) throw new Error('Contract deposit differs from the handover deposit.');
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!date(terms.startDate) || !date(terms.endDate) || terms.endDate <= terms.startDate
    || !['Hàng tháng', 'Hàng quý'].includes(terms.paymentCycle)) throw new Error('Invalid contract term dates or payment cycle.');
  if (!file || Object.keys(file).length !== 2 || typeof file.name !== 'string'
    || !/^[A-Za-z0-9-]+\.(pdf|png|jpg|webp)$/.test(file.name) || !/^[0-9a-f]{64}$/.test(file.sha256 || '')) {
    throw new Error('Signed contract evidence must contain only a safe filename and SHA-256 hash.');
  }
  if (payload.policyVersion !== policyVersion(policy?.text) || policy.version !== payload.policyVersion) {
    throw new Error('Policy version does not match the saved policy text.');
  }
}

export function handoverCommitment(deployment, id, manager, accountant, agreement) {
  return keccak256(encodeAbiParameters(
    ["bytes32", "uint256", "address", "bytes32", "address", "address", "address", "uint128", "bytes32", "bytes32"].map((type) => ({ type })),
    [HANDOVER_TYPEHASH, BigInt(deployment.chainId), getAddress(deployment.address), bytes32(id),
      getAddress(manager), getAddress(accountant), getAddress(agreement.tenant),
      agreement.depositHeld, agreement.policyHash, agreement.handoverHash],
  ));
}

export function settlementCommitment(deployment, id, agreement, version, settlement) {
  return keccak256(encodeAbiParameters(
    ["bytes32", "uint256", "address", "bytes32", "bytes32", "uint32", "uint128", "uint128", "uint128", "bytes32"].map((type) => ({ type })),
    [SETTLEMENT_TYPEHASH, BigInt(deployment.chainId), getAddress(deployment.address), bytes32(id),
      agreement.handoverCommitment, version, settlement.deductions,
      settlement.refundDue, settlement.topUpDue, settlement.statementHash],
  ));
}

export function validateStatement(payload) {
  if (payload?.schema !== "homestaydorm.settlement.v1") throw new Error("Unsupported settlement document schema.");
  bytes32(payload.agreementId, "agreementId");
  if (!Number.isInteger(payload.version) || payload.version < 1 || payload.version > 0xffffffff) throw new Error("Invalid version.");
  if (!Array.isArray(payload.items)) throw new Error("Settlement items are required.");
  const total = payload.items.reduce((sum, item) => {
    if (typeof item?.category !== "string" || !item.category || typeof item.description !== "string") throw new Error("Invalid settlement item.");
    return sum + amount(item.amountVnd);
  }, 0n);
  const depositHeld = amount(payload.depositHeldVnd);
  const deductions = amount(payload.deductionsVnd);
  const refundDue = amount(payload.refundDueVnd);
  const topUpDue = amount(payload.topUpDueVnd);
  if (total !== deductions) throw new Error("Item amounts do not match the proposed deduction total.");
  if (refundDue !== (depositHeld > deductions ? depositHeld - deductions : 0n)
    || topUpDue !== (deductions > depositHeld ? deductions - depositHeld : 0n)) {
    throw new Error("Settlement balance is inconsistent.");
  }
  return { depositHeld, deductions, refundDue, topUpDue };
}

export function createEvidence(deployment, kind, agreementId, documents, version) {
  const bundle = {
    schema: "homestaydorm.evidence.v1", kind,
    deployment: { chainId: deployment.chainId, address: getAddress(deployment.address) },
    agreementId: bytes32(agreementId), documents,
    ...(kind === "settlement" ? { version } : {}),
  };
  validateBundle(bundle);
  return bundle;
}

export function serializeEvidence(bundle) {
  validateBundle(bundle);
  return JSON.stringify(bundle, null, 2) + "\n";
}

function validateBundle(bundle) {
  if (bundle?.schema !== "homestaydorm.evidence.v1" || !["handover", "settlement"].includes(bundle.kind)) throw new Error("Unsupported evidence file.");
  if (!Number.isSafeInteger(bundle.deployment?.chainId) || bundle.deployment.chainId < 1) throw new Error("Invalid evidence network.");
  getAddress(bundle.deployment.address);
  bytes32(bundle.agreementId, "agreementId");
  const required = bundle.kind === "handover" ? ["policy", "handover"] : ["statement"];
  for (const key of required) documentHash(bundle.documents?.[key]?.payload, bundle.documents?.[key]?.salt);
  if (bundle.kind === 'handover') validateHandover(bundle.documents.handover.payload, bundle.documents.policy.payload);
  if (bundle.kind === "settlement") {
    if (bundle.version !== bundle.documents.statement.payload.version) throw new Error("Evidence version differs from document version.");
    validateStatement(bundle.documents.statement.payload);
  }
}

/** The deployment must come from a trusted configuration, never only from the uploaded file. */
export async function verifyEvidence(client, deployment, bundle) {
  try {
    validateBundle(bundle);
    if (bundle.deployment.chainId !== deployment.chainId
      || getAddress(bundle.deployment.address) !== getAddress(deployment.address)) {
      return { valid: false, reason: "Bằng chứng không thuộc mạng/contract đã chọn." };
    }
  } catch (error) { return { valid: false, reason: error.message }; }
  if (await client.getChainId() !== deployment.chainId) throw new Error("RPC đang kết nối sai mạng.");
  const read = (functionName, args = []) => client.readContract({ address: deployment.address, abi, functionName, args });
  const [agreement, manager, accountant] = await Promise.all([
    read("getAgreement", [bundle.agreementId]), read("manager"), read("accountant"),
  ]);
  if (handoverCommitment(deployment, bundle.agreementId, manager, accountant, agreement) !== agreement.handoverCommitment) {
    return { valid: false, reason: "Commitment bàn giao không khớp cấu trúc đã công bố." };
  }
  if (bundle.kind === "handover") {
    const { handover, policy } = bundle.documents;
    const payload = handover.payload;
    let fieldsMatch = false;
    try {
      fieldsMatch = ['homestaydorm.handover.v1', 'homestaydorm.handover.v2'].includes(payload.schema)
        && bytes32(payload.agreementId) === bundle.agreementId.toLowerCase()
        && getAddress(payload.tenant) === getAddress(agreement.tenant)
        && amount(payload.depositHeldVnd) === agreement.depositHeld;
    } catch { /* Invalid fields are a failed comparison, not valid evidence. */ }
    if (!fieldsMatch || documentHash(handover.payload, handover.salt) !== agreement.handoverHash
      || documentHash(policy.payload, policy.salt) !== agreement.policyHash) {
      return { valid: false, reason: "Nội dung bàn giao hoặc điều khoản khác bản đã ghi nhận." };
    }
    return {
      valid: true, kind: "handover", accepted: agreement.status >= STATUS.Active,
      status: STATUS_LABELS[agreement.status], latestVersion: agreement.latestVersion,
    };
  }
  const settlement = await read("getSettlement", [bundle.agreementId, bundle.version]);
  const payload = bundle.documents.statement.payload;
  const totals = validateStatement(payload);
  const hash = documentHash(payload, bundle.documents.statement.salt);
  if (bytes32(payload.agreementId) !== bundle.agreementId.toLowerCase()
    || totals.depositHeld !== agreement.depositHeld || totals.deductions !== settlement.deductions
    || totals.refundDue !== settlement.refundDue || totals.topUpDue !== settlement.topUpDue
    || hash !== settlement.statementHash
    || settlementCommitment(deployment, bundle.agreementId, agreement, bundle.version, settlement) !== settlement.commitment) {
    return { valid: false, reason: "Nội dung, số tiền hoặc phiên bản không khớp bản trên chain." };
  }
  return {
    valid: true, kind: "settlement", version: bundle.version,
    accepted: settlement.accepted, superseded: bundle.version !== agreement.latestVersion,
    disputed: !/^0x0{64}$/.test(settlement.disputeHash),
    latestVersion: agreement.latestVersion, status: STATUS_LABELS[agreement.status],
    refundDueVnd: settlement.refundDue.toString(), topUpDueVnd: settlement.topUpDue.toString(),
  };
}

export async function writeConfirmed(publicClient, walletClient, deployment, functionName, args) {
  const [readChain, walletChain] = await Promise.all([publicClient.getChainId(), walletClient.getChainId()]);
  if (readChain !== deployment.chainId || walletChain !== deployment.chainId) throw new Error("Ví hoặc RPC đang ở sai mạng.");
  const { request } = await publicClient.simulateContract({
    address: deployment.address, abi, functionName, args, account: walletClient.account,
  });
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Giao dịch thất bại: ${hash}`);
  return receipt;
}
