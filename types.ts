export type Rank = 'SS' | 'S' | 'A' | 'B' | 'C';

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
  // Optional join fields
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
