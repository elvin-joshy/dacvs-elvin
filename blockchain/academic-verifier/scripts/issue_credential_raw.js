require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const tokenId = process.argv[2] || 1;

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const abiPath = path.join(__dirname, "..", "artifacts", "contracts", "CertificateNFT.sol", "CertificateNFT.json");
  const abi = JSON.parse(fs.readFileSync(abiPath)).abi;
  const nft = new ethers.Contract(process.env.CERTIFICATE_NFT_ADDRESS, abi, provider);

  console.log("Checking NFT Token #" + tokenId);
  console.log("Contract:", process.env.CERTIFICATE_NFT_ADDRESS);
  console.log("");

  // Owner
  const owner = await nft.ownerOf(tokenId);
  console.log("✅ Owner:", owner);

  // Certificate data
  const cert = await nft.certificateStruct(tokenId);
  console.log("✅ Student:", cert.studentName);
  console.log("✅ Degree:", cert.degree);
  console.log("✅ University:", cert.university);
  console.log("✅ Issue Date:", new Date(Number(cert.issueDate) * 1000).toISOString());
  console.log("✅ Credential Hash:", cert.hash);

  // TokenURI
  const uri = await nft.tokenURI(tokenId);
  console.log("✅ TokenURI:", uri);

  console.log("\nView certificate:");
  console.log("- Etherscan:", `https://sepolia.etherscan.io/token/${process.env.CERTIFICATE_NFT_ADDRESS}?a=${tokenId}`);
  console.log("- OpenSea:", `https://testnets.opensea.io/assets/sepolia/${process.env.CERTIFICATE_NFT_ADDRESS}/${tokenId}`);
  
  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    console.log("- Metadata:", `https://gateway.pinata.cloud/ipfs/${cid}`);
  }
}

main().catch(e => { 
  console.error(e); 
  process.exit(1); 
});
