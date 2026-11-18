// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

contract DormPoints is ERC20, EIP712 {
    uint256 public constant AWARD = 100;
    uint256 public constant VOUCHER_COST = 100;
    bytes32 private constant REDEEM_TYPEHASH =
        keccak256("Redeem(address wallet,bytes32 id,uint256 deadline)");

    address public immutable operator;
    mapping(bytes32 => bool) public processed;

    error Unauthorized();
    error InvalidOperation();
    error AlreadyProcessed();
    error NonTransferable();
    error InvalidSignature();
    error Expired();

    event PointsAwarded(bytes32 indexed id, address indexed wallet, uint256 amount);
    event PointsRedeemed(bytes32 indexed id, address indexed wallet, uint256 amount);

    constructor(address operator_) ERC20("HomeStayDorm Points", "HSDP") EIP712("HomeStayDorm Points", "1") {
        if (operator_ == address(0)) revert InvalidOperation();
        operator = operator_;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert Unauthorized();
        _;
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function award(address wallet, bytes32 id) external onlyOperator {
        _use(id);
        _mint(wallet, AWARD);
        emit PointsAwarded(id, wallet, AWARD);
    }

    function redeem(address wallet, bytes32 id, uint256 deadline, bytes calldata signature) external onlyOperator {
        if (block.timestamp > deadline) revert Expired();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(REDEEM_TYPEHASH, wallet, id, deadline)));
        if (!SignatureChecker.isValidSignatureNow(wallet, digest, signature)) revert InvalidSignature();
        _use(id);
        _burn(wallet, VOUCHER_COST);
        emit PointsRedeemed(id, wallet, VOUCHER_COST);
    }

    function approve(address, uint256) public pure override returns (bool) {
        revert NonTransferable();
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && to != address(0)) revert NonTransferable();
        super._update(from, to, amount);
    }

    function _use(bytes32 id) private {
        if (id == bytes32(0)) revert InvalidOperation();
        if (processed[id]) revert AlreadyProcessed();
        processed[id] = true;
    }
}
