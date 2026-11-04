import { getAddress, zeroHash } from 'viem';
export const confirmationTypes = {
  Confirmation: [
    { name: 'action', type: 'uint8' }, { name: 'agreementId', type: 'bytes32' },
    { name: 'version', type: 'uint32' }, { name: 'commitment', type: 'bytes32' },
    { name: 'reasonHash', type: 'bytes32' }, { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};
export function confirmationData(deployment, message) {
  return {
    domain: { name: 'HomeStayDorm', version: '2', chainId: deployment.chainId, verifyingContract: getAddress(deployment.address) },
    types: confirmationTypes, primaryType: 'Confirmation',
    message: { ...message, reasonHash: message.reasonHash || zeroHash },
  };
}
