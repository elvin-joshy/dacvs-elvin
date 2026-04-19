/**
 * @file env.js
 * @description Centralised environment variable loader with fail-fast validation.
 *              Every required variable is checked at startup; missing values cause
 *              an immediate process exit with a clear error message.
 */
require('dotenv').config();

const REQUIRED_VARS = [
  { key: 'MONGO_URI',    desc: 'MongoDB connection string' },
  { key: 'JWT_SECRET',   desc: 'Secret used to sign JWT tokens' },
];

const missing = REQUIRED_VARS.filter(v => !process.env[v.key]);
if (missing.length > 0) {
  console.error('\n========== MISSING ENVIRONMENT VARIABLES ==========');
  missing.forEach(v => console.error(`  ✗  ${v.key}  —  ${v.desc}`));
  console.error('====================================================\n');
  console.error('Create a .env file in /backend with the above variables.');
  process.exit(1);
}

module.exports = {
  port:               process.env.PORT || 3000,
  mongoUri:           process.env.MONGO_URI,
  jwtSecret:          process.env.JWT_SECRET,
  flaskAiUrl:         process.env.FLASK_AI_URL || 'http://localhost:8000',
  rpcUrl:             process.env.RPC_URL || 'http://127.0.0.1:8545',
  contractAddress:    process.env.CONTRACT_ADDRESS || '',
  nftContractAddress: process.env.NFT_CONTRACT_ADDRESS || ''
};
