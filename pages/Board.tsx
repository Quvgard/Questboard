import React, { useEffect, useState } from 'react';
import { fetchOrders, takeOrder } from '../services/api';
import { Order } from '../types';
import { OrderCard } from '../components/OrderCard';
import { Loader, X } from 'lucide-react';

export const Board: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form State
  const [studentName, setStudentName] = useState('');
  const [studentGroup, setStudentGroup] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleTakeClick = (order: Order) => {
    setSelectedOrder(order);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    setSubmitting(true);
    setError(null);

    try {
      await takeOrder(selectedOrder.id, studentName, studentGroup, comment);
      await loadOrders(); // Refresh to update slots
      setSelectedOrder(null);
      setStudentName('');
      setStudentGroup('');
      setComment('');
      alert("Quest Accepted! Wait for the Guild Master to approve.");
    } catch (err: any) {
      setError(err.message || "Failed to take quest");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-wood-900" size={48} /></div>;
  }

  return (
    <div>
      <h1 className="text-4xl font-marker text-wood-900 text-center mb-8 rotate-1">Available Quests</h1>
      
      {orders.length === 0 ? (
        <div className="text-center font-hand text-2xl text-wood-800 opacity-70">
          The board is empty... come back later!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} onTake={handleTakeClick} />
          ))}
        </div>
      )}

      {/* Take Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-md p-6 relative -rotate-1">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-200/80 -rotate-2 shadow-sm"></div>
            
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-marker text-wood-900 mb-4 pr-6">Accept Quest</h2>
            <p className="font-hand text-lg mb-6 text-gray-600">
              You are accepting: <span className="font-bold text-black">{selectedOrder.title}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 font-hand text-xl">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Adventurer Name</label>
                <input 
                  type="text" 
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full border-b-2 border-gray-300 focus:border-wood-700 outline-none px-2 py-1 bg-transparent"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Group / Guild</label>
                <input 
                  type="text" 
                  required
                  value={studentGroup}
                  onChange={e => setStudentGroup(e.target.value)}
                  className="w-full border-b-2 border-gray-300 focus:border-wood-700 outline-none px-2 py-1 bg-transparent"
                  placeholder="e.g. CS-101"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Note (Optional)</label>
                <textarea 
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full border-2 border-dashed border-gray-300 focus:border-wood-700 outline-none px-2 py-1 bg-gray-50 rounded"
                  rows={2}
                  placeholder="I'll finish this by Friday..."
                />
              </div>

              {error && <div className="text-red-600 font-bold text-sm">{error}</div>}

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2 bg-wood-700 text-white rounded font-bold shadow hover:bg-wood-900 disabled:opacity-50"
                >
                  {submitting ? 'Signing...' : 'Sign Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
