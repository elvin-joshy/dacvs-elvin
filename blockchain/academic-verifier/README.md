# Academic Verifier (Hardhat)

## Contracts

- AcademicVerification (hash-based credential registry)
- CertificateNFT (ERC721 certificate NFTs)

## Scripts

- scripts/deploy.js (AcademicVerification)
- scripts/deploy_certificate_nft.js (CertificateNFT)

## Install

```bash
npm install
```

## Compile

```bash
npx hardhat compile
```

## Test

```bash
npx hardhat test
# or specific
npx hardhat test test/CertificateNFT.test.ts
```

## Deploy (Sepolia)

Set `.env` from `.env.example` then:

```bash
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/deploy_certificate_nft.js --network sepolia
```

## Mint (Console)

```bash
npx hardhat console --network sepolia
> const nft = await ethers.getContractAt("CertificateNFT","DEPLOYED_ADDRESS")
> const h = ethers.keccak256(ethers.toUtf8Bytes("file1"))
> (await nft.mintCertificate("0xYourAddr","Alice","BSc CS","Demo Uni", Math.floor(Date.now()/1000), h)).hash
```

## Notes

- Only owner (deployer) mints NFTs.
- Use SHA-256 of original document for `hash`.
- Remove Counter.\* sample files if unused.
