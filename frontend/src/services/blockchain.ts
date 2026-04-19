import { ethers } from 'ethers';

// Fallback to Sepolia Infura or Alchemy here if not using injected window.ethereum
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

const academicVerificationABI = [
  "function verifyCredential(bytes32 _credentialHash) external view returns (bool valid, string memory studentId, string memory institutionId, address issuer, uint256 issuedAt, bool revoked)"
];

export const verifyCredentialOnChain = async (credentialHash: string) => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured in frontend .env');
  }

  let provider;
  if (window.ethereum) {
     provider = new ethers.BrowserProvider(window.ethereum);
  } else {
     provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, academicVerificationABI, provider);

  try {
    const result = await contract.verifyCredential(credentialHash);
    return {
      isValid: result[0],
      studentId: result[1],
      institutionId: result[2],
      issuer: result[3],
      issuedAt: Number(result[4]) * 1000, // Convert to JS ms
      isRevoked: result[5]
    };
  } catch (error) {
    console.error("Error verifying credential on chain:", error);
    throw error;
  }
};
