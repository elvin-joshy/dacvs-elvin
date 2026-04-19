const { ethers } = require('ethers');
const env = require('../config/env');

// Minimal ABI required for read-only validation
const academicVerificationABI = [
  "function verifyCredential(bytes32 _credentialHash) external view returns (bool valid, string memory studentId, string memory institutionId, address issuer, uint256 issuedAt, bool revoked)"
];

const certificateNFTABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function hashUsed(bytes32 hash) view returns (bool)"
];

let provider;
let academicContract;
let nftContract;

const initBlockchainService = () => {
  if (env.rpcUrl && env.contractAddress && env.nftContractAddress) {
    try {
      provider = new ethers.JsonRpcProvider(env.rpcUrl);
      academicContract = new ethers.Contract(env.contractAddress, academicVerificationABI, provider);
      nftContract = new ethers.Contract(env.nftContractAddress, certificateNFTABI, provider);
      console.log('Blockchain service initialized (Read-Only)');
    } catch (e) {
      console.error('Failed to init blockchain provider', e);
    }
  } else {
    console.warn('RPC_URL or CONTRACT_ADDRESS not found, skipping blockchainInit');
  }
};

const verifyOnChain = async (credentialHash) => {
  if (!academicContract) return null;
  try {
    const result = await academicContract.verifyCredential(credentialHash);
    return {
      isValid: result[0],
      studentId: result[1],
      institutionId: result[2],
      issuer: result[3],
      issuedAt: result[4].toString(),
      isRevoked: result[5]
    };
  } catch (err) {
    console.error('verifyOnChain error:', err.message);
    return null;
  }
};

const checkHashUsedInNFT = async (credentialHash) => {
  if (!nftContract) return null;
  try {
    return await nftContract.hashUsed(credentialHash);
  } catch (err) {
    console.error('checkHashUsedInNFT error:', err.message);
    return null;
  }
};

module.exports = {
  initBlockchainService,
  verifyOnChain,
  checkHashUsedInNFT
};
