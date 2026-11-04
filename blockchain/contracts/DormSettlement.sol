// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.38;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @notice Adapted from HomeStayDorm 09f8270. Records acknowledgements, holds no money.
contract DormSettlement is EIP712 {
    enum Status { None, HandoverProposed, Active, SettlementProposed, Disputed, Accepted }
    struct Agreement {
        address tenant;
        uint128 depositHeld;
        bytes32 policyHash;
        bytes32 handoverHash;
        bytes32 handoverCommitment;
        uint32 latestVersion;
        Status status;
    }
    struct Settlement {
        uint128 deductions;
        uint128 refundDue;
        uint128 topUpDue;
        bytes32 statementHash;
        bytes32 commitment;
        bytes32 disputeHash;
        bool accepted;
    }
    struct Confirmation {
        uint8 action;
        bytes32 agreementId;
        uint32 version;
        bytes32 commitment;
        bytes32 reasonHash;
        uint256 nonce;
        uint256 deadline;
    }
    address public immutable manager;
    address public immutable accountant;
    mapping(bytes32 => Agreement) private agreements;
    mapping(bytes32 => mapping(uint32 => Settlement)) private settlements;
    mapping(address => uint256) public nonces;
    bytes32 public constant HANDOVER_TYPEHASH = keccak256("Handover(uint256 chainId,address verifyingContract,bytes32 agreementId,address manager,address accountant,address tenant,uint128 depositHeld,bytes32 policyHash,bytes32 handoverHash)");
    bytes32 public constant SETTLEMENT_TYPEHASH = keccak256("Settlement(uint256 chainId,address verifyingContract,bytes32 agreementId,bytes32 handoverCommitment,uint32 version,uint128 deductions,uint128 refundDue,uint128 topUpDue,bytes32 statementHash)");
    bytes32 public constant CONFIRMATION_TYPEHASH = keccak256("Confirmation(uint8 action,bytes32 agreementId,uint32 version,bytes32 commitment,bytes32 reasonHash,uint256 nonce,uint256 deadline)");
    error Unauthorized();
    error InvalidInput();
    error AlreadyExists();
    error NotFound();
    error WrongStatus();
    error StaleVersion();
    error CommitmentMismatch();
    error InvalidSignature();
    error Expired();
    error InvalidNonce();
    event HandoverProposed(bytes32 indexed agreementId, address indexed tenant, bytes32 commitment);
    event HandoverAccepted(bytes32 indexed agreementId, address indexed tenant, bytes32 commitment);
    event SettlementProposed(bytes32 indexed agreementId, uint32 indexed version, bytes32 commitment, uint128 refundDue, uint128 topUpDue);
    event SettlementDisputed(bytes32 indexed agreementId, uint32 indexed version, bytes32 reasonHash);
    event SettlementAccepted(bytes32 indexed agreementId, uint32 indexed version, bytes32 commitment);

    constructor(address manager_, address accountant_) EIP712("HomeStayDorm", "2") {
        if (manager_ == address(0) || accountant_ == address(0) || manager_ == accountant_) revert InvalidInput();
        manager = manager_;
        accountant = accountant_;
    }

    function proposeHandover(bytes32 id, address tenant, uint128 depositHeld, bytes32 policyHash, bytes32 handoverHash) external {
        if (msg.sender != manager) revert Unauthorized();
        if (id == bytes32(0) || policyHash == bytes32(0) || handoverHash == bytes32(0)) revert InvalidInput();
        if (tenant == address(0) || tenant == manager || tenant == accountant) revert InvalidInput();
        if (agreements[id].status != Status.None) revert AlreadyExists();
        bytes32 commitment = keccak256(abi.encode(HANDOVER_TYPEHASH, block.chainid, address(this), id, manager, accountant, tenant, depositHeld, policyHash, handoverHash));
        agreements[id] = Agreement(tenant, depositHeld, policyHash, handoverHash, commitment, 0, Status.HandoverProposed);
        emit HandoverProposed(id, tenant, commitment);
    }

    function proposeSettlement(bytes32 id, uint128 deductions, bytes32 statementHash) external {
        if (msg.sender != accountant) revert Unauthorized();
        Agreement storage a = _agreement(id);
        if (a.status != Status.Active && a.status != Status.Disputed) revert WrongStatus();
        if (statementHash == bytes32(0)) revert InvalidInput();
        uint32 version = ++a.latestVersion;
        (uint128 refund, uint128 topUp) = calculateBalance(a.depositHeld, deductions);
        bytes32 commitment = keccak256(abi.encode(SETTLEMENT_TYPEHASH, block.chainid, address(this), id, a.handoverCommitment, version, deductions, refund, topUp, statementHash));
        settlements[id][version] = Settlement(deductions, refund, topUp, statementHash, commitment, bytes32(0), false);
        a.status = Status.SettlementProposed;
        emit SettlementProposed(id, version, commitment, refund, topUp);
    }

    /// @notice Anyone may pay gas; only a valid current tenant signature can confirm.
    function confirm(Confirmation calldata c, bytes calldata signature) external {
        Agreement storage a = _agreement(c.agreementId);
        if (block.timestamp > c.deadline) revert Expired();
        if (c.nonce != nonces[a.tenant]) revert InvalidNonce();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CONFIRMATION_TYPEHASH, c.action, c.agreementId, c.version, c.commitment, c.reasonHash, c.nonce, c.deadline)));
        if (!SignatureChecker.isValidSignatureNow(a.tenant, digest, signature)) revert InvalidSignature();
        nonces[a.tenant]++;
        if (c.action == 1) {
            if (a.status != Status.HandoverProposed) revert WrongStatus();
            if (c.version != 0 || c.reasonHash != bytes32(0)) revert InvalidInput();
            if (c.commitment != a.handoverCommitment) revert CommitmentMismatch();
            a.status = Status.Active;
            emit HandoverAccepted(c.agreementId, a.tenant, c.commitment);
        } else {
            if (a.status != Status.SettlementProposed) revert WrongStatus();
            if (c.version == 0 || c.version != a.latestVersion) revert StaleVersion();
            Settlement storage s = settlements[c.agreementId][c.version];
            if (c.commitment != s.commitment) revert CommitmentMismatch();
            if (c.action == 2) {
                if (c.reasonHash != bytes32(0)) revert InvalidInput();
                s.accepted = true;
                a.status = Status.Accepted;
                emit SettlementAccepted(c.agreementId, c.version, c.commitment);
            } else if (c.action == 3) {
                if (c.reasonHash == bytes32(0)) revert InvalidInput();
                s.disputeHash = c.reasonHash;
                a.status = Status.Disputed;
                emit SettlementDisputed(c.agreementId, c.version, c.reasonHash);
            } else revert InvalidInput();
        }
    }

    function calculateBalance(uint128 depositHeld, uint128 deductions) public pure returns (uint128 refundDue, uint128 topUpDue) {
        return depositHeld >= deductions ? (depositHeld - deductions, uint128(0)) : (uint128(0), deductions - depositHeld);
    }
    function getAgreement(bytes32 id) external view returns (Agreement memory) { return _agreement(id); }
    function getSettlement(bytes32 id, uint32 version) external view returns (Settlement memory) {
        Agreement storage a = _agreement(id);
        if (version == 0 || version > a.latestVersion) revert NotFound();
        return settlements[id][version];
    }
    function _agreement(bytes32 id) private view returns (Agreement storage a) {
        a = agreements[id];
        if (a.status == Status.None) revert NotFound();
    }
}
