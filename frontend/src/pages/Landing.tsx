import { motion } from 'framer-motion';
import { ArrowRight, Shield, Cpu, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-24">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-4xl mx-auto"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
          Tamper-proof academic <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
            credentials on Ethereum.
          </span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          The decentralized hybrid architecture fusing AI-driven OCR fraud verification with immutable smart contract registries. Stop fake degrees at the exact point of issue.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/verify" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
             Verify a Credential <ArrowRight className="w-5 h-5"/>
          </Link>
          <Link to="/auth" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold shadow-sm transition-all">
             Institution Portal
          </Link>
        </div>
      </motion.div>

      {/* Feature grid */}
      <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl mt-32">
        {[
          { icon: Cpu, title: 'Upload & Extract', desc: 'Securely upload raw PDFs or PNGs. Multi-stage OCR processes natural text extraction entirely locally.' },
          { icon: Activity, title: 'AI Fraud Verification', desc: 'Analyzes visual anomalies, laplacian blur variance, and structural anomalies assigning a fraud probability score.' },
          { icon: Shield, title: 'Immutable Blockchain', desc: 'Degrees bridging the 0.40 score threshold are irrevocably hashed to Sepolia as ERC-721 token standards.' }
        ].map((feature, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.2 }}
            className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow"
          >
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mb-6">
              <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
