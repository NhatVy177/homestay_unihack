import { parseAbi } from 'viem';

export const AWARD_POINTS = 100;
export const VOUCHER_POINTS = 100;
export const VOUCHER_VND = 20_000;

export const loyaltyAbi = parseAbi([
  'function operator() view returns (address)',
  'function balanceOf(address wallet) view returns (uint256)',
  'function award(address wallet, bytes32 id)',
  'function redeem(address wallet, bytes32 id, uint256 deadline, bytes signature)',
  'event PointsAwarded(bytes32 indexed id, address indexed wallet, uint256 amount)',
  'event PointsRedeemed(bytes32 indexed id, address indexed wallet, uint256 amount)',
]);

export function redemptionData({ chainId, address }, { wallet, id, deadline }) {
  return {
    domain: { name: 'HomeStayDorm Points', version: '1', chainId, verifyingContract: address },
    primaryType: 'Redeem',
    types: { Redeem: [
      { name: 'wallet', type: 'address' },
      { name: 'id', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
    ] },
    message: { wallet, id, deadline: String(deadline) },
  };
}
