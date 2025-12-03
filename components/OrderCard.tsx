import React from 'react';
import { Order, Rank } from '../types';
import { Users, Coins, AlertCircle } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onTake?: (order: Order) => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

const rankColors: Record<Rank, string> = {
  [Rank.SS]: 'bg-red-100 border-red-300 text-red-900',
  [Rank.S]: 'bg-orange-100 border-orange-300 text-orange-900',
  [Rank.A]: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  [Rank.B]: 'bg-green-100 border-green-300 text-green-900',
  [Rank.C]: 'bg-blue-100 border-blue-300 text-blue-900',
};

const rankBadgeColors: Record<Rank, string> = {
  [Rank.SS]: 'bg-red-600 text-white',
  [Rank.S]: 'bg-orange-500 text-white',
  [Rank.A]: 'bg-yellow-500 text-black',
  [Rank.B]: 'bg-green-600 text-white',
  [Rank.C]: 'bg-blue-500 text-white',
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onTake, isAdmin, onDelete }) => {
  // Random slight rotation for "pinned" effect, memoized to prevent jitter on re-render
  const rotation = React.useMemo(() => Math.random() * 4 - 2, []);
  
  const isFull = order.taken_slots >= order.max_slots;
  const isCompleted = order.status === 'completed';

  return (
    <div 
      className={`relative group flex flex-col p-6 shadow-xl transition-transform hover:z-10 hover:scale-105 duration-200 ${rankColors[order.rank]}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Pin */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-sm border border-red-900 z-20"></div>

      <div className="flex justify-between items-start mb-4 font-marker">
        <span className={`px-2 py-1 rounded text-sm font-bold shadow-sm ${rankBadgeColors[order.rank]}`}>
          Rank {order.rank}
        </span>
        <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-full text-sm font-bold text-gray-700">
          <Coins size={14} className="text-yellow-600" />
          {order.reward_points}
        </div>
      </div>

      <h3 className="text-xl font-bold font-hand mb-2 leading-tight min-h-[3rem]">
        {order.title}
      </h3>
      
      <p className="font-hand text-lg mb-4 flex-grow opacity-90 leading-snug">
        {order.description}
      </p>

      <div className="mt-auto border-t border-black/10 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm font-bold text-gray-600">
          <Users size={16} />
          <span>{order.taken_slots}/{order.max_slots}</span>
        </div>

        {isAdmin ? (
          <button 
            onClick={() => onDelete?.(order.id)}
            className="text-red-600 hover:text-red-800 font-bold text-sm underline decoration-wavy"
          >
            Delete
          </button>
        ) : (
          <button
            onClick={() => !isFull && !isCompleted && onTake?.(order)}
            disabled={isFull || isCompleted}
            className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all font-hand text-lg
              ${isFull || isCompleted 
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-white hover:bg-gray-50 text-gray-800 active:translate-y-1'
              }
            `}
          >
            {isCompleted ? 'Closed' : isFull ? 'Full' : 'Take It!'}
          </button>
        )}
      </div>

      {(isFull || isCompleted) && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
           <div className="bg-red-700 text-white font-marker text-2xl px-4 py-2 -rotate-12 border-2 border-white shadow-lg opacity-90">
             {isCompleted ? 'COMPLETED' : 'FULL'}
           </div>
        </div>
      )}
    </div>
  );
};
