import React, { useEffect, useState } from 'react';
import { fetchRewards } from '../services/api';
import { Reward } from '../types';
import { Loader, Gift } from 'lucide-react';

export const Shop: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRewards().then(setRewards).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin text-wood-900" /></div>;

  return (
    <div>
      <h1 className="text-4xl font-marker text-wood-900 text-center mb-8 -rotate-1">Guild Shop</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <div 
            key={reward.id} 
            className="bg-white p-6 rounded-lg shadow-lg border-4 border-wood-300 relative group overflow-hidden"
          >
             {/* Decorative tag */}
             <div className="absolute top-0 right-0 bg-wood-700 text-white px-3 py-1 rounded-bl-lg font-bold font-hand text-xl z-10">
                {reward.price} pts
             </div>

             <div className="flex items-center gap-3 mb-4 text-wood-800">
               <Gift size={32} />
               <h3 className="text-2xl font-marker">{reward.title}</h3>
             </div>
             
             <p className="font-hand text-xl text-gray-600 mb-6 min-h-[3rem]">
               {reward.description}
             </p>

             <button 
               className="w-full py-2 bg-wood-100 text-wood-900 font-bold rounded hover:bg-wood-200 transition-colors font-hand text-xl border-2 border-wood-300"
               onClick={() => alert("Please see the Guild Master to redeem this reward!")}
             >
               Redeem
             </button>
          </div>
        ))}
      </div>
    </div>
  );
};
