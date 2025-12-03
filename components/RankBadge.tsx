import React from 'react';
import { Rank } from '../types';

const RankBadge: React.FC<{ rank: Rank }> = ({ rank }) => {
  const colors = {
    SS: 'bg-purple-600 border-purple-800 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]',
    S: 'bg-red-600 border-red-800 text-white',
    A: 'bg-orange-500 border-orange-700 text-white',
    B: 'bg-blue-500 border-blue-700 text-white',
    C: 'bg-green-500 border-green-700 text-white',
  };

  return (
    <span className={`${colors[rank]} border-2 font-black font-hand text-lg px-3 py-1 rounded-full transform -rotate-6 inline-block`}>
      {rank}
    </span>
  );
};

export default RankBadge;
