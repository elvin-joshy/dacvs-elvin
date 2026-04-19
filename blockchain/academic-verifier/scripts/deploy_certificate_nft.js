require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying CertificateNFT with account:", await deployer.getAddress());

  const F = await ethers.getContractFactory("CertificateNFT");
  const contract = await F.deploy();
  await contract.waitForDeployment();
  const address = contract.target;
  
  console.log("CertificateNFT deployed to:", address);

  // Save to deployments JSON
  const destDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
  const destFile = path.join(destDir, "sepolia.json");
  
  let data = {};
  if (fs.existsSync(destFile)) {
    data = JSON.parse(fs.readFileSync(destFile));
  }
  data["CertificateNFT"] = address;
  
  fs.writeFileSync(destFile, JSON.stringify(data, null, 2));
  console.log("Written to deployments/sepolia.json");
}

main().catch(e => { console.error(e); process.exit(1); });