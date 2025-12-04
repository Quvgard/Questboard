export type Rank = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const RANK_DESCRIPTIONS: Record<Rank, string> = {
  SS: 'Легендарный',
  S: 'Эпический', 
  A: 'Сложный',
  B: 'Средний',
  C: 'Легкий',
  D: 'Начинающий',
  E: 'Очень простой',
  F: 'Базовый'
};

export const RANK_POINTS_RANGE: Record<Rank, { min: number; max: number }> = {
  SS: { min: 500, max: 1000 },
  S: { min: 300, max: 500 },
  A: { min: 150, max: 300 },
  B: { min: 80, max: 150 },
  C: { min: 40, max: 80 },
  D: { min: 20, max: 40 },
  E: { min: 10, max: 20 },
  F: { min: 5, max: 10 }
};

// Функция для получения баллов по умолчанию для ранга
export const getDefaultPointsForRank = (rank: Rank): number => {
  const range = RANK_POINTS_RANGE[rank];
  return Math.round((range.min + range.max) / 2); // Среднее значение
};

export interface RewardPurchase {
  id: string;
  reward_id: string;
  student_name: string;
  student_group: string;
  quantity: number;
  total_price: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  created_at: string;
  rewards?: Reward;
}

export interface Order {
  id: string;
  title: string;
  description: string | null;
  rank: Rank;
  max_slots: number;
  taken_slots: number;
  reward_points: number;
  status: 'open' | 'completed';
  created_at: string;
}

export interface OrderTaker {
  id: string;
  order_id: string;
  student_name: string;
  student_group: string;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  orders?: Order; 
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  student_group: string;
  total_points: number;
}
