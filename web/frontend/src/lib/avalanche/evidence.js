import { documentHash, handoverCommitment, settlementCommitment, validateStatement, validateHandover } from '@homestaydorm/settlement/evidence';
// Reconstruct the signed commitment from the same local bundle displayed to the customer.
export async function checkSnapshot(client, deployment, abi, bundle, message) {
  const read = (functionName, args) => client.readContract({ address: deployment.address, abi, functionName, args });
  if (bundle.agreementId !== message.agreementId || bundle.deployment.chainId !== deployment.chainId ||
    bundle.deployment.address.toLowerCase() !== deployment.address.toLowerCase()) throw new Error('Snapshot sai hồ sơ hoặc deployment.');
  const a = await read('getAgreement', [bundle.agreementId]);
  let commitment;
  if (message.action === 1) {
    const { handover, policy } = bundle.documents;
    validateHandover(handover.payload, policy.payload);
    if (handover.payload.agreementId !== bundle.agreementId || handover.payload.tenant.toLowerCase() !== a.tenant.toLowerCase() ||
      BigInt(handover.payload.depositHeldVnd) !== a.depositHeld) throw new Error('Thông tin bàn giao không khớp.');
    const manager = await read('manager'), accountant = await read('accountant');
    commitment = handoverCommitment(deployment, bundle.agreementId, manager, accountant, {
      ...a, policyHash: documentHash(policy.payload, policy.salt), handoverHash: documentHash(handover.payload, handover.salt),
    });
  } else {
    const doc = bundle.documents.statement, payload = doc.payload;
    const totals = validateStatement(payload);
    if (payload.agreementId !== bundle.agreementId || payload.version !== message.version || bundle.version !== message.version ||
      totals.depositHeld !== a.depositHeld) throw new Error('Số tiền hoặc phiên bản không khớp.');
    commitment = settlementCommitment(deployment, bundle.agreementId, a, message.version, { ...totals, statementHash: documentHash(payload, doc.salt) });
  }
  if (commitment !== message.commitment) throw new Error('Nội dung đang xem khác bản đang chờ xác nhận. Hãy tải lại.');
}
export function downloadEvidence(bundle, filename = 'homestaydorm-evidence.json') {
  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
