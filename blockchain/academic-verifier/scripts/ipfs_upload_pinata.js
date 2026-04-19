require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

function buildHeaders() {
  const jwt = process.env.PINATA_JWT?.trim();
  const key = process.env.PINATA_API_KEY?.trim();
  const secret = process.env.PINATA_API_SECRET?.trim();
  if (jwt) return { Authorization: `Bearer ${jwt}` };
  if (key && secret) return { pinata_api_key: key, pinata_secret_api_key: secret };
  throw new Error("Missing credentials: set PINATA_JWT or both PINATA_API_KEY and PINATA_API_SECRET in .env");
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Usage: node scripts/ipfs_upload_pinata.js <path-to-file>");
    process.exit(1);
  }
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`File not found: ${abs}`);

  const fd = new FormData();
  fd.append("file", fs.createReadStream(abs), path.basename(abs));

  const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", fd, {
    headers: { ...fd.getHeaders(), ...buildHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const cid = res.data?.IpfsHash;
  if (!cid) throw new Error("No CID returned");
  console.log(cid);
  console.error(`Gateway: https://gateway.pinata.cloud/ipfs/${cid}`);
}

main().catch(e => {
  console.error(e.response?.data || e.message || e);
  process.exit(1);
});