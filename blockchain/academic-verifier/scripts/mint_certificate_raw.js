require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

async function main() {
  const rpc = process.env.SEPOLIA_RPC_URL;
  const pk = process.env.PRIVATE_KEY;
  const nftAddrEnv = process.env.CERTIFICATE_NFT_ADDRESS;

  if (!rpc) throw new Error("SEPOLIA_RPC_URL missing");
  if (!pk) throw new Error("PRIVATE_KEY missing");
  if (!nftAddrEnv) throw new Error("CERTIFICATE_NFT_ADDRESS missing");

  let nftAddr;
  try {
    nftAddr = ethers.getAddress(nftAddrEnv);
  } catch (e) {
    throw new Error(`Invalid CERTIFICATE_NFT_ADDRESS in .env: ${nftAddrEnv}`);
  }

  const abiPath = path.join(__dirname, "..", "artifacts", "contracts", "CertificateNFT.sol", "CertificateNFT.json");
  if (!fs.existsSync(abiPath)) throw new Error("Run: npx hardhat compile");
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  console.log("Owner:", wallet.address);
  console.log("NFT Contract:", nftAddr);

  const nft = new ethers.Contract(nftAddr, abi, wallet);

  const studentName = "Alice Example";
  const degree = "BSc Computer Science";
  const university = "Demo University";
  const issueDate = Math.floor(Date.now() / 1000);

  // ✅ Unique hash each mint (Prevents "Hash already used")
  const docHash = ethers.keccak256(
    ethers.toUtf8Bytes(`certificate:${studentName}:${degree}:${university}:${Date.now()}`)
  );

  console.log("Certificate Hash:", docHash);

  const tx = await nft.mintCertificate(
    wallet.address,
    studentName,
    degree,
    university,
    issueDate,
    docHash
  );
  console.log("Mint tx:", tx.hash);
  await tx.wait();

  console.log("✅ Certificate successfully minted!");
}

main().catch(e => { console.error(e); process.exit(1); });
