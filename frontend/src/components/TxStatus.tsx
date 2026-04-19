import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

export type TransactionState = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error';

interface TxStatusProps {
  status: TransactionState;
  title: string;
  txHash?: string;
  error?: string;
}

export default function TxStatus({ status, title, txHash, error }: TxStatusProps) {
  if (status === 'idle') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-lg mt-4 w-full"
    >
      <div className="flex items-start gap-4">
        <div className="mt-1">
          {status === 'pending' && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
          {status === 'confirming' && <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />}
          {status === 'confirmed' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
          {status === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
        </div>
        
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 dark:text-gray-100">
            {status === 'pending' && `Action Required: Sign "${title}"`}
            {status === 'confirming' && "Mining Transaction..."}
            {status === 'confirmed' && "Transaction Confirmed!"}
            {status === 'error' && "Transaction Failed"}
          </h4>
          
          <p className="text-sm text-gray-500 mt-1">
            {status === 'pending' && "Please check your MetaMask wallet to sign the transaction."}
            {status === 'confirming' && "Waiting for blockchain confirmation block..."}
            {status === 'confirmed' && "Successfully secured on the Sepolia network."}
            {status === 'error' && (error || "An unknown error occurred or you rejected the transaction.")}
          </p>

          {txHash && (
            <a 
              href={`https://sepolia.etherscan.io/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 py-1.5 px-3 rounded-lg transition-colors"
            >
              View on Etherscan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
