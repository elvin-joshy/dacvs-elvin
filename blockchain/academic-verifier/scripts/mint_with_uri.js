require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  // Parse arguments
  const studentName = process.argv[2];
  const degree = process.argv[3];
  const university = process.argv[4];
  const credentialHash = process.argv[5];
  const uri = process.argv[6]; // IPFS URI (we'll set it after minting)

  if (!studentName || !degree || !university || !credentialHash) {
    console.log("Usage: node scripts/mint_with_uri.js <studentName> <degree> <university> <credentialHash> [ipfsURI]");
    console.log("\nExample:");
    console.log('  node scripts/mint_with_uri.js "John Doe" "B.Sc Computer Science" "MIT" 0x56d5... ipfs://bafkrei...');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const abiPath = path.join(__dirname, "..", "artifacts", "contracts", "CertificateNFT.sol", "CertificateNFT.json");
  const abi = JSON.parse(fs.readFileSync(abiPath)).abi;
  const nft = new ethers.Contract(process.env.CERTIFICATE_NFT_ADDRESS, abi, wallet);

  console.log("Minter:", wallet.address);
  console.log("Student:", studentName);
  console.log("Degree:", degree);
  console.log("University:", university);
  console.log("Credential Hash:", credentialHash);

  // Current timestamp as issue date
  const issueDate = Math.floor(Date.now() / 1000);

  // Mint the certificate
  const tx = await nft.mintCertificate(
    wallet.address,  // to
    studentName,     // studentName
    degree,          // degree
    university,      // university
    issueDate,       // issueDate (uint64 timestamp)
    credentialHash   // hash
  );
  
  console.log("tx:", tx.hash);
  const rcpt = await tx.wait();
  console.log("✅ Minted in block:", rcpt.blockNumber);

  // Extract tokenId from Transfer event
  const transferEvent = rcpt.logs.find(
    log => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  
  if (transferEvent) {
    const tokenId = ethers.toBigInt(transferEvent.topics[3]);
    console.log("Token ID:", tokenId.toString());

    // If URI provided, set it
    if (uri && typeof nft.setTokenURI === "function") {
      console.log("\nSetting tokenURI:", uri);
      const setTx = await nft.setTokenURI(tokenId, uri);
      console.log("Set URI tx:", setTx.hash);
      await setTx.wait();
      console.log("✅ tokenURI set");
    }
  }
}

main().catch(e => { 
  console.error(e); 
  process.exit(1); 
});