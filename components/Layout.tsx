import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, Store, Lock, LogOut } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [session, setSession] = React.useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navLinkClass = (path: string) => `
    flex items-center gap-2 px-4 py-2 rounded-t-lg font-hand text-xl font-bold transition-colors
    ${location.pathname === path 
      ? 'bg-wood-100 text-wood-900 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] translate-y-1' 
      : 'bg-wood-900 text-wood-100 hover:bg-wood-700'
    }
  `;

  return (
    <div className="min-h-screen bg-wood-700 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] font-sans pb-10">
      {/* Header / Nav */}
      <header className="bg-wood-900 text-wood-100 shadow-md sticky top-0 z-50 border-b-4 border-wood-500">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-3xl font-marker tracking-wider text-white drop-shadow-md">
              Quest Board
            </Link>
            
            <nav className="flex gap-2 h-full items-end">
              <Link to="/" className={navLinkClass('/')}>
                <ClipboardList size={20} />
                <span className="hidden sm:inline">Quests</span>
              </Link>
              <Link to="/shop" className={navLinkClass('/shop')}>
                <Store size={20} />
                <span className="hidden sm:inline">Shop</span>
              </Link>
              {session ? (
                 <>
                  <Link to="/admin" className={navLinkClass('/admin')}>
                    <Lock size={20} />
                    <span className="hidden sm:inline">Guild Hall</span>
                  </Link>
                   <button onClick={handleLogout} className="px-3 py-2 text-wood-300 hover:text-white">
                      <LogOut size={20} />
                   </button>
                 </>
              ) : (
                <Link to="/login" className="px-4 py-2 text-wood-300 hover:text-white font-hand text-lg">
                   Guild Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area - The "Board" */}
      <main className="container mx-auto px-4 py-8">
        {/* Board Frame Effect */}
        <div className="bg-wood-500 p-4 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] border-8 border-wood-900 min-h-[80vh]">
          <div className="bg-wood-300 min-h-full rounded-sm p-6 shadow-inner relative overflow-hidden">
             {/* Cork texture overlay */}
             <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cork-1.png')]"></div>
             
             <div className="relative z-10">
               {children}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};
