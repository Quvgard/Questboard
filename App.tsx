import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, ShoppingBag, BookOpen, ShieldCheck } from 'lucide-react';
import BoardPage from './pages/BoardPage';
import RewardsPage from './pages/RewardsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

const Navbar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'bg-amber-800 text-white' : 'text-amber-100 hover:bg-amber-800/50';

  return (
    <nav className="cork-pattern text-amber-50 shadow-xl border-b-4 border-amber-900 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="w-8 h-8" />
          <span className="font-hand text-2xl font-bold tracking-wider">Гильдия Студентов</span>
        </Link>
        <div className="flex gap-2 sm:gap-4">
          <Link to="/" className={`px-4 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 ${isActive('/')}`}>
            <LayoutDashboard size={20} /> <span className="hidden sm:inline">Доска</span>
          </Link>
          <Link to="/rewards" className={`px-4 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 ${isActive('/rewards')}`}>
            <ShoppingBag size={20} /> <span className="hidden sm:inline">Магазин</span>
          </Link>
          <Link to="/admin" className={`px-4 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 ${isActive('/admin')}`}>
            <ShieldCheck size={20} /> <span className="hidden sm:inline">Мастер</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen pb-12">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<BoardPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" />
      </div>
    </HashRouter>
  );
};

export default App;
