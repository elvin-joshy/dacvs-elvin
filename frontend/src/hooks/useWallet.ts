import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
const SEPOLIA_CHAIN_ID_DEC = 11155111;

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [isSepolia, setIsSepolia] = useState<boolean>(true);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  useEffect(() => {
    if (window.ethereum) {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          disconnect();
        }
      });

      window.ethereum.on('chainChanged', (chainIdHex: string) => {
        setIsSepolia(chainIdHex === SEPOLIA_CHAIN_ID_HEX);
      });

      // Initial check
      checkConnection(p);
    }
  }, []);

  const checkConnection = async (p: ethers.BrowserProvider) => {
    try {
      const network = await p.getNetwork();
      setIsSepolia(Number(network.chainId) === SEPOLIA_CHAIN_ID_DEC);

      const accounts = await p.listAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0].address);
        setSigner(await p.getSigner());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const connect = async () => {
    if (!window.ethereum) return toast.error("MetaMask not installed");
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      await checkConnection(p);
      
      const network = await p.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID_DEC) {
        promptSwitchNetwork();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to connect wallet");
    }
  };

  const disconnect = () => {
    setAccount(null);
    setSigner(null);
    // MetaMask doesn't have a formal disconnect method, but clearing local state solves UX
  };

  const promptSwitchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      setIsSepolia(true);
      toast.success("Switched to Sepolia");
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        toast.error("Please add Sepolia to your MetaMask networks.");
      } else {
        toast.error("Failed to switch network. Please switch manually.");
      }
    }
  };

  return {
    account,
    isSepolia,
    provider,
    signer,
    connect,
    disconnect,
    promptSwitchNetwork
  };
}
