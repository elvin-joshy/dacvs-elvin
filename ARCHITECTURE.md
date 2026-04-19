# DACVS Architecture Documentation

This document provides a comprehensive mapping of the DACVS (Decentralized Academic Credential Verification System) repository.

## 1. File Structure and Purpose

### Root Directory
- `/README.md`: High-level overview, architecture summary, and setup instructions.
- `/ARCHITECTURE.md`: Detailed technical documentation mapping files, APIs, smart contracts, and data flows.

### `/ai-engine` (Python / Flask)
This service exposes the AI document evaluation logic.
- `app.py`: Contains the main API routes including development UI (`/`) and the core `POST /analyze` endpoint. Uses Flask and handles file uploads (PDF/images), OCR extraction, and fraud scoring.
- `main.py`: Production-oriented entry point using the app factory pattern. Handles structured logging and provides a fast, plain text `/ping` health endpoint.
- `ocr_utils.py`: Contains the `extract_text(image_path)` function using `easyocr`. Extracts dense text from image arrays.
- `fraud_utils.py`: Contains sub-scoring logic (`_blur_subscore`, `_lowres_subscore`, `_missing_institution_subscore`, `_spacing_subscore`) and exposes `fraud_score` which compiles these metrics into a 0.0 to 1.0 probability. 
- `requirements.txt`: Defines all dependencies (Flask, easyocr, PyMuPDF, opencv-python-headless, torch, etc.) allowing the service to run cleanly.

### `/blockchain/academic-verifier` (Hardhat / Solidity)
This directory manages immutable storage and NFT representation.
- `contracts/AcademicVerification.sol`: Smart contract acting as an on-chain registry for credentials allowing institutions to issue and revoke hashes.
- `contracts/CertificateNFT.sol`: ERC-721 implementation binding document hashes to transferrable tokens with optional IPFS metadata linking.
- `hardhat.config.cjs`: The Hardhat network and optimizer configuration, pointing to Sepolia via `.env`.
- `scripts/deploy.js` & `scripts/deploy_certificate_nft.js`: Ethers.js scripts to compile and place the respective contracts onto the blockchain.
- `scripts/*.js` (various): Assorted utility scripts to interact with the network, upload to IPFS, mint NFTs, and verify credentials.
- `test/AcademicVerification.test.ts` & `test/CertificateNFT.test.ts`: Chai and Mocha unit tests validating role-based access, reverting on future issue dates, and confirming successful hash storage.

---

## 2. AI Engine API Endpoints

| Endpoint | Method | Description | Input | Output |
| --- | --- | --- | --- | --- |
| `/` | `GET` | Development HTML upload form. | N/A | HTML Form |
| `/health` | `GET` | Simple JSON health check. | N/A | `{"ok": true}` |
| `/ping` | `GET` | Plain text health check for load balancers. | N/A | `"AI Engine Running"` |
| `/analyze` | `POST` | Primary analysis core. | `multipart/form-data` with `file` (.pdf, .jpg, .png). | JSON containing `fraud_score` (float) and `text` (string). |

---

## 3. Blockchain Smart Contracts

### `AcademicVerification.sol`
**Events:**
- `CredentialIssued(bytes32 credentialHash, string studentId, string institutionId, address issuer, uint256 issuedAt)`
- `CredentialRevoked(bytes32 credentialHash, address issuer, uint256 revokedAt)`
- `InstitutionUpdated(address institution, bool approved)`

**Public/External Functions:**
- `setInstitution(address _institution, bool _approved)`: (Owner only) Whitelists a given university's address.
- `issueCredential(bytes32 _credentialHash, string _studentId, string _institutionId)`: (Institution only) Logs the credential hash on chain.
- `revokeCredential(bytes32 _credentialHash)`: (Institution only) Flags a previously issued credential as revoked.
- `verifyCredential(bytes32 _credentialHash)`: (View) Returns a boolean for validity alongside student ID, institution ID, issuer address, issuance timestamp, and revocation status.

### `CertificateNFT.sol` ERC-721
**Events:**
- `CertificateMinted(uint256 tokenId, address to, string studentName, string degree, string university, uint64 issueDate, bytes32 hash)`

**Public/External Functions:**
- `mintCertificate(address to, string studentName, string degree, string university, uint64 issueDate, bytes32 hash)`: (Owner only) Mints an NFT embedding textual metadata + hash directly on-chain and prevents duplicate hashes. Returns `tokenId`.
- `mintCertificateWithURI(..., string uri)`: (Owner only) Same as above but writes a custom IPFS token URI to the NFT.
- `setTokenURI(uint256 tokenId, string uri)`: (Owner only) Updates an existing NFT's metadata URI.
- `getCertificate(uint256 tokenId)`: (View) Returns individual fields: `studentName, degree, university, issueDate, hash`.
- `certificateStruct(uint256 tokenId)`: (View) Returns the complete `Certificate` struct.
- `nextTokenId()`: (View) Returns current sequence nonce.

---

## 4. Current Status

**Working:**
- AI OCR image parsing and PDF extraction.
- Probability-based document fraud analysis algorithms.
- Full smart contract logic including role gating, strict document hash limits, and event emissions.
- API exposing analysis methods without system errors (All PyPI dependencies map correctly).
- Comprehensive test coverage for decentralized actions.

**Missing / To-Do:**
- A unified Frontend (e.g., React/Next.js) allowing non-technical university administrators to seamlessly upload documents to the Flask API, receive a hash, and approve an MetaMask transaction.
- Permanent data persistence to track NFT mappings (e.g., a MongoDB instance mapping standard non-sensitive user IDs to on-chain credentials to avoid strictly polling RPC nodes).

---

## 5. End-To-End Data Flow

1. **Upload**: A user (University Administrator) uses the `/analyze` endpoint to upload a prospective `.pdf` or image.
2. **OCR (`ocr_utils.py`)**: The uploaded file is converted via Pillow/PyMuPDF to an RGB array. `easyocr` reads the visual data and extrapolates string sentences.
3. **Fraud Score (`fraud_utils.py`)**: The AI uses Laplacian variance to check for blurriness, analyzes the document resolution, applies keyword institution verification, and checks spatial anomalies in the OCR text to yield a metric between `0.0` and `1.0`. 
4. **Validation**: The frontend (or administrator) reviews the returned OCR `text` and `fraud_score`. If legit, they proceed.
5. **Blockchain Hash**: The original binary file is hashed locally (SHA-256) producing a `bytes32` identifier. 
6. **NFT Minting (`mintCertificate`)**: A Web3 transaction is dispatched to either `CertificateNFT.sol` (to generate the ERC721 Token for the student) or `AcademicVerification.sol` (to log the hash silently). The matching hash ties the physical/digital degree natively to the on-chain data.
