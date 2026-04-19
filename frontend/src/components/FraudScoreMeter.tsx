import { motion } from 'framer-motion';

export default function FraudScoreMeter({ score }: { score: number }) {
  // Score is 0.0 to 1.0. Lower is better.
  const percent = score * 100;
  
  let color = "bg-green-500";
  let text = "text-green-600 dark:text-green-400";
  let label = "Legitimate";

  if (score >= 0.4) {
    color = "bg-red-500";
    text = "text-red-600 dark:text-red-400";
    label = "High Fraud Risk";
  } else if (score >= 0.2) {
    color = "bg-yellow-500";
    text = "text-yellow-600 dark:text-yellow-400";
    label = "Suspicious";
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Confidence</span>
        <div className="text-right">
          <span className={`text-xl font-bold ${text}`}>{percent.toFixed(1)}%</span>
          <span className="block text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
      </div>
      <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-400 flex justify-between">
        <span>0% (Perfect)</span>
        <span>40% (Threshold)</span>
        <span>100% (Fake)</span>
      </div>
    </div>
  );
}
