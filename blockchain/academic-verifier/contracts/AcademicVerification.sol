// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AcademicVerification
/// @author DACVS Team
/// @notice On-chain credential registry allowing whitelisted institutions to issue,
///         revoke, and verify academic credentials via keccak256 document hashes.
/// @dev Role-based access uses a simple owner→institution whitelist pattern.
///      Credentials are stored as structs keyed by their bytes32 hash, making
///      duplicate issuance impossible.
contract AcademicVerification {
    /// @notice Contract deployer who can whitelist institutions.
    address public owner;

    /// @notice Mapping of institution addresses to their whitelisted status.
    mapping(address => bool) public institutions;

    /// @notice On-chain representation of an academic credential.
    struct Credential {
        bytes32 credentialHash;
        string studentId;
        string institutionId;
        uint256 issuedAt;
        address issuer;
        bool revoked;
    }

    /// @notice Lookup table: credentialHash → Credential struct.
    mapping(bytes32 => Credential) public credentials;

    /// @notice Emitted when a new credential is anchored on-chain.
    /// @param credentialHash  Keccak256 hash of the original document.
    /// @param studentId       Off-chain student identifier.
    /// @param institutionId   Off-chain institution identifier.
    /// @param issuer          Ethereum address of the issuing institution.
    /// @param issuedAt        Block timestamp at issuance.
    event CredentialIssued(bytes32 indexed credentialHash, string studentId, string institutionId, address indexed issuer, uint256 issuedAt);

    /// @notice Emitted when a credential is revoked.
    /// @param credentialHash  Hash of the revoked credential.
    /// @param revokedBy       Address that performed the revocation.
    /// @param timestamp       Block timestamp of revocation.
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed revokedBy, uint256 timestamp);

    /// @notice Emitted when an institution's whitelist status changes.
    /// @param institution  Address of the institution.
    /// @param approved     New whitelist status (true = approved).
    event InstitutionUpdated(address indexed institution, bool approved);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyInstitution() {
        require(institutions[msg.sender], "Not a registered institution");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Adds or removes an institution from the whitelist.
    /// @param _institution  The address to update.
    /// @param _approved     True to whitelist, false to revoke access.
    function setInstitution(address _institution, bool _approved) external onlyOwner {
        institutions[_institution] = _approved;
        emit InstitutionUpdated(_institution, _approved);
    }

    /// @notice Issues a new credential. Reverts if the hash already exists.
    /// @param _credentialHash  SHA-256 hash of the document (cast to bytes32).
    /// @param _studentId       Off-chain student reference string.
    /// @param _institutionId   Off-chain institution reference string.
    function issueCredential(
        bytes32 _credentialHash,
        string memory _studentId,
        string memory _institutionId
    ) external onlyInstitution {
        require(credentials[_credentialHash].issuedAt == 0, "Already issued");
        credentials[_credentialHash] = Credential({
            credentialHash: _credentialHash,
            studentId: _studentId,
            institutionId: _institutionId,
            issuedAt: block.timestamp,
            issuer: msg.sender,
            revoked: false
        });
        emit CredentialIssued(_credentialHash, _studentId, _institutionId, msg.sender, block.timestamp);
    }

    /// @notice Revokes a previously issued credential.
    /// @param _credentialHash  Hash of the credential to revoke.
    function revokeCredential(bytes32 _credentialHash) external onlyInstitution {
        require(credentials[_credentialHash].issuedAt != 0, "Not issued");
        credentials[_credentialHash].revoked = true;
        emit CredentialRevoked(_credentialHash, msg.sender, block.timestamp);
    }

    /// @notice Returns full verification data for a credential hash.
    /// @param _credentialHash  The hash to look up.
    /// @return valid           True if the credential exists on-chain.
    /// @return studentId       Student identifier string.
    /// @return institutionId   Institution identifier string.
    /// @return issuer          Ethereum address of the issuer.
    /// @return issuedAt        Unix timestamp of issuance.
    /// @return revoked         Whether the credential has been revoked.
    function verifyCredential(bytes32 _credentialHash) external view returns (
        bool valid,
        string memory studentId,
        string memory institutionId,
        address issuer,
        uint256 issuedAt,
        bool revoked
    ) {
        Credential memory c = credentials[_credentialHash];
        if (c.issuedAt == 0) {
            return (false, "", "", address(0), 0, false);
        }
        return (true, c.studentId, c.institutionId, c.issuer, c.issuedAt, c.revoked);
    }

    /// @notice Returns the full Credential struct for a given hash.
    /// @param _hash  The credential hash to query.
    /// @return The Credential struct (zero-initialised if not found).
    function getCredential(bytes32 _hash) external view returns (Credential memory) {
        return credentials[_hash];
    }

    /// @notice Batch-checks multiple credential hashes in a single RPC call.
    /// @param hashes  Array of credential hashes to verify.
    /// @return Array of booleans — true if issued AND not revoked.
    function batchVerify(bytes32[] calldata hashes) external view returns (bool[] memory) {
        bool[] memory results = new bool[](hashes.length);
        for (uint256 i = 0; i < hashes.length; i++) {
            results[i] = credentials[hashes[i]].issuedAt != 0 && !credentials[hashes[i]].revoked;
        }
        return results;
    }
}