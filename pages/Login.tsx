import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-white p-8 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.2)] max-w-sm w-full -rotate-1 relative">
         {/* Tape */}
         <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-8 bg-gray-200/50 rotate-3 backdrop-blur-sm"></div>

        <h2 className="text-3xl font-marker text-center mb-6 text-wood-900">Guild Master Access</h2>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block font-hand text-xl font-bold mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded font-sans focus:border-wood-500 outline-none"
            />
          </div>
          
          <div>
            <label className="block font-hand text-xl font-bold mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded font-sans focus:border-wood-500 outline-none"
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wood-700 text-white font-bold py-2 rounded hover:bg-wood-900 transition-colors shadow-md"
          >
            {loading ? 'Opening Gates...' : 'Enter'}
          </button>
        </form>
      </div>
      <p className="mt-8 text-white/80 font-hand text-xl text-center max-w-md">
        Note: Only the Guild Master (Admin) needs to log in here. Adventurers (Students) can interact with the board freely.
      </p>
    </div>
  );
};
