require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("hardhat");

async function main() {
  const contractAddr = process.env.ACADEMIC_VERIFICATION_ADDRESS;
  if (!contractAddr) throw new Error("ACADEMIC_VERIFICATION_ADDRESS missing in .env");

  const [signer] = await ethers.getSigners();
  const myAddr = await signer.getAddress();
  console.log("Signer:", myAddr);
  console.log("Contract:", contractAddr);

  const av = await ethers.getContractAt("AcademicVerification", contractAddr, signer);
  const iface = av.interface;

  // Raw call helper bypassing resolveName
  async function rawCall(fn, args) {
    const data = iface.encodeFunctionData(fn, args);
    const raw = await ethers.provider.send("eth_call", [{ to: contractAddr, data }, "latest"]);
    return iface.decodeFunctionResult(fn, raw);
  }

  // Check mapping institutions(address)
  let [registered] = await rawCall("institutions", [myAddr]);
  if (!registered) {
    console.log("Registering institution...");
    const tx = await av.setInstitution(myAddr, true);
    console.log("Register tx:", tx.hash);
    await tx.wait();
    [registered] = await rawCall("institutions", [myAddr]);
  }
  console.log("Registered:", registered);

  const studentId = "STUDENT123";
  const institutionId = "UNI-001";
  const credentialHash = ethers.keccak256(
    ethers.toUtf8Bytes(`credential:${studentId}:${institutionId}`)
  );

  // Check not already issued
  const pre = await rawCall("verifyCredential", [credentialHash]);
  if (pre[0]) {
    console.log("Already issued. Skipping.");
    return;
  }

  console.log("Issuing credential hash:", credentialHash);
  const tx2 = await av.issueCredential(credentialHash, studentId, institutionId);
  console.log("Issue tx:", tx2.hash);
  await tx2.wait();

  const post = await rawCall("verifyCredential", [credentialHash]);
  console.log("Issued valid:", post[0], "Student:", post[1], "Institution:", post[2]);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});