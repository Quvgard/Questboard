import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Board } from './pages/Board';
import { Shop } from './pages/Shop';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { supabase } from './services/supabaseClient';

// Fix: Make children optional to prevent TypeScript error "Property 'children' is missing in type '{}'"
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = React.useState<any | null | undefined>(undefined);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  if (session === undefined) return null; // Loading
  if (!session) return <Navigate to="/login" />;

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Board />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;