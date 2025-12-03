import React from 'react';
import { Rank } from '../types';

const RankBadge: React.FC<{ rank: Rank }> = ({ rank }) => {
  const colors = {
    SS: 'bg-gradient-to-r from-purple-600 to-purple-800 border-purple-900 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]',
    S: 'bg-gradient-to-r from-red-600 to-red-800 border-red-900 text-white',
    A: 'bg-gradient-to-r from-orange-500 to-orange-700 border-orange-800 text-white',
    B: 'bg-gradient-to-r from-blue-500 to-blue-700 border-blue-800 text-white',
    C: 'bg-gradient-to-r from-green-500 to-green-700 border-green-800 text-white',
    D: 'bg-gradient-to-r from-yellow-500 to-yellow-700 border-yellow-800 text-white',
    E: 'bg-gradient-to-r from-gray-500 to-gray-700 border-gray-800 text-white',
    F: 'bg-gradient-to-r from-gray-300 to-gray-500 border-gray-600 text-gray-800',
  };

  return (
    <span className={`${colors[rank]} border-2 font-black font-hand text-lg px-3 py-1 rounded-full transform -rotate-6 inline-block shadow-md`}>
      {rank}
    </span>
  );
};

export default RankBadge;