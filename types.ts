export enum Rank {
  SS = 'SS',
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
}

export interface Order {
  id: string;
  title: string;
  description: string;
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
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  // Joins
  orders?: Order;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  price: number;
  is_active: boolean;
}

export interface Student {
  id: string;
  name: string;
  student_group: string;
  total_points: number;
}
