import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import AuthWallet from './pages/AuthWallet';
import DashboardInstitution from './pages/DashboardInstitution';
import VerifierPublic from './pages/VerifierPublic';
import Admin from './pages/Admin';

function App() {
  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<AuthWallet />} />
          <Route path="/dashboard/institution" element={<DashboardInstitution />} />
          <Route path="/admin" element={<Admin />} />
          {/* Support both specific hash lookup or blank verifier page */}
          <Route path="/verify/:hash" element={<VerifierPublic />} />
          <Route path="/verify" element={<VerifierPublic />} />
        </Routes>
      </main>
      <footer className="py-6 text-center text-gray-500 text-sm border-t dark:border-gray-800">
        &copy; {new Date().getFullYear()} DACVS - Decentralized Academic Credential Verification System
      </footer>
    </div>
  );
}

export default App;
