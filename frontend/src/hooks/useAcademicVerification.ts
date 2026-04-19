import { ethers } from 'ethers';
import AcademicVerificationArtifact from '../contracts/AcademicVerification.json';
import Deployments from '../contracts/sepolia.json';

const CONTRACT_ADDRESS = Deployments.AcademicVerification;
const ABI = AcademicVerificationArtifact.abi;

export function useAcademicVerification(signerOrProvider: ethers.Signer | ethers.Provider | null) {
  
  const getContract = () => {
    if (!signerOrProvider) throw new Error("No signer or provider available");
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signerOrProvider);
  };

  const issueCredential = async (studentId: string, institutionId: string, credentialHash: string) => {
    const contract = getContract();
    try {
      const tx = await contract.issueCredential(credentialHash, studentId, institutionId);
      return tx; // Return tx object so frontend can track it
    } catch (e: any) {
      if (e.reason) throw new Error(e.reason);
      throw e;
    }
  };

  const revokeCredential = async (credentialHash: string) => {
    const contract = getContract();
    const tx = await contract.revokeCredential(credentialHash);
    return tx;
  };

  const verifyCredential = async (credentialHash: string) => {
    const contract = getContract();
    const result = await contract.verifyCredential(credentialHash);
    return {
      isValid: result[0],
      studentId: result[1],
      institutionId: result[2],
      issuer: result[3],
      issuedAt: Number(result[4]) * 1000,
      isRevoked: result[5]
    };
  };

  const batchVerify = async (hashes: string[]) => {
    const contract = getContract();
    const results = await contract.batchVerify(hashes);
    return results; // Array of booleans
  };

  const isInstitution = async (address: string) => {
    const contract = getContract();
    const status = await contract.institutions(address);
    return status;
  };

  return {
    issueCredential,
    revokeCredential,
    verifyCredential,
    batchVerify,
    isInstitution
  };
}
