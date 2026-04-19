import { useState } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Admin() {
  const [walletAddress, setWalletAddress] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const whitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !name) return toast.error("All fields required");
    
    setLoading(true);
    try {
      await api.post('/institutions/whitelist', { walletAddress, name });
      toast.success(`${name} successfully whitelisted & upgraded to Institution role.`);
      setWalletAddress('');
      setName('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to whitelist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
           <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-xl">
             <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
           </div>
           <div>
             <h2 className="text-2xl font-bold">Admin Portal</h2>
             <p className="text-gray-500">Decentralized Autonomous Verification Node</p>
           </div>
        </div>

        <form onSubmit={whitelist} className="space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide text-sm mb-4">Whitelist New Institution</h3>
          <input 
            value={walletAddress} 
            onChange={(e) => setWalletAddress(e.target.value)} 
            placeholder="Ethereum Wallet Address (0x...)" 
            className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-none font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500" 
            required 
          />
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Official Institution Name" 
            className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-blue-500" 
            required 
          />
          <button 
            disabled={loading} 
            className="w-full py-4 mt-2 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-bold rounded-xl shadow-lg transition-colors"
          >
            {loading ? "Processing..." : <><Plus className="w-5 h-5"/> Register onto Network</>}
          </button>
        </form>
      </div>
    </div>
  );
}
