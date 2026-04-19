require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

async function fetchFromGateways(cid) {
  for (const gateway of GATEWAYS) {
    const url = gateway + cid;
    try {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });

      if (response.data) {
        return { url, data: response.data };
      }
    } catch (err) {
      // try next gateway
    }
  }
  return null;
}

async function main() {
  const tokenId = process.argv[2];

  if (!tokenId) {
    console.log("Usage: node scripts/check_nft.js <tokenId>");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL
  );

  const abiPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "CertificateNFT.sol",
    "CertificateNFT.json"
  );

  const abi = JSON.parse(fs.readFileSync(abiPath)).abi;

  const nft = new ethers.Contract(
    process.env.CERTIFICATE_NFT_ADDRESS,
    abi,
    provider
  );

  console.log("═══════════════════════════════════════════════════════");
  console.log("NFT CERTIFICATE VERIFICATION");
  console.log("═══════════════════════════════════════════════════════\n");

  const owner = await nft.ownerOf(tokenId);
  const cert = await nft.certificateStruct(tokenId);
  const uri = await nft.tokenURI(tokenId);

  console.log("Token ID:", tokenId);
  console.log("Owner:", owner);
  console.log("Student:", cert.studentName);
  console.log("Degree:", cert.degree);
  console.log("University:", cert.university);
  console.log(
    "Issue Date:",
    new Date(Number(cert.issueDate) * 1000).toISOString()
  );
  console.log("Credential Hash:", cert.hash);
  console.log("TokenURI:", uri);

  if (!uri.startsWith("ipfs://")) {
    console.log("\n❌ TokenURI is not IPFS format.");
    return;
  }

  const metadataCID = uri.replace("ipfs://", "");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("PUBLIC LINKS");
  console.log("═══════════════════════════════════════════════════════\n");

  const metadataResult = await fetchFromGateways(metadataCID);

  if (!metadataResult) {
    console.log("⚠️ Could not fetch metadata from any public gateway.");
    return;
  }

  console.log("📄 Metadata:");
  console.log(metadataResult.url);

  const metadata = metadataResult.data;

  if (metadata.image && metadata.image.startsWith("ipfs://")) {
    const imageCID = metadata.image.replace("ipfs://", "");

    const imageResult = await fetchFromGateways(imageCID);

    if (imageResult) {
      console.log("\n🖼 Certificate:");
      console.log(imageResult.url);
    } else {
      console.log("\n⚠️ Could not fetch certificate image from gateways.");
    }
  } else {
    console.log("\n⚠️ No image field found in metadata.");
  }

  console.log("\n═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
});