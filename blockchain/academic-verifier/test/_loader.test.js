require("ts-node/register/transpile-only");
const path = require("path");
const glob = require("glob");

// Load all .test.ts and .spec.ts files so Mocha sees them
const patterns = ["**/*.test.ts", "**/*.spec.ts"];
for (const p of patterns) {
  const files = glob.sync(path.join(__dirname, p), { nodir: true });
  files.forEach((f) => require(f));
}