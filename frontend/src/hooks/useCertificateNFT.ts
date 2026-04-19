import { ethers } from 'ethers';
import CertificateNFTArtifact from '../../../blockchain/academic-verifier/artifacts/contracts/CertificateNFT.sol/CertificateNFT.json';
import Deployments from '../../../blockchain/academic-verifier/deployments/sepolia.json';

const CONTRACT_ADDRESS = Deployments.CertificateNFT;
const ABI = CertificateNFTArtifact.abi;

export function useCertificateNFT(signerOrProvider: ethers.Signer | ethers.Provider | null) {
  
  const getContract = () => {
    if (!signerOrProvider) throw new Error("No signer or provider available");
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signerOrProvider);
  };

  const mintCertificate = async (toAddress: string, studentName: string, degree: string, university: string, credentialHash: string) => {
    const contract = getContract();
    const nowTimestamp = Math.floor(Date.now() / 1000);
    try {
      const tx = await contract.mintCertificate(
        toAddress, 
        studentName, 
        degree, 
        university, 
        nowTimestamp, 
        credentialHash
      );
      
      return tx;
    } catch (e: any) {
       if (e.reason) throw new Error(e.reason);
       throw e;
    }
  };

  const getTokenURI = async (tokenId: number) => {
    const contract = getContract();
    return await contract.tokenURI(tokenId);
  };

  const getOwner = async (tokenId: number) => {
    const contract = getContract();
    return await contract.ownerOf(tokenId);
  };

  return {
    mintCertificate,
    getTokenURI,
    getOwner
  };
}
