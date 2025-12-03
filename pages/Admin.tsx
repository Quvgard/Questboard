import React, { useState, useEffect } from 'react';
import { 
  createOrder, fetchOrders, deleteOrder, 
  fetchPendingApprovals, processApproval,
  fetchStudents, createReward, fetchAllRewards, deleteReward 
} from '../services/api';
import { Order, Rank, OrderTaker, Reward, Student } from '../types';
import { OrderCard } from '../components/OrderCard';
import { Loader, Plus, Trash2, Check, X, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'approvals' | 'rewards' | 'students'>('approvals');

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [approvals, setApprovals] = useState<OrderTaker[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [newOrder, setNewOrder] = useState({ title: '', description: '', rank: Rank.C, max_slots: 1, reward_points: 10 });
  const [newReward, setNewReward] = useState({ title: '', description: '', price: 50 });

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [o, a, r, s] = await Promise.all([
        fetchOrders(),
        fetchPendingApprovals(),
        fetchAllRewards(),
        fetchStudents()
      ]);
      setOrders(o);
      setApprovals(a);
      setRewards(r);
      setStudents(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Handlers
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOrder({ ...newOrder });
    setNewOrder({ title: '', description: '', rank: Rank.C, max_slots: 1, reward_points: 10 });
    refreshAll();
  };

  const handleDeleteOrder = async (id: string) => {
    if (confirm('Delete this quest?')) {
      await deleteOrder(id);
      refreshAll();
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReward({ ...newReward, is_active: true });
    setNewReward({ title: '', description: '', price: 50 });
    refreshAll();
  };

  const handleDeleteReward = async (id: string) => {
    if (confirm('Remove this reward?')) {
        await deleteReward(id);
        refreshAll();
    }
  };

  const handleApprove = async (taker: OrderTaker, approve: boolean) => {
    try {
      // Find order points
      const order = orders.find(o => o.id === taker.order_id);
      const points = order ? order.reward_points : 0;
      await processApproval(taker, approve, points);
      refreshAll();
    } catch (e) {
      alert("Error processing approval");
      console.error(e);
    }
  };

  const tabClass = (id: string) => `
    px-6 py-2 rounded-t-lg font-bold transition-all
    ${activeTab === id 
      ? 'bg-white text-wood-900 border-t-4 border-wood-500 shadow-sm' 
      : 'bg-wood-800 text-wood-300 hover:bg-wood-600 hover:text-white'
    }
  `;

  return (
    <div className="min-h-screen">
      <div className="flex gap-2 mb-0 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('approvals')} className={tabClass('approvals')}>
           Approvals ({approvals.length})
        </button>
        <button onClick={() => setActiveTab('orders')} className={tabClass('orders')}>
           Manage Quests
        </button>
        <button onClick={() => setActiveTab('rewards')} className={tabClass('rewards')}>
           Manage Rewards
        </button>
        <button onClick={() => setActiveTab('students')} className={tabClass('students')}>
           Student Ledger
        </button>
      </div>

      <div className="bg-white p-6 rounded-b-lg rounded-r-lg shadow-xl min-h-[600px]">
        {loading && <div className="text-center p-4"><Loader className="animate-spin inline" /></div>}

        {/* --- APPROVALS TAB --- */}
        {activeTab === 'approvals' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Pending Completions</h2>
            {approvals.length === 0 ? (
              <p className="text-gray-500 italic">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {approvals.map(taker => (
                  <div key={taker.id} className="border p-4 rounded-lg flex items-center justify-between bg-gray-50 hover:bg-gray-100">
                    <div>
                      <div className="font-bold text-lg">{taker.orders?.title || 'Unknown Quest'}</div>
                      <div className="text-gray-600 flex gap-2 items-center">
                        <User size={16} /> 
                        {taker.student_name} ({taker.student_group})
                      </div>
                      {taker.comment && <div className="text-sm italic mt-1 text-gray-500">"{taker.comment}"</div>}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(taker, false)}
                        className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Reject"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        onClick={() => handleApprove(taker, true)}
                        className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 flex items-center gap-2"
                      >
                        <Check size={20} /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && (
          <div>
            <div className="bg-gray-100 p-4 rounded mb-8 border border-gray-200">
              <h3 className="font-bold mb-3">Post New Quest</h3>
              <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  placeholder="Quest Title" 
                  className="p-2 border rounded"
                  value={newOrder.title} 
                  onChange={e => setNewOrder({...newOrder, title: e.target.value})}
                  required
                />
                <select 
                  className="p-2 border rounded"
                  value={newOrder.rank}
                  onChange={e => setNewOrder({...newOrder, rank: e.target.value as Rank})}
                >
                  {Object.values(Rank).map(r => <option key={r} value={r}>Rank {r}</option>)}
                </select>
                <input 
                  placeholder="Description" 
                  className="p-2 border rounded md:col-span-2"
                  value={newOrder.description}
                  onChange={e => setNewOrder({...newOrder, description: e.target.value})}
                />
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    Slots:
                    <input 
                      type="number" min="1" 
                      className="p-2 border rounded w-20"
                      value={newOrder.max_slots}
                      onChange={e => setNewOrder({...newOrder, max_slots: parseInt(e.target.value)})}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    Points:
                    <input 
                      type="number" min="0" 
                      className="p-2 border rounded w-20"
                      value={newOrder.reward_points}
                      onChange={e => setNewOrder({...newOrder, reward_points: parseInt(e.target.value)})}
                    />
                  </label>
                </div>
                <button type="submit" className="md:col-span-2 bg-wood-700 text-white p-2 rounded hover:bg-wood-900 font-bold flex items-center justify-center gap-2">
                  <Plus size={18} /> Post to Board
                </button>
              </form>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-75">
               {orders.map(order => (
                 <OrderCard key={order.id} order={order} isAdmin onDelete={handleDeleteOrder} />
               ))}
            </div>
          </div>
        )}

        {/* --- REWARDS TAB --- */}
        {activeTab === 'rewards' && (
          <div>
             <div className="bg-gray-100 p-4 rounded mb-8 border border-gray-200">
              <h3 className="font-bold mb-3">Add Shop Item</h3>
              <form onSubmit={handleCreateReward} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <input 
                    placeholder="Item Title" 
                    className="w-full p-2 border rounded mb-2"
                    value={newReward.title} 
                    onChange={e => setNewReward({...newReward, title: e.target.value})}
                    required
                  />
                   <input 
                    placeholder="Description" 
                    className="w-full p-2 border rounded"
                    value={newReward.description} 
                    onChange={e => setNewReward({...newReward, description: e.target.value})}
                  />
                </div>
                <div className="w-24">
                   <label className="text-xs">Price</label>
                   <input 
                      type="number" 
                      className="w-full p-2 border rounded"
                      value={newReward.price}
                      onChange={e => setNewReward({...newReward, price: parseInt(e.target.value)})}
                   />
                </div>
                <button type="submit" className="bg-wood-700 text-white p-2 h-10 rounded hover:bg-wood-900 font-bold">
                  Add Item
                </button>
              </form>
            </div>

            <ul className="space-y-2">
              {rewards.map(r => (
                <li key={r.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50">
                  <div>
                    <span className="font-bold text-lg">{r.title}</span>
                    <span className="ml-2 text-gray-500 text-sm">({r.price} pts)</span>
                    <p className="text-gray-400 text-sm">{r.description}</p>
                  </div>
                  <button onClick={() => handleDeleteReward(r.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* --- STUDENTS TAB --- */}
        {activeTab === 'students' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Adventurer Leaderboard</h2>
            
            <div className="h-64 w-full mb-8">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={students.slice(0, 10)}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="name" />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="total_points" fill="#B08968" name="Points" />
                 </BarChart>
               </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3">Name</th>
                    <th className="p-3">Group</th>
                    <th className="p-3 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-gray-600">{s.student_group}</td>
                      <td className="p-3 text-right font-bold text-wood-700">{s.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
