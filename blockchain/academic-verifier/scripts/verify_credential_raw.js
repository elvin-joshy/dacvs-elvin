require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

async function main() {
  const rpc = process.env.SEPOLIA_RPC_URL;
  const avAddrEnv = process.env.ACADEMIC_VERIFICATION_ADDRESS;

  if (!rpc) throw new Error("SEPOLIA_RPC_URL missing");
  if (!avAddrEnv) throw new Error("ACADEMIC_VERIFICATION_ADDRESS missing");

  let avAddr;
  try {
    avAddr = ethers.getAddress(avAddrEnv);
  } catch (e) {
    throw new Error(`Invalid ACADEMIC_VERIFICATION_ADDRESS: ${avAddrEnv}`);
  }

  const abiPath = path.join(__dirname, "..", "artifacts", "contracts", "AcademicVerification.sol", "AcademicVerification.json");
  if (!fs.existsSync(abiPath)) throw new Error("Compile first");
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;

  const provider = new ethers.JsonRpcProvider(rpc);
  const av = new ethers.Contract(avAddr, abi, provider);

  const credentialHash = process.argv[2]; // allow passing hash from CLI
  if (!credentialHash) return console.log("Usage: node verify_credential_raw.js <credentialHash>");

  const r = await av.verifyCredential(credentialHash);
  const [valid, stud, inst, issuer, issuedAt, revoked] = r;

  console.log("Valid:", valid);
  if (valid) {
    console.log("StudentId:", stud);
    console.log("InstitutionId:", inst);
    console.log("Issuer:", issuer);
    console.log("IssuedAt:", issuedAt.toString());
    console.log("Revoked:", revoked);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
