import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function VerifierPublic() {
  const [searchParams] = useSearchParams();
  const [hash, setHash] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Auto-search if ?hash= query param is present
  useEffect(() => {
    const queryHash = searchParams.get('hash');
    if (queryHash) {
      setHash(queryHash);
      performLookup(queryHash);
    }
  }, [searchParams]);

  const performLookup = async (searchHash: string) => {
    if (!searchHash) return;
    setLoading(true);
    try {
      const res = await api.get(`/verify/${searchHash}`);
      setResult(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Hash lookup failed.");
      setResult({ notFound: true });
    } finally {
      setLoading(false);
    }
  };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(hash);
  };

  return (
    <div className="max-w-2xl mx-auto mt-20">
       <div className="text-center mb-10">
         <h1 className="text-3xl font-bold mb-3">Verify Academic Credential</h1>
         <p className="text-gray-500">Enter the cryptographic hash to fetch real-time on-chain data.</p>
       </div>
       
       <form onSubmit={lookup} className="flex gap-2 mb-10">
         <input 
           value={hash} 
           onChange={(e) => setHash(e.target.value)} 
           className="flex-1 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" 
           placeholder="0x..."
         />
         <button disabled={loading} className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center">
           {loading ? '...' : <Search className="w-5 h-5" />}
         </button>
       </form>

       {result && !result.notFound && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
            {result.status?.isRevoked && <div className="absolute top-0 right-0 py-1 px-8 bg-red-500 text-white font-bold text-xs rotate-45 translate-x-6 translate-y-4 shadow-sm tracking-wider">REVOKED</div>}
            
            <div className="flex gap-4 items-start border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
               <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white shrink-0 ${result.status?.isRevoked ? 'bg-red-500' : (result.status?.isIssuedOnChain ? 'bg-green-500' : 'bg-gray-300')}`}>
                 <ShieldIcon className="w-8 h-8" />
               </div>
               <div>
                 <h2 className="text-2xl font-bold">{result.dbRecord?.studentName || "Identity Verified"}</h2>
                 <p className="text-lg text-gray-500">{result.dbRecord?.degree}</p>
                 <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mt-1">{result.dbRecord?.institution || result.onChainRecord?.institutionId}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-xs text-gray-500 uppercase">On-Chain Status</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{result.status?.isIssuedOnChain ? 'Minted (Sepolia)' : 'Unminted'}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 uppercase">Issue Date</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{result.dbRecord?.issuedAt ? new Date(result.dbRecord.issuedAt).toLocaleDateString() : 'N/A'}</p>
               </div>
               {result.status?.isRevoked && (
                 <div className="col-span-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                   <p className="text-red-600 dark:text-red-400 font-semibold text-sm">⚠ This credential has been revoked by the issuing institution.</p>
                 </div>
               )}
            </div>

            {result.dbRecord?.txHash && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <a 
                  href={`https://sepolia.etherscan.io/tx/${result.dbRecord.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Transaction on Etherscan ↗
                </a>
              </div>
            )}
         </motion.div>
       )}

       {result?.notFound && (
         <div className="text-center p-10 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
           <p className="text-red-500 font-bold text-lg">No Match Found</p>
           <p className="text-gray-500 text-sm mt-2">This hash does not match any active or revoked credentials across our immutable registries.</p>
         </div>
       )}
    </div>
  );
}

function ShieldIcon(props: any) {
  return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
