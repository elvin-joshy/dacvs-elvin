import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function AuthWallet() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask is required to connect.');
      return;
    }

    try {
      setLoading(true);
      // 1. Request accounts
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      // 2. Fetch Nonce from backend
      const resNonce = await api.post('/auth/nonce', { walletAddress: address });
      const nonce = resNonce.data.nonce;

      // 3. Request Signature
      const signer = await provider.getSigner();
      const message = `Sign this message to authenticate with DACVS. Nonce: ${nonce}`;
      const signature = await signer.signMessage(message);

      // 4. Verify Signature
      const resVerify = await api.post('/auth/verify', {
        walletAddress: address,
        signature
      });

      if (resVerify.data.success) {
        localStorage.setItem('dacvs_token', resVerify.data.token);
        localStorage.setItem('dacvs_role', resVerify.data.user.role);
        localStorage.setItem('dacvs_wallet', resVerify.data.user.walletAddress);

        toast.success(`Connected as ${resVerify.data.user.role}`);

        // Redirect appropriately
        if (resVerify.data.user.role === 'admin') navigate('/admin');
        else if (resVerify.data.user.role === 'institution') navigate('/dashboard/institution');
        else navigate('/');
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Authentication denied or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl text-center">
      <div className="h-20 w-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Wallet className="h-10 w-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Web3 Authentication</h2>
      <p className="text-gray-500 mb-8">Connect your wallet to mathematically prove your identity and access your portal.</p>
      
      <button 
        onClick={connectWallet}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold transition-all shadow-lg"
      >
        {loading ? 'Requesting Signature...' : 'Connect MetaMask'}
      </button>
    </div>
  );
}
