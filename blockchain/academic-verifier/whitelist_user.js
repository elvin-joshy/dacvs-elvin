const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Using the address from the frontend's deployment file
    const contractAddress = "0x05353CB3465271217E7BBb59343a0C6066F179bC";
    const userAddress = "0x6c4eb81c114024406924d170bedf7e2fe2126e36";
    
    const abi = ["function setInstitution(address _institution, bool _approved) external"];
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    console.log(`Whitelisting ${userAddress} on contract ${contractAddress}...`);
    const tx = await contract.setInstitution(userAddress, true);
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`Whitelisting confirmed!`);
}

main().catch(console.error);
