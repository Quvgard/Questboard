import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Reward } from '../types';
import { Gift, ShoppingBag } from 'lucide-react';

const RewardsPage: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) console.error(error);
      else setRewards(data || []);
      setLoading(false);
    };
    fetchRewards();
  }, []);

  if (loading) return <div className="text-center py-20 font-hand text-2xl">Загрузка товаров...</div>;

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-hand font-bold text-gray-800 mb-2">Лавка Наград</h1>
        <p className="text-gray-600">Обменивайте заработанные баллы на ценные призы</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 flex flex-col hover:shadow-xl transition-shadow">
            <div className="h-32 bg-amber-100 flex items-center justify-center">
              <Gift size={48} className="text-amber-600" />
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-bold mb-2 text-gray-800">{reward.title}</h3>
              <p className="text-gray-600 mb-6 flex-grow">{reward.description}</p>
              
              <div className="flex justify-between items-center mt-auto">
                <span className="text-2xl font-bold text-amber-600">{reward.price} б.</span>
                <button className="px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2">
                  <ShoppingBag size={18} /> Купить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {rewards.length === 0 && (
         <div className="text-center py-12 text-gray-500 font-hand text-xl">
           Магазин пока пуст. Скоро завоз!
         </div>
      )}
    </div>
  );
};

export default RewardsPage;
