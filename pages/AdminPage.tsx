import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Order, OrderTaker, Reward, Student, Rank, RANK_DESCRIPTIONS, RANK_POINTS_RANGE, getDefaultPointsForRank, RewardPurchase} from '../types';
import toast from 'react-hot-toast';
import { Trash2, Edit, Plus, Check, X, LogOut, Save, Info, Filter, UserX, FileCheck } from 'lucide-react';
import RankBadge from '../components/RankBadge';

type Tab = 'orders' | 'approvals' | 'rewards' | 'students' | 'purchases';
type PurchaseFilter = 'all' | 'pending' | 'approved' | 'delivered';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [purchases, setPurchases] = useState<(RewardPurchase & { rewards: Reward })[]>([]);
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>('all');

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
    await Promise.all([
      fetchOrders(), 
      fetchRequests(), 
      fetchRewards(), 
      fetchStudents(),
      fetchPurchases() // Добавляем
    ]);
    setLoading(false);
  };

  const fetchPurchases = async () => {
    const { data } = await supabase
      .from('reward_purchases')
      .select('*, rewards(*)')
      .order('created_at', { ascending: false });
    if (data) setPurchases(data as any);
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

  const handlePurchaseAction = async (purchaseId: string, action: 'approve' | 'reject' | 'deliver') => {
  try {
    let newStatus: RewardPurchase['status'] = 'pending';
    let message = '';
    
    // Находим покупку для получения данных
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) {
      toast.error('Покупка не найдена');
      return;
    }
    
    switch (action) {
      case 'approve':
        // Проверяем, что у студента хватает баллов
        const { data: student } = await supabase
          .from('students')
          .select('*')
          .eq('name', purchase.student_name)
          .eq('student_group', purchase.student_group)
          .single();
        
        if (!student) {
          toast.error('Студент не найден в системе');
          return;
        }
        
        if (student.total_points < purchase.total_price) {
          toast.error(`❌ У студента недостаточно баллов! Требуется: ${purchase.total_price}, есть: ${student.total_points}`);
          return;
        }
        
        // Списание баллов
        const newPoints = Math.max(0, student.total_points - purchase.total_price);
        await supabase
          .from('students')
          .update({ total_points: newPoints })
          .eq('id', student.id);
        
        newStatus = 'approved';
        message = `✅ Покупка подтверждена. Списано ${purchase.total_price} баллов. Остаток: ${newPoints}`;
        break;
        
      case 'reject':
        newStatus = 'rejected';
        message = 'Покупка отклонена. Баллы не списаны.';
        break;
        
      case 'deliver':
        newStatus = 'delivered';
        message = 'Товар выдан. Покупка завершена.';
        break;
    }
    
    // Обновляем статус покупки
    await supabase
      .from('reward_purchases')
      .update({ status: newStatus })
      .eq('id', purchaseId);
    
    toast.success(message);
    fetchPurchases();
    fetchStudents(); // Обновляем список студентов (балансы)
    
  } catch (error: any) {
    console.error('Error processing purchase:', error);
    toast.error('Ошибка: ' + error.message);
  }
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
        const { data: currentOrder } = await supabase.from('orders').select('taken_slots, max_slots').eq('id', request.order_id).single();
        if (currentOrder) {
           const newTakenSlots = currentOrder.taken_slots + 1;
           await supabase.from('orders').update({ taken_slots: newTakenSlots }).eq('id', request.order_id);
           
           // Auto close if full? Теперь это опционально - можно оставить открытым для других студентов
           // if (newTakenSlots >= currentOrder.max_slots) {
           //   await supabase.from('orders').update({ status: 'completed' }).eq('id', request.order_id);
           // }
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
        toast.success('Результат принят! Баллы начислены студенту.');
      } else {
        await supabase.from('order_takers').update({ status: 'rejected' }).eq('id', request.id);
        toast.success('Результат отклонен. Студент может попробовать снова.');
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
    try {
      await supabase.from('students').update({ total_points: points }).eq('id', id);
      fetchStudents();
      toast.success('Баллы обновлены');
    } catch (error: any) {
      toast.error('Ошибка при обновлении баллов: ' + error.message);
    }
  };

  const deleteStudent = async (id: string, name: string, group: string) => {
    if (!confirm(`Удалить студента "${name}" (${group})?\n\nВнимание: Это действие невозможно отменить. Все связанные данные (заявки, покупки) могут стать некорректными.`)) {
      return;
    }
    
    try {
      // Сначала проверяем, есть ли активные заявки у студента
      const { data: activeRequests } = await supabase
        .from('order_takers')
        .select('id')
        .eq('student_name', name)
        .eq('student_group', group)
        .eq('status', 'pending');
      
      if (activeRequests && activeRequests.length > 0) {
        const proceed = confirm(`У студента есть ${activeRequests.length} ожидающих заявок.\n\nВы можете:\n1. Удалить студента с заявками (заявки будут удалены)\n2. Отменить удаление\n\nПродолжить удаление?`);
        if (!proceed) return;
      }
      
      // Проверяем есть ли невыполненные покупки
      const { data: pendingPurchases } = await supabase
        .from('reward_purchases')
        .select('id')
        .eq('student_name', name)
        .eq('student_group', group)
        .in('status', ['pending', 'approved']);
      
      if (pendingPurchases && pendingPurchases.length > 0) {
        const proceed = confirm(`У студента есть ${pendingPurchases.length} активных покупок (ожидающих или подтвержденных).\n\nВы можете:\n1. Удалить студента с покупками (покупки станут некорректными)\n2. Отменить удаление\n\nПродолжить удаление?`);
        if (!proceed) return;
      }
      
      // Удаляем студента
      await supabase.from('students').delete().eq('id', id);
      
      toast.success(`Студент "${name}" удален`);
      fetchStudents();
      
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast.error('Ошибка при удалении студента: ' + error.message);
    }
  };

    // Добавляем обработчик изменения ранга
  const handleRankChange = (newRank: Rank) => {
    const defaultPoints = getDefaultPointsForRank(newRank);
    setEditingOrder({
      ...editingOrder,
      rank: newRank,
      reward_points: defaultPoints // Автоматически подставляем баллы в поле
    });
  };

  // Функция для фильтрации покупок
  const getFilteredPurchases = () => {
    switch (purchaseFilter) {
      case 'all':
        return purchases;
      case 'pending':
        return purchases.filter(p => p.status === 'pending');
      case 'approved':
        return purchases.filter(p => p.status === 'approved');
      case 'delivered':
        return purchases.filter(p => p.status === 'delivered');
      default:
        return purchases;
    }
  };

  // Получаем отфильтрованные покупки
  const filteredPurchases = getFilteredPurchases();

  if (loading) return <div className="p-10 text-center">Загрузка панели управления...</div>;

  return (
    <div className="bg-white rounded-lg shadow-xl min-h-[80vh] flex flex-col">
      <div className="flex flex-col md:flex-row border-b flex-grow">
        {/* Левое меню - теперь фиксированной высоты с flex-контейнером внутри */}
        <div className="p-4 bg-gray-50 border-r md:w-64 flex-shrink-0 flex flex-col min-h-full">
            <h2 className="text-xl font-bold mb-4 text-gray-700 px-2">Панель Мастера</h2>
            <div className="flex flex-col gap-2 flex-grow">
                <button onClick={() => setActiveTab('orders')} className={`text-left px-4 py-2 rounded ${activeTab === 'orders' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>Заказы</button>
                <button onClick={() => setActiveTab('approvals')} className={`text-left px-4 py-2 rounded ${activeTab === 'approvals' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>
                    Заявки <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">{requests.filter(r => r.status === 'pending').length}</span>
                </button>
                <button onClick={() => setActiveTab('purchases')} className={`text-left px-4 py-2 rounded ${activeTab === 'purchases' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>
                  Покупки <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                    {purchases.filter(p => p.status === 'pending').length}
                  </span>
                </button>
                <button onClick={() => setActiveTab('rewards')} className={`text-left px-4 py-2 rounded ${activeTab === 'rewards' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>Награды</button>
                <button onClick={() => setActiveTab('students')} className={`text-left px-4 py-2 rounded ${activeTab === 'students' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-gray-100'}`}>Студенты</button>
            </div>
            <div className="pt-4 border-t mt-auto">
                <button onClick={handleLogout} className="text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded w-full flex items-center gap-2">
                    <LogOut size={16}/> Выйти
                </button>
            </div>
        </div>

        {/* Основной контент */}
        <div className="p-6 flex-grow overflow-x-auto flex flex-col">
            {/* --- TAB: ORDERS --- */}
            {activeTab === 'orders' && (
                <div className="flex-grow">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold">Управление Заказами</h3>
                        <button onClick={() => { 
                          const defaultRank: Rank = 'F';
                          const defaultPoints = getDefaultPointsForRank(defaultRank);
                          setEditingOrder({ 
                            rank: defaultRank, 
                            max_slots: 1, 
                            reward_points: defaultPoints,
                            status: 'open'
                          }); 
                          setIsModalOpen(true); 
                        }} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                          <Plus size={18}/> Создать заказ
                        </button>
                    </div>
                    <div className="flex-grow">
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
                                        <td className="p-3"><RankBadge rank={o.rank} showTooltip={true}/></td>
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
                </div>
            )}

            {/* --- TAB: APPROVALS --- */}
            {activeTab === 'approvals' && (
                <div className="flex-grow">
                    <h3 className="text-2xl font-bold mb-6">Проверка результатов заданий</h3>
                    <div className="space-y-4 flex-grow">
                        {requests.filter(r => r.status === 'pending').length === 0 && (
                          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                            <FileCheck size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500 text-lg">Нет результатов на проверку.</p>
                          </div>
                        )}
                        {requests.map(req => (
                            <div key={req.id} className={`border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center ${req.status === 'pending' ? 'bg-white border-l-4 border-l-yellow-400' : 'bg-gray-50 opacity-75'}`}>
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{req.student_name} <span className="text-gray-500 text-sm">({req.student_group})</span></div>
                                    <div className="text-sm text-gray-600">
                                      <span className="font-semibold">Задание:</span> {req.orders?.title} 
                                      <span className="text-amber-600 font-bold ml-2">({req.orders?.reward_points} б.)</span>
                                    </div>
                                    {req.comment && (
                                      <div className="mt-2">
                                        <div className="text-sm font-medium text-gray-700 mb-1">Результат выполнения:</div>
                                        <div className="bg-gray-100 p-3 rounded text-sm break-all">
                                          {req.comment.startsWith('http') ? (
                                            <a 
                                              href={req.comment} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              {req.comment}
                                            </a>
                                          ) : (
                                            req.comment
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    <div className="mt-2 text-xs text-gray-400">
                                      Отправлено: {new Date(req.created_at).toLocaleString('ru-RU')}
                                      <span className="ml-3">Статус: 
                                        <span className={`ml-1 px-2 py-0.5 rounded ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                       req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                       'bg-red-100 text-red-800'}`}>
                                          {req.status === 'pending' ? 'ожидает проверки' :
                                           req.status === 'approved' ? 'одобрено' : 'отклонено'}
                                        </span>
                                      </span>
                                    </div>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-4">
                                        <button onClick={() => handleApproval(req, true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center justify-center gap-1 min-w-[120px]">
                                            <Check size={16}/> Принять результат
                                        </button>
                                        <button onClick={() => handleApproval(req, false)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center justify-center gap-1 min-w-[120px]">
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
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold">Управление Магазином</h3>
                    <button onClick={() => { setEditingReward({ is_active: true, price: 100 }); setIsModalOpen(true); }} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                        <Plus size={18}/> Добавить товар
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
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
            {activeTab === 'purchases' && (
              <div className="flex-grow">
                <h3 className="text-2xl font-bold mb-6">Заявки на покупку</h3>
                
                <div className="mb-6 flex gap-2 flex-wrap">
                  <button 
                    onClick={() => setPurchaseFilter('all')}
                    className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${purchaseFilter === 'all' ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <Filter size={16} className={purchaseFilter === 'all' ? 'text-white' : 'text-gray-500'} />
                    Все ({purchases.length})
                  </button>
                  <button 
                    onClick={() => setPurchaseFilter('pending')}
                    className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${purchaseFilter === 'pending' ? 'bg-yellow-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <Filter size={16} className={purchaseFilter === 'pending' ? 'text-white' : 'text-gray-500'} />
                    Ожидают ({purchases.filter(p => p.status === 'pending').length})
                  </button>
                  <button 
                    onClick={() => setPurchaseFilter('approved')}
                    className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${purchaseFilter === 'approved' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <Filter size={16} className={purchaseFilter === 'approved' ? 'text-white' : 'text-gray-500'} />
                    Подтверждены ({purchases.filter(p => p.status === 'approved').length})
                  </button>
                  <button 
                    onClick={() => setPurchaseFilter('delivered')}
                    className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${purchaseFilter === 'delivered' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <Filter size={16} className={purchaseFilter === 'delivered' ? 'text-white' : 'text-gray-500'} />
                    Выданы ({purchases.filter(p => p.status === 'delivered').length})
                  </button>
                </div>
                
                {/* Статус фильтра */}
                <div className="mb-4 text-sm text-gray-600">
                  {purchaseFilter === 'all' && `Показаны все покупки (${filteredPurchases.length} из ${purchases.length})`}
                  {purchaseFilter === 'pending' && `Показаны ожидающие подтверждения покупки (${filteredPurchases.length} из ${purchases.length})`}
                  {purchaseFilter === 'approved' && `Показаны подтверждённые покупки (${filteredPurchases.length} из ${purchases.length})`}
                  {purchaseFilter === 'delivered' && `Показаны выданные покупки (${filteredPurchases.length} из ${purchases.length})`}
                </div>
                
                <div className="space-y-4 flex-grow">
                  {filteredPurchases.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <Filter size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg">
                        {purchaseFilter === 'all' && 'Нет заявок на покупку.'}
                        {purchaseFilter === 'pending' && 'Нет ожидающих подтверждения покупок.'}
                        {purchaseFilter === 'approved' && 'Нет подтверждённых покупок.'}
                        {purchaseFilter === 'delivered' && 'Нет выданных покупок.'}
                      </p>
                      {purchaseFilter !== 'all' && filteredPurchases.length === 0 && purchases.length > 0 && (
                        <button 
                          onClick={() => setPurchaseFilter('all')}
                          className="mt-4 px-4 py-2 text-amber-600 hover:text-amber-800 font-medium"
                        >
                          Посмотреть все покупки ({purchases.length})
                        </button>
                      )}
                    </div>
                  )}
                  
                  {filteredPurchases.map(purchase => (
                    <div 
                      key={purchase.id} 
                      className={`border rounded-lg p-4 ${purchase.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 
                                  purchase.status === 'approved' ? 'bg-blue-50 border-blue-200' : 
                                  purchase.status === 'delivered' ? 'bg-green-50 border-green-200' : 
                                  'bg-red-50 border-red-200'}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="flex-1">
                          <div className="font-bold text-lg flex items-center gap-2">
                            {purchase.student_name} 
                            <span className="text-gray-500 text-sm">({purchase.student_group})</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${purchase.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                                            purchase.status === 'approved' ? 'bg-blue-200 text-blue-800' :
                                            purchase.status === 'delivered' ? 'bg-green-200 text-green-800' :
                                            'bg-red-200 text-red-800'}`}>
                              {purchase.status === 'pending' ? 'Ожидает' :
                              purchase.status === 'approved' ? 'Подтверждено' :
                              purchase.status === 'delivered' ? 'Выдано' : 'Отклонено'}
                            </span>
                          </div>
                          
                          <div className="mt-2">
                            <div className="font-semibold">
                              {purchase.rewards?.title || 'Товар удален'} 
                              <span className="text-gray-600 ml-2">×{purchase.quantity} шт.</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {purchase.rewards?.description}
                            </div>
                            <div className="mt-1 font-mono font-bold text-amber-700">
                              {purchase.total_price} баллов ({purchase.rewards?.price} × {purchase.quantity})
                            </div>
                            {purchase.comment && (
                              <div className="mt-2 text-sm italic bg-gray-100 p-2 rounded">
                                "{purchase.comment}"
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(purchase.created_at).toLocaleString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        
                        {purchase.status === 'pending' && (
                          <div className="flex gap-2 mt-4 md:mt-0 flex-wrap">
                            <button 
                              onClick={() => {
                                if (confirm(`Подтвердить покупку?\n\nТовар: ${purchase.rewards?.title || 'N/A'}\nСтудент: ${purchase.student_name} (${purchase.student_group})\nКоличество: ${purchase.quantity} шт.\nСумма: ${purchase.total_price} баллов\n\nБаллы будут списаны со счета студента.`)) {
                                  handlePurchaseAction(purchase.id, 'approve');
                                }
                              }}
                              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded flex items-center gap-1 text-sm"
                            >
                              <Check size={16}/> Подтвердить
                            </button>
                            <button 
                              onClick={() => handlePurchaseAction(purchase.id, 'reject')}
                              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded flex items-center gap-1 text-sm"
                            >
                              <X size={16}/> Отклонить
                            </button>
                          </div>
                        )}
                        
                        {purchase.status === 'approved' && (
                          <div className="flex gap-2 mt-4 md:mt-0">
                            <button 
                              onClick={() => handlePurchaseAction(purchase.id, 'deliver')}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1 text-sm"
                            >
                              ✓ Выдано
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* --- TAB: STUDENTS --- */}
            {activeTab === 'students' && (
              <div className="flex-grow">
                    <h3 className="text-2xl font-bold mb-6">Журнал Студентов</h3>
                    <div className="flex-grow">
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
                              {students.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-6 text-center text-gray-500">
                                    Нет зарегистрированных студентов
                                  </td>
                                </tr>
                              ) : (
                                students.map(s => (
                                  <tr key={s.id} className="border-b hover:bg-gray-50 group">
                                    <td className="p-3 font-medium">{s.name}</td>
                                    <td className="p-3 text-gray-500">{s.student_group}</td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-amber-700">{s.total_points}</span>
                                        <span className="text-xs text-gray-400">баллов</span>
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => {
                                            const newPoints = prompt("Введите новое количество баллов:", s.total_points.toString());
                                            if(newPoints !== null && !isNaN(Number(newPoints))) {
                                              updateStudentPoints(s.id, Number(newPoints));
                                            }
                                          }}
                                          className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                          title="Изменить баллы"
                                        >
                                          <Edit size={14} /> Изменить
                                        </button>
                                        <button 
                                          onClick={() => deleteStudent(s.id, s.name, s.student_group)}
                                          className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                          title="Удалить студента"
                                        >
                                          <UserX size={14} /> Удалить
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                          </tbody>
                        </table>
                        
                        {/* Статистика */}
                        {students.length > 0 && (
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-800">{students.length}</div>
                                <div className="text-sm text-gray-600">Всего студентов</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-amber-600">
                                  {students.reduce((sum, student) => sum + student.total_points, 0)}
                                </div>
                                <div className="text-sm text-gray-600">Всего баллов</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {students.length > 0 
                                    ? Math.round(students.reduce((sum, student) => sum + student.total_points, 0) / students.length)
                                    : 0}
                                </div>
                                <div className="text-sm text-gray-600">Средний балл</div>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
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
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                            <input 
                              className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                              placeholder="Название задания" 
                              value={editingOrder.title || ''} 
                              onChange={e => setEditingOrder({...editingOrder, title: e.target.value})} 
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                            <textarea 
                              className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                              placeholder="Подробное описание задания" 
                              rows={3}
                              value={editingOrder.description || ''} 
                              onChange={e => setEditingOrder({...editingOrder, description: e.target.value})} 
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                Ранг
                                <span className="text-xs font-normal text-gray-500">({RANK_DESCRIPTIONS[editingOrder.rank as Rank || 'F']})</span>
                              </label>
                              <select 
                                className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                                value={editingOrder.rank || 'F'} 
                                onChange={e => handleRankChange(e.target.value as Rank)}
                              >
                                {['SS', 'S', 'A', 'B', 'C', 'D', 'E', 'F'].map(r => (
                                  <option key={r} value={r}>
                                    {r} - {RANK_DESCRIPTIONS[r as Rank]}
                                  </option>
                                ))}
                              </select>
                              <div className="text-xs text-gray-500 mt-1">
                                Диапазон: {RANK_POINTS_RANGE[editingOrder.rank as Rank || 'F'].min}-{RANK_POINTS_RANGE[editingOrder.rank as Rank || 'F'].max} баллов
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Баллы награды</label>
                              <input 
                                type="number" 
                                className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                                value={editingOrder.reward_points || getDefaultPointsForRank(editingOrder.rank as Rank || 'F')} 
                                onChange={e => setEditingOrder({...editingOrder, reward_points: Number(e.target.value)})}
                                min={RANK_POINTS_RANGE[editingOrder.rank as Rank || 'F'].min}
                                max={RANK_POINTS_RANGE[editingOrder.rank as Rank || 'F'].max}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Макс. участников</label>
                              <input 
                                type="number" 
                                className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                                value={editingOrder.max_slots || 1} 
                                onChange={e => setEditingOrder({...editingOrder, max_slots: Number(e.target.value)})}
                                min="1"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                              <select 
                                className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                                value={editingOrder.status || 'open'} 
                                onChange={e => setEditingOrder({...editingOrder, status: e.target.value as any})}
                              >
                                <option value="open">Открыто</option>
                                <option value="completed">Завершено</option>
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