// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title EVE learning rewards: local research prototype
/// @notice This prototype trusts an authorized attestor's signature; it cannot
/// prove that a person learned something or prevent one person using many wallets.
/// Constructor economics are illustrative local test inputs, not agreed tokenomics.
/// No public deployment, market value, gas sponsorship or production safety is claimed.
contract EveLearningRewardsResearch is ERC20Capped, AccessControl, EIP712 {
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");
    bytes32 public constant VOUCHER_TYPEHASH = keccak256(
        "LearningVoucher(address learner,bytes32 lessonId,uint256 nonce,uint256 deadline)"
    );

    struct LearningVoucher {
        address learner;
        bytes32 lessonId;
        uint256 nonce;
        uint256 deadline;
    }

    uint256 public immutable rewardPerClaim;
    mapping(address => mapping(bytes32 => bool)) public lessonClaimed;
    mapping(address => mapping(uint256 => bool)) public nonceUsed;

    error InvalidConfiguration();
    error WrongLearner();
    error EmptyLesson();
    error VoucherExpired();
    error LessonAlreadyClaimed();
    error NonceAlreadyUsed();
    error UnauthorizedAttestor();

    event LearningRewardClaimed(
        address indexed learner,
        bytes32 indexed lessonId,
        uint256 nonce,
        uint256 amount,
        address indexed attestor
    );

    constructor(address admin, address attestor, uint256 cap_, uint256 reward_)
        ERC20("Verachel Learning Research", "EVE")
        ERC20Capped(cap_)
        EIP712("EveLearningRewardsResearch", "0-local")
    {
        if (admin == address(0) || attestor == address(0) || reward_ == 0 || reward_ > cap_) {
            revert InvalidConfiguration();
        }
        rewardPerClaim = reward_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ATTESTOR_ROLE, attestor);
    }

    /// @notice The named learner submits their voucher. Gas, if any, belongs to
    /// the transaction layer. This contract contains no purchase or tax mechanism.
    function claim(LearningVoucher calldata voucher, bytes calldata signature) external {
        if (msg.sender != voucher.learner) revert WrongLearner();
        if (voucher.lessonId == bytes32(0)) revert EmptyLesson();
        if (block.timestamp > voucher.deadline) revert VoucherExpired();
        if (lessonClaimed[voucher.learner][voucher.lessonId]) revert LessonAlreadyClaimed();
        if (nonceUsed[voucher.learner][voucher.nonce]) revert NonceAlreadyUsed();

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            VOUCHER_TYPEHASH,
            voucher.learner,
            voucher.lessonId,
            voucher.nonce,
            voucher.deadline
        )));
        address attestor = ECDSA.recover(digest, signature);
        if (!hasRole(ATTESTOR_ROLE, attestor)) revert UnauthorizedAttestor();

        lessonClaimed[voucher.learner][voucher.lessonId] = true;
        nonceUsed[voucher.learner][voucher.nonce] = true;
        _mint(voucher.learner, rewardPerClaim);
        emit LearningRewardClaimed(
            voucher.learner, voucher.lessonId, voucher.nonce, rewardPerClaim, attestor
        );
    }
}
