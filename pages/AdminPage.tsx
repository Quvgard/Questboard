import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Order, OrderTaker, Reward, Student, Rank } from '../types';
import toast from 'react-hot-toast';
import { Trash2, Edit, Plus, Check, X, LogOut, Save } from 'lucide-react';
import RankBadge from '../components/RankBadge';

type Tab = 'orders' | 'approvals' | 'rewards' | 'students';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<(OrderTaker & { orders: Order })[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Editing/Creating States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order>>({});
  const [editingReward, setEditingReward] = useState<Partial<Reward>>({});
  const [editingStudent, setEditingStudent] = useState<Partial<Student>>({});

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
    } else {
      setSession(session);
      fetchData();
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchRequests(), fetchRewards(), fetchStudents()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const fetchRequests = async () => {
    // Supabase join syntax
    const { data } = await supabase
      .from('order_takers')
      .select('*, orders(*)')
      .order('created_at', { ascending: false });
    if (data) setRequests(data as any);
  };

  const fetchRewards = async () => {
    const { data } = await supabase.from('rewards').select('*').order('created_at', { ascending: false });
    if (data) setRewards(data);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('total_points', { ascending: false });
    if (data) setStudents(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // --- Logic: Orders ---
  const saveOrder = async () => {
    const payload = {
      title: editingOrder.title!,
      description: editingOrder.description,
      rank: editingOrder.rank || 'C',
      max_slots: editingOrder.max_slots || 1,
      reward_points: editingOrder.reward_points || 0,
      status: editingOrder.status || 'open',
    };

    if (editingOrder.id) {
      await supabase.from('orders').update(payload).eq('id', editingOrder.id);
      toast.success('Заказ обновлен');
    } else {
      await supabase.from('orders').insert([payload]);
      toast.success('Заказ создан');
    }
    setIsModalOpen(false);
    fetchOrders();
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Удалить этот заказ?')) return;
    await supabase.from('orders').delete().eq('id', id);
    fetchOrders();
  };

  // --- Logic: Approvals ---
  const handleApproval = async (request: OrderTaker & { orders: Order }, approved: boolean) => {
    try {
      if (approved) {
        // 1. Update status
        await supabase.from('order_takers').update({ status: 'approved' }).eq('id', request.id);
        
        // 2. Increment slots
        await supabase.rpc('increment_slots', { row_id: request.order_id }); // Note: Using simple update below instead of RPC for simplicity without extra SQL setup instructions
        const { data: currentOrder } = await supabase.from('orders').select('taken_slots, max_slots').eq('id', request.order_id).single();
        if (currentOrder) {
           await supabase.from('orders').update({ taken_slots: currentOrder.taken_slots + 1 }).eq('id', request.order_id);
           // Auto close if full?
           if (currentOrder.taken_slots + 1 >= currentOrder.max_slots) {
             await supabase.from('orders').update({ status: 'completed' }).eq('id', request.order_id);
           }
        }

        // 3. Add points to student (Upsert logic)
        const { data: existingStudent } = await supabase
          .from('students')
          .select('*')
          .eq('name', request.student_name)
          .eq('student_group', request.student_group)
          .single();

        if (existingStudent) {
          await supabase.from('students').update({ total_points: existingStudent.total_points + request.orders.reward_points }).eq('id', existingStudent.id);
        } else {
          await supabase.from('students').insert([{
            name: request.student_name,
            student_group: request.student_group,
            total_points: request.orders.reward_points
          }]);
        }
        toast.success('Заявка одобрена, баллы начислены');
      } else {
        await supabase.from('order_takers').update({ status: 'rejected' }).eq('id', request.id);
        toast.success('Заявка отклонена');
      }
      fetchRequests();
      fetchOrders(); // To update slots
      fetchStudents();
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    }
  };

  // --- Logic: Rewards ---
  const saveReward = async () => {
    const payload = {
        title: editingReward.title!,
        description: editingReward.description,
        price: editingReward.price || 100,
        is_active: editingReward.is_active !== false // defaults true
    };
    if (editingReward.id) {
        await supabase.from('rewards').update(payload).eq('id', editingReward.id);
    } else {
        await supabase.from('rewards').insert([payload]);
    }
    setIsModalOpen(false);
    fetchRewards();
    toast.success('Товар сохранен');
  };

  const deleteReward = async (id: string) => {
      if(!confirm('Удалить товар?')) return;
      await supabase.from('rewards').delete().eq('id', id);
      fetchRewards();
  };

  // --- Logic: Students ---
  const updateStudentPoints = async (id: string, points: number) => {
      await supabase.from('students').update({ total_points: points }).eq('id', id);
      fetchStudents();
      toast.success('Баллы обновлены');
  };

  if (loading) return <div className="p-10 text-center">Загрузка панели управления...</div>;

  return (
    <div className="bg-white rounded-lg shadow-xl min-h-[80vh]">
      <div className="flex flex-col md:flex-row border-b">
        <div className="p-4 bg-gray-50 border-r md:w-64 flex-shrink-0 flex flex-col gap-2">
            <h2 className="text-xl font-bold mb-4 text-gray-700 px-2">Панель Мастера</h2>
            <button onClick={() => setActiveTab('orders')} className={`text-left px-4 py-2 rounded ${activeTab === 'orders' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>Заказы</button>
            <button onClick={() => setActiveTab('approvals')} className={`text-left px-4 py-2 rounded ${activeTab === 'approvals' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>
                Заявки <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">{requests.filter(r => r.status === 'pending').length}</span>
            </button>
            <button onClick={() => setActiveTab('rewards')} className={`text-left px-4 py-2 rounded ${activeTab === 'rewards' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>Награды</button>
            <button onClick={() => setActiveTab('students')} className={`text-left px-4 py-2 rounded ${activeTab === 'students' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>Студенты</button>
            <div className="mt-auto">
                <button onClick={handleLogout} className="text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded w-full flex items-center gap-2">
                    <LogOut size={16}/> Выйти
                </button>
            </div>
        </div>

        <div className="p-6 flex-grow overflow-x-auto">
            {/* --- TAB: ORDERS --- */}
            {activeTab === 'orders' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">Управление Заказами</h3>
                        <button onClick={() => { setEditingOrder({ rank: 'C', max_slots: 1, reward_points: 10 }); setIsModalOpen(true); }} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                            <Plus size={18}/> Создать заказ
                        </button>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Название</th>
                                <th className="p-3">Ранг</th>
                                <th className="p-3">Места</th>
                                <th className="p-3">Статус</th>
                                <th className="p-3">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{o.title}</td>
                                    <td className="p-3"><RankBadge rank={o.rank}/></td>
                                    <td className="p-3">{o.taken_slots}/{o.max_slots}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs ${o.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => { setEditingOrder(o); setIsModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={18}/></button>
                                        <button onClick={() => deleteOrder(o.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- TAB: APPROVALS --- */}
            {activeTab === 'approvals' && (
                <div>
                    <h3 className="text-2xl font-bold mb-6">Заявки на выполнение</h3>
                    <div className="space-y-4">
                        {requests.filter(r => r.status === 'pending').length === 0 && <p className="text-gray-500">Нет новых заявок.</p>}
                        {requests.map(req => (
                            <div key={req.id} className={`border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center ${req.status === 'pending' ? 'bg-white border-l-4 border-l-yellow-400' : 'bg-gray-50 opacity-75'}`}>
                                <div>
                                    <div className="font-bold text-lg">{req.student_name} <span className="text-gray-500 text-sm">({req.student_group})</span></div>
                                    <div className="text-sm text-gray-600">Задание: <span className="font-semibold">{req.orders?.title}</span> ({req.orders?.reward_points} б.)</div>
                                    {req.comment && <div className="mt-1 text-sm italic bg-gray-100 p-2 rounded">"{req.comment}"</div>}
                                    <div className="mt-1 text-xs text-gray-400">Статус: {req.status}</div>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex gap-2 mt-4 md:mt-0">
                                        <button onClick={() => handleApproval(req, true)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded flex items-center gap-1">
                                            <Check size={16}/> Принять
                                        </button>
                                        <button onClick={() => handleApproval(req, false)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center gap-1">
                                            <X size={16}/> Отклонить
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TAB: REWARDS --- */}
            {activeTab === 'rewards' && (
                 <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">Управление Магазином</h3>
                        <button onClick={() => { setEditingReward({ is_active: true, price: 100 }); setIsModalOpen(true); }} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                            <Plus size={18}/> Добавить товар
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rewards.map(r => (
                             <div key={r.id} className="border p-4 rounded-lg flex justify-between items-start">
                                 <div>
                                     <h4 className="font-bold">{r.title}</h4>
                                     <p className="text-sm text-gray-600">{r.description}</p>
                                     <div className="mt-2 font-mono text-amber-600 font-bold">{r.price} баллов</div>
                                 </div>
                                 <div className="flex gap-2">
                                     <button onClick={() => { setEditingReward(r); setIsModalOpen(true); }} className="text-blue-600"><Edit size={18}/></button>
                                     <button onClick={() => deleteReward(r.id)} className="text-red-600"><Trash2 size={18}/></button>
                                 </div>
                             </div>
                        ))}
                    </div>
                 </div>
            )}

             {/* --- TAB: STUDENTS --- */}
             {activeTab === 'students' && (
                <div>
                     <h3 className="text-2xl font-bold mb-6">Журнал Студентов</h3>
                     <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Студент</th>
                                <th className="p-3">Группа</th>
                                <th className="p-3">Всего Баллов</th>
                                <th className="p-3">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s.id} className="border-b">
                                    <td className="p-3 font-medium">{s.name}</td>
                                    <td className="p-3 text-gray-500">{s.student_group}</td>
                                    <td className="p-3 font-bold text-amber-700">{s.total_points}</td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => {
                                                const newPoints = prompt("Введите новое количество баллов:", s.total_points.toString());
                                                if(newPoints !== null && !isNaN(Number(newPoints))) {
                                                    updateStudentPoints(s.id, Number(newPoints));
                                                }
                                            }}
                                            className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                        >
                                            Изменить
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>

      {/* Modal for Order/Reward Edit */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-2xl">
                  <h3 className="text-xl font-bold mb-4">
                      {activeTab === 'orders' ? (editingOrder.id ? 'Редактировать Заказ' : 'Новый Заказ') : (editingReward.id ? 'Редактировать Товар' : 'Новый Товар')}
                  </h3>
                  
                  {activeTab === 'orders' && (
                      <div className="space-y-3">
                          <input className="w-full border p-2 rounded" placeholder="Название" value={editingOrder.title || ''} onChange={e => setEditingOrder({...editingOrder, title: e.target.value})} />
                          <textarea className="w-full border p-2 rounded" placeholder="Описание" rows={3} value={editingOrder.description || ''} onChange={e => setEditingOrder({...editingOrder, description: e.target.value})} />
                          <div className="flex gap-4">
                              <div className="w-1/2">
                                  <label className="text-xs text-gray-500">Ранг</label>
                                  <select className="w-full border p-2 rounded" value={editingOrder.rank || 'C'} onChange={e => setEditingOrder({...editingOrder, rank: e.target.value as Rank})}>
                                      {['SS', 'S', 'A', 'B', 'C'].map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                              </div>
                              <div className="w-1/2">
                                  <label className="text-xs text-gray-500">Очки</label>
                                  <input type="number" className="w-full border p-2 rounded" value={editingOrder.reward_points} onChange={e => setEditingOrder({...editingOrder, reward_points: Number(e.target.value)})} />
                              </div>
                          </div>
                          <div className="flex gap-4">
                                <div className="w-1/2">
                                    <label className="text-xs text-gray-500">Макс. мест</label>
                                    <input type="number" className="w-full border p-2 rounded" value={editingOrder.max_slots} onChange={e => setEditingOrder({...editingOrder, max_slots: Number(e.target.value)})} />
                                </div>
                                <div className="w-1/2">
                                    <label className="text-xs text-gray-500">Статус</label>
                                    <select className="w-full border p-2 rounded" value={editingOrder.status} onChange={e => setEditingOrder({...editingOrder, status: e.target.value as any})}>
                                        <option value="open">Open</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'rewards' && (
                       <div className="space-y-3">
                            <input className="w-full border p-2 rounded" placeholder="Название" value={editingReward.title || ''} onChange={e => setEditingReward({...editingReward, title: e.target.value})} />
                            <textarea className="w-full border p-2 rounded" placeholder="Описание" value={editingReward.description || ''} onChange={e => setEditingReward({...editingReward, description: e.target.value})} />
                            <input type="number" className="w-full border p-2 rounded" placeholder="Цена" value={editingReward.price} onChange={e => setEditingReward({...editingReward, price: Number(e.target.value)})} />
                       </div>
                  )}

                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Отмена</button>
                      <button onClick={activeTab === 'orders' ? saveOrder : saveReward} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-2">
                          <Save size={18} /> Сохранить
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPage;
