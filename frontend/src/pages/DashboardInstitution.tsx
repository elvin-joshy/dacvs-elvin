import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FileUp, AlertTriangle, Download, QrCode, User, GraduationCap, Building, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { pdf } from '@react-pdf/renderer';
import api from '../services/api';
import FraudScoreMeter from '../components/FraudScoreMeter';
import TxStatus, { type TransactionState } from '../components/TxStatus';
import PDFCertificate from '../components/PDFCertificate';
import { useWallet } from '../hooks/useWallet';
import { useAcademicVerification } from '../hooks/useAcademicVerification';
import { useCertificateNFT } from '../hooks/useCertificateNFT';

export default function DashboardInstitution() {
  const { register, reset, setValue, getValues } = useForm();
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pastCredentials, setPastCredentials] = useState<any[]>([]);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Hook integrations
  const { signer, promptSwitchNetwork, isSepolia } = useWallet();
  const { issueCredential } = useAcademicVerification(signer);
  const { mintCertificate } = useCertificateNFT(signer);

  // Tx Status tracking
  const [tx1State, setTx1State] = useState<{ status: TransactionState; hash?: string; error?: string }>({ status: 'idle' });
  const [tx2State, setTx2State] = useState<{ status: TransactionState; hash?: string; error?: string; tokenId?: number }>({ status: 'idle' });

  // Success data stored after full pipeline completes
  const [successData, setSuccessData] = useState<any>(null);

  const wallet = localStorage.getItem('dacvs_wallet');

  useEffect(() => {
    refreshHistorical();
  }, [wallet]);

  const refreshHistorical = async () => {
    if (wallet) {
      try {
        const res = await api.get(`/credentials/institution/${wallet}`);
        setPastCredentials(res.data.data);
      } catch (err) {
        console.error("Failed fetching historical", err);
      }
    }
  };

  const onAnalyze = async () => {
    if (!file) return toast.error("File is required");
    
    // Bypass handleSubmit to allow analyzing empty forms
    const currentValues = getValues();
    console.log("Starting AI Analysis for file:", file.name);

    const formData = new FormData();
    formData.append('studentName', currentValues.studentName || '');
    formData.append('degree', currentValues.degree || '');
    formData.append('institutionName', currentValues.institutionName || '');
    formData.append('file', file);

    setLoading(true);
    setAnalysis(null);
    setSuccessData(null);
    setTx1State({ status: 'idle' });
    setTx2State({ status: 'idle' });

    try {
      console.log("Calling Backend: /api/credentials/analyze");
      const res = await api.post('/credentials/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const result = res.data.data;
      console.log("Analysis Result Received:", result);
      setAnalysis(result);
      
      // Auto-fill logic
      if (result.suggestedData) {
        const { studentName, degree, institution } = result.suggestedData;
        let filledCount = 0;
        
        console.log("AI Suggestions:", result.suggestedData);

        if (studentName) {
          setValue('studentName', studentName, { shouldDirty: true, shouldValidate: true });
          filledCount++;
        }
        if (degree) {
          setValue('degree', degree, { shouldDirty: true, shouldValidate: true });
          filledCount++;
        }
        if (institution) {
          setValue('institutionName', institution, { shouldDirty: true, shouldValidate: true });
          filledCount++;
        }
        
        if (filledCount > 0) {
          toast.success(`AI Auto-filled ${filledCount} fields from document!`, {
            icon: '🤖',
            duration: 4000
          });
        }
      }

      toast.success("AI Analysis complete!");
    } catch (err: any) {
      console.error("Analysis Pipeline Error:", err);
      if (err.response?.data?.fraudScore !== undefined) {
         setAnalysis({
           blocked: true,
           fraudScore: err.response.data.fraudScore,
           error: err.response.data.error
         });
         toast.error("Document Failed AI Checks");
      } else {
         toast.error(err.response?.data?.error || "Error analyzing document");
      }
    } finally {
      setLoading(false);
    }
  };

  const executeBlockchainIssuance = async () => {
    if (!analysis || analysis.blocked) return;
    if (!signer) return toast.error("Wallet not attached!");
    
    // CRITICAL: Get current form values (which may have been edited after auto-fill)
    const formData = getValues();
    if (!formData.studentName || !formData.degree || !formData.institutionName) {
      return toast.error("All fields are required before issuing.");
    }

    if (!isSepolia) {
       toast.error("Please switch your network to Sepolia to issue transactions.");
       promptSwitchNetwork();
       return;
    }

    try {
      // Step 1: Issue Credential on Registry
      setTx1State({ status: 'pending' });
      const auth1 = await issueCredential("STU-1", "INST-001", analysis.credentialHash);
      setTx1State({ status: 'confirming', hash: auth1.hash });
      
      const receipt1 = await auth1.wait();
      if (!receipt1 || receipt1.status === 0) throw new Error("Transaction failed during mining");
      setTx1State({ status: 'confirmed', hash: auth1.hash });

      // Step 2: Mint NFT
      setTx2State({ status: 'pending' });
      const targetAddress = wallet || "0x0000000000000000000000000000000000000000";
      const auth2 = await mintCertificate(
        targetAddress,
        formData.studentName,
        formData.degree,
        formData.institutionName,
        analysis.credentialHash
      );
      setTx2State({ status: 'confirming', hash: auth2.hash });
      
      const receipt2 = await auth2.wait();
      if (!receipt2 || receipt2.status === 0) throw new Error("Transaction failed during NFT mining");
      
      let parsedTokenId = 0;
      if (receipt2.logs && receipt2.logs[0]) parsedTokenId = Number(receipt2.logs[0].topics[3]) || 0;
      setTx2State({ status: 'confirmed', hash: auth2.hash, tokenId: parsedTokenId });

      // Step 3: Record permanently into Backend MongoDB
      await api.post('/credentials/issue', {
        studentName: formData.studentName,
        degree: formData.degree,
        institution: formData.institutionName,
        credentialHash: analysis.credentialHash,
        fraudScore: analysis.fraudScore,
        ocrText: analysis.ocrText,
        txHashIssue: auth1.hash,
        txHashMint: auth2.hash,
        tokenId: parsedTokenId
      });

      toast.success("Successfully anchored and recorded!");
      
      // Store success data for QR and PDF
      setSuccessData({
        studentName: formData.studentName,
        degree: formData.degree,
        institution: formData.institutionName,
        credentialHash: analysis.credentialHash,
        txHashIssue: auth1.hash,
        txHashMint: auth2.hash,
        tokenId: parsedTokenId,
        issuedAt: new Date().toISOString()
      });

      refreshHistorical();

    } catch (error: any) {
      console.error(error);
      const isReject = error.code === 'ACTION_REJECTED' || error.message?.includes('rejected');
      
      if (tx1State.status === 'pending' || tx1State.status === 'confirming') {
         setTx1State({ status: 'error', error: isReject ? "User rejected signature in MetaMask" : error.message });
      } else if (tx2State.status === 'pending' || tx2State.status === 'confirming') {
         setTx2State({ status: 'error', error: isReject ? "Minting signature was rejected" : error.message });
      } else {
         toast.error(error.message || "Transaction pipeline failed");
      }
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `dacvs-qr-${successData?.credentialHash?.slice(0, 10)}.png`;
    a.click();
  };

  const downloadPDF = async () => {
    if (!successData) return;
    try {
      toast.loading("Generating PDF...", { id: 'pdf' });
      const blob = await pdf(
        <PDFCertificate
          studentName={successData.studentName}
          degree={successData.degree}
          institution={successData.institution}
          credentialHash={successData.credentialHash}
          txHash={successData.txHashMint}
          issueDate={successData.issuedAt}
          tokenId={successData.tokenId}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${successData.studentName.replace(/\s+/g, '_')}_Certificate.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF Downloaded!", { id: 'pdf' });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF", { id: 'pdf' });
    }
  };

  const qrPayload = successData ? JSON.stringify({
    hash: successData.credentialHash,
    verifyUrl: `${window.location.origin}/verify?hash=${successData.credentialHash}`,
    txHash: successData.txHashMint,
    issuedAt: successData.issuedAt
  }) : '';

  const resetFlow = () => {
    setAnalysis(null);
    setSuccessData(null);
    setFile(null);
    setTx1State({ status: 'idle' });
    setTx2State({ status: 'idle' });
    reset();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-10">
      <div className="space-y-6">
        {/* Show success screen or form */}
        {successData ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Credential Issued Successfully!</h2>
              <p className="text-sm text-gray-500 mt-2">{successData.studentName} — {successData.degree}</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <QRCodeCanvas ref={qrRef} value={qrPayload} size={200} level="H" includeMargin className="rounded-lg" />
              <button onClick={downloadQR} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                <QrCode className="w-4 h-4" /> Download QR as PNG
              </button>
            </div>

            {/* Etherscan Links */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-400">Hash: </span>
                <span className="text-gray-700 dark:text-gray-300 break-all">{successData.credentialHash}</span>
              </div>
              <div className="flex gap-2">
                <a href={`https://sepolia.etherscan.io/tx/${successData.txHashIssue}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                  Registry Tx ↗
                </a>
                <a href={`https://sepolia.etherscan.io/tx/${successData.txHashMint}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg hover:bg-purple-100 transition">
                  NFT Mint Tx ↗
                </a>
              </div>
              {successData.tokenId > 0 && (
                <p className="text-center text-gray-500">NFT Token ID: <span className="text-gray-900 dark:text-white font-bold">{successData.tokenId}</span></p>
              )}
            </div>

            {/* PDF Download */}
            <button onClick={downloadPDF} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-bold rounded-lg transition-colors">
              <Download className="w-5 h-5" /> Download PDF Certificate
            </button>

            <button onClick={resetFlow} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition">
              Issue Another Credential
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
              <h2 className="text-xl font-bold mb-4">Issue New Credential</h2>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Student Identity</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-gray-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input {...register("studentName")} placeholder="Enter student full name" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-gray-900 rounded-xl outline-none transition-all" />
                    {getValues('studentName') && analysis && !analysis.blocked && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full uppercase">
                          <CheckCircle className="w-3 h-3" /> AI Verified
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Degree / Certification Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-gray-400">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <input {...register("degree")} placeholder="e.g. B.Tech Computer Science" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-gray-900 rounded-xl outline-none transition-all" />
                    {getValues('degree') && analysis && !analysis.blocked && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full uppercase">
                          <CheckCircle className="w-3 h-3" /> AI Verified
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Issuing Institution</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-gray-400">
                      <Building className="h-5 w-5" />
                    </div>
                    <input {...register("institutionName")} placeholder="University or Institution Name" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-gray-900 rounded-xl outline-none transition-all" />
                    {getValues('institutionName') && analysis && !analysis.blocked && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full uppercase">
                          <CheckCircle className="w-3 h-3" /> AI Verified
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.png,.jpg" />
                  <div className="space-y-2">
                    <FileUp className="mx-auto h-8 w-8 text-blue-500 mb-2 animate-bounce" />
                    <p className="text-gray-900 dark:text-white font-bold">{file ? file.name : "Upload Certificate PDF or Image"}</p>
                    <p className="text-xs text-gray-500 font-medium bg-blue-50 dark:bg-blue-900/20 inline-block px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800/50">
                      ⚡ AI will automatically extract and fill all details for you
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={onAnalyze}
                  disabled={loading || (analysis && !analysis.blocked)} 
                  className="w-full py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                  {loading ? "Analyzing Document Architecture..." : "Analyze & Extract Data"}
                </button>
              </form>
            </div>

            {analysis && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2">AI Output Summary {analysis.blocked && <AlertTriangle className="text-red-500 w-5 h-5"/>}</h3>
                <FraudScoreMeter score={analysis.fraudScore} />
                
                {analysis.blocked ? (
                  <p className="mt-4 text-red-500 text-sm font-medium">{analysis.error}</p>
                ) : (
                  <div className="mt-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs font-mono mb-4 truncate text-gray-500">
                      Computed SHA256 Buffer: {analysis.credentialHash}
                    </div>
                    
                    {tx1State.status === 'idle' && (
                      <button 
                        onClick={executeBlockchainIssuance} 
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                      >
                        Proceed to Issue on Blockchain
                      </button>
                    )}

                    <TxStatus status={tx1State.status} title="Issue Credential on Main Registry" txHash={tx1State.hash} error={tx1State.error} />
                    <TxStatus status={tx2State.status} title="Mint Tokenized NFT Copy" txHash={tx2State.hash} error={tx2State.error} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px] lg:h-auto">
          <h2 className="text-xl font-bold mb-4">Historical Issuances</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
             {pastCredentials.map(cred => (
               <div key={cred._id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                 <div className="overflow-hidden">
                   <p className="font-semibold truncate">{cred.studentName}</p>
                   <p className="text-xs text-gray-500 truncate w-48 font-mono mt-1">{cred.credentialHash}</p>
                 </div>
                 <div className="text-right flex flex-col items-end w-32 border-l border-gray-200 dark:border-gray-700 pl-4 ml-4">
                   <FraudScoreMeter score={cred.fraudScore} />
                 </div>
               </div>
             ))}
             {pastCredentials.length === 0 && <p className="text-gray-500 text-sm italic">No credentials issued yet.</p>}
          </div>
      </div>
    </div>
  );
}
