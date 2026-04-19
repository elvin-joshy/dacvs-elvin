require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("hardhat");

async function main() {
  const contractAddr = process.env.ACADEMIC_VERIFICATION_ADDRESS;
  if (!contractAddr) throw new Error("ACADEMIC_VERIFICATION_ADDRESS missing in .env");

  const studentId = "STUDENT123";
  const institutionId = "UNI-001";
  const credentialHash = ethers.keccak256(
    ethers.toUtf8Bytes(`credential:${studentId}:${institutionId}`)
  );

  const av = await ethers.getContractAt("AcademicVerification", contractAddr);
  const iface = av.interface;

  function encode(fn, args) {
    return iface.encodeFunctionData(fn, args);
  }
  function decode(fn, raw) {
    return iface.decodeFunctionResult(fn, raw);
  }

  const raw = await ethers.provider.send("eth_call", [
    { to: contractAddr, data: encode("verifyCredential", [credentialHash]) },
    "latest",
  ]);
  const decoded = decode("verifyCredential", raw);
  const [valid, stud, inst, issuer, issuedAt, revoked] = decoded;
  console.log("Valid:", valid);
  if (valid) {
    console.log("StudentId:", stud);
    console.log("InstitutionId:", inst);
    console.log("Issuer:", issuer);
    console.log("IssuedAt:", issuedAt.toString());
    console.log("Revoked:", revoked);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});