import { supabase } from './supabaseClient';
import { Order, OrderTaker, Rank, Reward, Student } from '../types';

// Orders
export const fetchOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
};

export const createOrder = async (order: Omit<Order, 'id' | 'created_at' | 'taken_slots' | 'status'>) => {
  const { data, error } = await supabase.from('orders').insert([order]).select();
  if (error) throw error;
  return data;
};

export const deleteOrder = async (id: string) => {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
};

// Takers
export const takeOrder = async (
  orderId: string, 
  studentName: string, 
  studentGroup: string, 
  comment: string
) => {
  // 1. Check if slots available
  const { data: order } = await supabase.from('orders').select('taken_slots, max_slots').eq('id', orderId).single();
  
  if (order && order.taken_slots >= order.max_slots) {
    throw new Error("This quest is fully booked!");
  }

  // 2. Insert Taker
  const { data, error } = await supabase.from('order_takers').insert([{
    order_id: orderId,
    student_name: studentName,
    student_group: studentGroup,
    comment: comment
  }]).select();

  if (error) throw error;

  // 3. Increment taken_slots (Optimistic, ideally handled via DB trigger)
  await supabase.rpc('increment_taken_slots', { row_id: orderId }); 
  // Fallback if RPC not made: update manually
  if (order) {
     await supabase.from('orders').update({ taken_slots: order.taken_slots + 1 }).eq('id', orderId);
  }

  return data;
};

export const fetchPendingApprovals = async () => {
  const { data, error } = await supabase
    .from('order_takers')
    .select('*, orders(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as OrderTaker[];
};

export const processApproval = async (taker: OrderTaker, approved: boolean, points: number) => {
  // Update Taker Status
  const status = approved ? 'approved' : 'rejected';
  const { error: updateError } = await supabase
    .from('order_takers')
    .update({ status })
    .eq('id', taker.id);

  if (updateError) throw updateError;

  if (approved) {
    // Upsert Student and Add Points
    // First, try to find student
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('name', taker.student_name)
      .eq('student_group', taker.student_group)
      .single();

    if (student) {
      await supabase
        .from('students')
        .update({ total_points: student.total_points + points })
        .eq('id', student.id);
    } else {
      await supabase.from('students').insert([{
        name: taker.student_name,
        student_group: taker.student_group,
        total_points: points
      }]);
    }
  } else {
    // If rejected, maybe decrement taken_slots so someone else can take it?
    // Implementation choice: let's decrement
    const { data: order } = await supabase.from('orders').select('taken_slots').eq('id', taker.order_id).single();
    if (order && order.taken_slots > 0) {
      await supabase.from('orders').update({ taken_slots: order.taken_slots - 1 }).eq('id', taker.order_id);
    }
  }
};

// Rewards
export const fetchRewards = async () => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });
  if (error) throw error;
  return data as Reward[];
};

export const fetchAllRewards = async () => {
    const { data, error } = await supabase.from('rewards').select('*');
    if (error) throw error;
    return data as Reward[];
};

export const createReward = async (reward: Omit<Reward, 'id'>) => {
    const {data, error} = await supabase.from('rewards').insert([reward]).select();
    if (error) throw error;
    return data;
};

export const deleteReward = async (id: string) => {
    const { error } = await supabase.from('rewards').delete().eq('id', id);
    if (error) throw error;
};

// Students
export const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('*').order('total_points', { ascending: false });
    if (error) throw error;
    return data as Student[];
};
