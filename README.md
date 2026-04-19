# DACVS — Decentralized Academic Credential Verification System

![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)
![License](https://img.shields.io/badge/License-MIT-green)
![Network](https://img.shields.io/badge/Network-Sepolia-blue)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen)
![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=nodedotjs)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python)

A hybrid on-chain/off-chain system that fuses AI-driven document fraud detection with immutable Ethereum smart contract registries to issue, verify, and revoke academic credentials. Documents are analysed via OCR and heuristic scoring, hashed with SHA-256, and anchored to Sepolia as both a registry entry and an ERC-721 NFT with fully on-chain metadata — no IPFS dependency for core verification data.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────────┐
│   React UI  │────▶│  Node.js Backend │────▶│   Flask AI Engine      │
│  (Vite+TS)  │     │  (Express+Mongo) │     │  (OCR + Fraud Score)   │
│  Port 5173  │     │    Port 3000     │     │      Port 8000         │
└──────┬──────┘     └──────┬───────────┘     └────────────────────────┘
       │                   │
       │   ethers.js v6    │   ethers.js v6 (read-only)
       ▼                   ▼
┌──────────────────────────────────────────┐
│         Ethereum — Sepolia Testnet       │
│                                          │
│  AcademicVerification (Registry)         │
│  0x05353CB3465271217E7BBb59343a0C6066F179bC │
│                                          │
│  CertificateNFT (ERC-721)               │
│  0x937Adb732106205eEc4BCFE2E43255C7fe3b5079 │
└──────────────────────────────────────────┘
```

### Data Flow

1. **Upload** → Institution uploads a PDF/image via the React dashboard.
2. **AI Analysis** → Backend proxies the file to Flask, which runs OCR + fraud scoring.
3. **Hash** → Backend computes SHA-256 of the raw file bytes, returning the bytes32 hash.
4. **Blockchain Issue** → Frontend calls `issueCredential()` on `AcademicVerification` via MetaMask.
5. **NFT Mint** → Frontend calls `mintCertificate()` on `CertificateNFT` via MetaMask.
6. **Persist** → Both transaction hashes + tokenId are saved to MongoDB.
7. **QR + PDF** → A QR code and downloadable PDF certificate are generated.
8. **Verify** → Anyone can look up a credential hash on the public `/verify` page.

---

## Deployed Contracts (Sepolia)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| AcademicVerification | `0x05353CB3465271217E7BBb59343a0C6066F179bC` | [View](https://sepolia.etherscan.io/address/0x05353CB3465271217E7BBb59343a0C6066F179bC) |
| CertificateNFT | `0x937Adb732106205eEc4BCFE2E43255C7fe3b5079` | [View](https://sepolia.etherscan.io/address/0x937Adb732106205eEc4BCFE2E43255C7fe3b5079) |

---

## Local Setup

### Prerequisites
- Node.js 18+, npm
- Python 3.10+, pip
- MongoDB (local or Atlas)
- MetaMask browser extension (configured for Sepolia)

### 1. Clone & Install

```bash
git clone https://github.com/Akrishnamadhav/DACVS.git
cd DACVS
npm install               # Root concurrently
cd ai-engine && pip install -r requirements.txt && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Environment Variables

#### `/backend/.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/dacvs` |
| `JWT_SECRET` | Secret for signing JWT tokens | `your-secret-key-here` |
| `FLASK_AI_URL` | URL of the Flask AI engine | `http://localhost:8000` |
| `RPC_URL` | Ethereum RPC endpoint | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `CONTRACT_ADDRESS` | AcademicVerification address | `0x05353CB3...` |
| `NFT_CONTRACT_ADDRESS` | CertificateNFT address | `0x937Adb73...` |
| `PORT` | Backend server port | `3000` |

#### `/blockchain/academic-verifier/.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `SEPOLIA_RPC_URL` | Alchemy/Infura Sepolia RPC | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `PRIVATE_KEY` | Deployer wallet private key | `0xabc123...` |
| `ETHERSCAN_API_KEY` | For contract verification | `ABC123...` |

### 3. Run All Services

```bash
npm run dev   # Starts AI engine (8000) + Backend (3000) + Frontend (5173)
```

Or individually:

```bash
cd ai-engine && python main.py
cd backend && node src/server.js
cd frontend && npm run dev
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/nonce` | Request a nonce for wallet signature |
| POST | `/api/auth/verify` | Verify signature, returns JWT |

### Credentials

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/credentials/analyze` | Upload document → AI fraud score + SHA-256 hash |
| POST | `/api/credentials/issue` | Save issued credential (post-blockchain) to MongoDB |
| GET | `/api/credentials/institution/:address` | List all credentials by institution |
| GET | `/api/credentials/:hash` | Get credential by hash |
| GET | `/api/credentials/:hash/qr` | Get QR code (base64 PNG) |
| POST | `/api/credentials/revoke/:hash` | Revoke a credential |

### Institutions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/institutions` | List all institutions |
| POST | `/api/institutions/whitelist` | Whitelist an institution (admin) |

### Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/verify/:hash` | Public lookup — checks both MongoDB and on-chain |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Returns MongoDB status + Flask AI reachability |

---

## Smart Contract Reference

### AcademicVerification

| Function | Access | Parameters | Returns |
|----------|--------|------------|---------|
| `setInstitution` | Owner | `address, bool` | — |
| `issueCredential` | Institution | `bytes32, string, string` | — |
| `revokeCredential` | Institution | `bytes32` | — |
| `verifyCredential` | Public | `bytes32` | `bool, string, string, address, uint256, bool` |
| `getCredential` | Public | `bytes32` | `Credential struct` |
| `batchVerify` | Public | `bytes32[]` | `bool[]` |

### CertificateNFT

| Function | Access | Parameters | Returns |
|----------|--------|------------|---------|
| `mintCertificate` | Owner | `address, string, string, string, uint64, bytes32` | `uint256 tokenId` |
| `mintCertificateWithURI` | Owner | `address, string, string, string, uint64, bytes32, string` | `uint256 tokenId` |
| `setTokenURI` | Owner | `uint256, string` | — |
| `getCertificate` | Public | `uint256` | `string, string, string, uint64, bytes32` |
| `certificateStruct` | Public | `uint256` | `Certificate struct` |
| `tokenURI` | Public | `uint256` | `string (Base64 JSON)` |
| `nextTokenId` | Public | — | `uint256` |

---

## Security Considerations

- **Fraud Score Threshold (0.4)**: Documents above this score are rejected pre-blockchain. The threshold balances false-positive protection with fraud detection sensitivity.
- **Role-Based Access**: On-chain institution whitelisting prevents unauthorized credential issuance. Only the contract owner can modify the whitelist.
- **On-Chain Revocation Trail**: Revocation emits an indexed event (`CredentialRevoked`) that is permanently recorded. The `revoked` flag is publicly readable — there is no way to silently revoke a credential.
- **Rate Limiting**: Issuance endpoints are limited to 10 req/min; public endpoints to 100 req/min.
- **File Upload Validation**: MIME type whitelist (PDF/PNG/JPG only) + 10MB size cap enforced at the middleware level.

See [SECURITY.md](./SECURITY.md) for the full threat model.

---

## Known Limitations & Roadmap

### Current Limitations
- Deployed on **Sepolia testnet** — not production mainnet.
- AI fraud engine uses heuristic OCR scoring, not forensic-grade analysis.
- JWT stored in `localStorage` (XSS-vulnerable); production should use `httpOnly` cookies.
- Contract owner is a single EOA; production should use multisig / DAO governance.
- Etherscan source verification requires an API key (not included in `.env.example`).

### Roadmap
- [ ] Mainnet deployment with multisig ownership
- [ ] IPFS pinning for full document archival
- [ ] Zero-knowledge proof integration for privacy-preserving verification
- [ ] Multi-chain support (Polygon, Arbitrum)
- [ ] Institutional SSO integration
- [ ] Mobile app with QR scanner

---

## License

This project is licensed under the MIT License.
