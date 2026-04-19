require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const axios = require("axios");

async function main() {
  const fileCID = process.argv[2];
  const name = process.argv[3] || "Certificate";
  const description = process.argv[4] || "Academic Certificate";

  if (!fileCID) {
    console.log(
      'Usage: node scripts/build_and_upload_metadata.js <PDF_CID> "Name" "Description"'
    );
    process.exit(1);
  }

  if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
    throw new Error("Missing PINATA_API_KEY or PINATA_API_SECRET in .env");
  }

  const metadata = {
    name,
    description,
    image: `ipfs://${fileCID}`,
  };

  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    metadata,
    {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
        "Content-Type": "application/json",
      },
    }
  );

  const cid = response.data.IpfsHash;

  console.log("\nMetadata CID:", cid);
  console.log("tokenURI: ipfs://" + cid);
  console.log("Gateway:");
  console.log("https://gateway.pinata.cloud/ipfs/" + cid);
}

main().catch((err) => {
  console.error(err.response?.data || err.message);
  process.exit(1);
});