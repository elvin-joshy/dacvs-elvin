require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("hardhat");

async function main() {
  const nftAddr = process.env.CERTIFICATE_NFT_ADDRESS;
  if (!nftAddr) throw new Error("CERTIFICATE_NFT_ADDRESS missing in .env");

  const [owner] = await ethers.getSigners();
  const ownerAddr = await owner.getAddress();
  console.log("Owner:", ownerAddr);
  console.log("NFT Contract:", nftAddr);

  const nft = await ethers.getContractAt("CertificateNFT", nftAddr, owner);

  const studentName = "Alice Example";
  const degree = "BSc Computer Science";
  const university = "Demo University";
  const issueDate = Math.floor(Date.now() / 1000);
  const docHash = ethers.keccak256(
    ethers.toUtf8Bytes("certificate:Alice Example:Demo University:BSc CS")
  );

  console.log("Minting hash:", docHash);
  const tx = await nft.mintCertificate(
    ownerAddr,
    studentName,
    degree,
    university,
    issueDate,
    docHash
  );
  console.log("Mint tx:", tx.hash);
  await tx.wait();

  const cert = await nft.getCertificate(1);
  console.log("Token1 student:", cert[0]);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});