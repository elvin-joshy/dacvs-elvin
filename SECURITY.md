# Security Policy — DACVS

## Threat Model

DACVS is designed to defend against the following attack vectors:

### 1. Credential Forgery
**Threat**: An attacker creates a fake academic certificate and attempts to pass it off as genuine.

**Mitigation**: Every uploaded document is processed through a multi-layer AI fraud detection pipeline (OCR text extraction + image analysis). Documents scoring above the 0.4 fraud threshold are rejected before they ever reach the blockchain. The SHA-256 hash of the original document is recorded on-chain, making it computationally infeasible to produce a second document that matches an existing hash.

### 2. Unauthorised Issuance
**Threat**: A non-institution actor attempts to issue credentials on the blockchain.

**Mitigation**: The `AcademicVerification` smart contract employs a whitelist pattern — only addresses explicitly approved by the contract owner via `setInstitution()` can call `issueCredential()`. The `CertificateNFT` contract uses OpenZeppelin's `Ownable` modifier to restrict minting to the deployer.

### 3. Credential Tampering After Issuance
**Threat**: An attacker attempts to modify a credential after it has been recorded.

**Mitigation**: Once a credential hash is written to the Ethereum blockchain, it is immutable. Smart contract storage cannot be overwritten for existing hashes (`require(credentials[hash].issuedAt == 0)`). Any modification to the source document will produce a different SHA-256 hash that will not match the on-chain record.

### 4. Silent Revocation
**Threat**: An institution revokes a credential without leaving a trace.

**Mitigation**: Revocation emits a `CredentialRevoked` event with the revoker's address and timestamp. This event is permanently indexed on the blockchain and can be queried by any party. The `revoked` flag is publicly readable via `verifyCredential()`.

### 5. API Abuse / DDoS
**Threat**: An attacker floods the issuance or verification endpoints.

**Mitigation**: Express.js rate limiting is applied at two tiers:
- **Issuance routes** (`/api/credentials/issue`, `/api/credentials/analyze`): 10 requests per minute per IP.
- **Global routes**: 100 requests per minute per IP.

### 6. File Upload Attacks
**Threat**: Malicious files uploaded to exploit the AI engine or backend.

**Mitigation**: Multer middleware enforces:
- MIME type whitelist: `image/jpeg`, `image/png`, `application/pdf` only.
- Maximum file size: 10 MB.
- Files are stored in memory buffers (never written to disk on the backend server).

## Responsible Disclosure

If you discover a security vulnerability, please email the maintainers directly rather than opening a public issue. We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.

## Dependencies

We rely on audited, widely-used libraries:
- **OpenZeppelin Contracts v5** — industry-standard Solidity security primitives.
- **ethers.js v6** — well-maintained Ethereum interaction library.
- **Helmet.js** — sets security-related HTTP response headers.

## Limitations

- This is deployed on the **Sepolia testnet** — not production Ethereum mainnet.
- The AI fraud engine uses heuristic scoring and is not a forensic-grade document analysis system.
- JWT tokens are stored in `localStorage`, which is vulnerable to XSS. A production deployment should use `httpOnly` cookies.
- The contract owner is a single EOA. A production system should use a multisig or DAO governance.
