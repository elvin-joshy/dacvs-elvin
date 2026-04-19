require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Import your chosen uploader (pick one)
const uploadPinata = require("./ipfs_upload_pinata.js");
// const uploadWeb3Storage = require("./ipfs_upload.js");

function isValidCID(cid) {
  // Basic check: CID v0 starts with Qm, v1 starts with b (base32)
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})$/.test(cid);
}

async function testUpload(filePath) {
  console.log(`Testing upload: ${filePath}`);
  
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }

  // Run the uploader as a child process to capture stdout
  const { spawnSync } = require("child_process");
  const result = spawnSync("node", ["scripts/ipfs_upload_pinata.js", abs], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Upload failed: ${result.stderr}`);
  }

  const cid = result.stdout.trim().split("\n")[0]; // first line is CID
  console.log(`Returned CID: ${cid}`);

  // Validate CID format
  if (!isValidCID(cid)) {
    throw new Error(`Invalid CID format: ${cid}`);
  }
  console.log("✅ CID format valid");

  // Try to fetch from gateway (timeout 30s)
  const gatewayURL = `https://gateway.pinata.cloud/ipfs/${cid}`;
  console.log(`Checking gateway: ${gatewayURL}`);
  
  try {
    const resp = await axios.head(gatewayURL, { timeout: 30000 });
    if (resp.status === 200) {
      console.log("✅ File accessible via gateway");
    } else {
      console.warn(`⚠️  Gateway returned status ${resp.status}`);
    }
  } catch (e) {
    if (e.code === "ECONNABORTED") {
      console.warn("⚠️  Gateway timeout (file may still be propagating)");
    } else {
      console.warn(`⚠️  Gateway check failed: ${e.message}`);
    }
  }

  console.log("\n✅ Test passed. CID:", cid);
  return cid;
}

const testFile = process.argv[2] || "C:\\Users\\USER\\Downloads\\test4.pdf";
testUpload(testFile).catch((e) => {
  console.error("❌ Test failed:", e.message);
  process.exit(1);
});