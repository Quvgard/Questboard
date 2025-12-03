import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Order } from '../types';
import RankBadge from '../components/RankBadge';
import { Users, Coins, PenTool, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const BoardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Form State
  const [studentName, setStudentName] = useState('');
  const [studentGroup, setStudentGroup] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Не удалось загрузить задания');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('order_takers')
        .insert([{
          order_id: selectedOrder.id,
          student_name: studentName,
          student_group: studentGroup,
          comment: comment
        }]);

      if (error) throw error;

      toast.success('Заявка отправлена! Ожидайте подтверждения.');
      setSelectedOrder(null);
      setStudentName('');
      setStudentGroup('');
      setComment('');
      
      // Update local state to reflect taken slot immediately (optimistic UI)
      // Real update happens on admin approval, but let's re-fetch to see if slot count changed if logic was different
      fetchOrders(); 

    } catch (error) {
      console.error(error);
      toast.error('Ошибка при отправке заявки');
    } finally {
      setSubmitting(false);
    }
  };

  // Sticky note styling logic
  const getNoteStyle = (index: number) => {
    const colors = ['bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200'];
    const rotations = ['rotate-r-1', 'rotate-l-1', 'rotate-r-2', 'rotate-l-2', 'rotate-0'];
    return `${colors[index % colors.length]} ${rotations[index % rotations.length]}`;
  };

  if (loading) return <div className="text-center py-20 font-hand text-2xl text-gray-500">Загрузка доски объявлений...</div>;

  return (
    <div>
      <h1 className="text-4xl font-hand font-bold text-center mb-10 text-gray-800 drop-shadow-sm">
        Доска Заданий
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white/50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-xl text-gray-500 font-hand">Пока нет доступных заданий. Заходите позже!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4">
          {orders.map((order, index) => (
            <div 
              key={order.id} 
              className={`relative p-6 shadow-lg transition-transform hover:scale-105 hover:z-10 cursor-pointer flex flex-col h-80 ${getNoteStyle(index)}`}
              onClick={() => setSelectedOrder(order)}
            >
              {/* Pin graphic */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 shadow-sm border border-red-900 z-20"></div>

              <div className="flex justify-between items-start mb-4">
                <RankBadge rank={order.rank} />
                <div className="flex items-center gap-1 bg-white/40 px-2 py-1 rounded-full text-sm font-bold text-gray-700">
                  <Coins size={14} />
                  <span>{order.reward_points}</span>
                </div>
              </div>

              <h3 className="font-hand font-bold text-2xl mb-2 leading-tight overflow-hidden text-ellipsis line-clamp-2">
                {order.title}
              </h3>
              
              <div className="flex-grow font-hand text-lg text-gray-800 overflow-hidden mb-4 relative">
                <p className="line-clamp-4">{order.description}</p>
                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/5 to-transparent"></div>
              </div>

              <div className="mt-auto flex justify-between items-center text-sm font-semibold text-gray-700 border-t border-black/10 pt-3">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{order.taken_slots} / {order.max_slots}</span>
                </div>
                {order.taken_slots >= order.max_slots ? (
                  <span className="text-red-600 flex items-center gap-1"><Clock size={16}/> Полный</span>
                ) : (
                  <span className="text-blue-700 flex items-center gap-1"><PenTool size={16}/> Взять</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative transform rotate-1">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
            
            <div className="p-8">
              <div className="mb-6 border-b border-dashed border-gray-300 pb-4">
                <div className="flex justify-between items-center mb-2">
                   <RankBadge rank={selectedOrder.rank} />
                   <span className="text-2xl font-bold font-hand text-amber-600">{selectedOrder.reward_points} баллов</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">{selectedOrder.title}</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedOrder.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-gray-100 p-2 rounded">
                  <Users size={16} />
                  <span>Доступно мест: {selectedOrder.max_slots - selectedOrder.taken_slots} из {selectedOrder.max_slots}</span>
                </div>
              </div>

              {selectedOrder.taken_slots >= selectedOrder.max_slots ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-bold">
                  К сожалению, все места на это задание уже заняты.
                </div>
              ) : (
                <form onSubmit={handleTakeOrder} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ФИО Студента</label>
                    <input 
                      type="text" 
                      required
                      className="w-full border-2 border-gray-200 rounded-md p-2 focus:border-amber-500 focus:outline-none"
                      placeholder="Иванов Иван"
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Группа</label>
                    <input 
                      type="text" 
                      required
                      className="w-full border-2 border-gray-200 rounded-md p-2 focus:border-amber-500 focus:outline-none"
                      placeholder="ИБ-101"
                      value={studentGroup}
                      onChange={e => setStudentGroup(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий (опционально)</label>
                    <textarea 
                      className="w-full border-2 border-gray-200 rounded-md p-2 focus:border-amber-500 focus:outline-none"
                      placeholder="Готов приступить сегодня..."
                      rows={3}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {submitting ? 'Отправка...' : <><CheckCircle size={20}/> Взять Задание</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
