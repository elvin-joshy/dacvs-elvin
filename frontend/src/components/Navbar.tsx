import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Wallet } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('dacvs_token');
  const role = localStorage.getItem('dacvs_role');
  const wallet = localStorage.getItem('dacvs_wallet');

  const logout = () => {
    localStorage.removeItem('dacvs_token');
    localStorage.removeItem('dacvs_role');
    localStorage.removeItem('dacvs_wallet');
    navigate('/');
  };

  const truncateAddress = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="w-full px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">DACVS</span>
        </Link>
        
        <div className="flex items-center space-x-6">
          <Link to="/verify" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors font-medium">Verify</Link>
          
          {token ? (
            <div className="flex items-center space-x-4">
              {role === 'institution' && (
                <Link to="/dashboard/institution" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors font-medium">Dashboard</Link>
              )}
              {role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors font-medium">Admin</Link>
              )}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{wallet ? truncateAddress(wallet) : ''}</span>
              </div>
              <button onClick={logout} className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link to="/auth" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm">
              <Wallet className="h-4 w-4" />
              <span>Connect</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
