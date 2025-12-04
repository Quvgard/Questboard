import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Reward } from '../types';
import { Gift, ShoppingBag, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';

const RewardsPage: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchaseForm, setPurchaseForm] = useState({
    studentName: '',
    studentGroup: '',
    comment: ''
  });
  
  // Состояния для валидации
  const [studentPoints, setStudentPoints] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    const fetchRewards = async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) console.error(error);
      else setRewards(data || []);
      setLoading(false);
    };
    fetchRewards();
  }, []);

  // Проверка баллов студента при заполнении формы
  useEffect(() => {
    const checkStudentPoints = async () => {
      if (purchaseForm.studentName && purchaseForm.studentGroup) {
        const { data } = await supabase
          .from('students')
          .select('total_points')
          .eq('name', purchaseForm.studentName)
          .eq('student_group', purchaseForm.studentGroup)
          .single();
        
        setStudentPoints(data?.total_points || 0);
      } else {
        setStudentPoints(null);
      }
    };
    
    const timeoutId = setTimeout(checkStudentPoints, 500);
    return () => clearTimeout(timeoutId);
  }, [purchaseForm.studentName, purchaseForm.studentGroup]);

  // Валидация формы
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!purchaseForm.studentName.trim()) {
      errors.push('ФИО студента обязательно');
    }
    
    if (!purchaseForm.studentGroup.trim()) {
      errors.push('Группа обязательна');
    }
    
    if (selectedReward && studentPoints !== null) {
      const totalPrice = selectedReward.price * quantity;
      if (studentPoints < totalPrice) {
        errors.push(`Недостаточно баллов. Требуется: ${totalPrice}, доступно: ${studentPoints}`);
      }
    }
    
    if (studentPoints === null && purchaseForm.studentName && purchaseForm.studentGroup) {
      errors.push('Студент не найден в системе. Выполните задание чтобы получить баллы.');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handlePurchase = async () => {
    if (!selectedReward) return;
    
    // Валидация
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const totalPrice = selectedReward.price * quantity;
      
      // Создаем заявку
      const { error } = await supabase
        .from('reward_purchases')
        .insert([{
          reward_id: selectedReward.id,
          student_name: purchaseForm.studentName.trim(),
          student_group: purchaseForm.studentGroup.trim(),
          quantity: quantity,
          total_price: totalPrice,
          comment: purchaseForm.comment.trim() || null
        }]);

      if (error) throw error;

      // Показываем успех
      setPurchaseSuccess(true);
      
      // Автоматическое закрытие через 3 секунды
      setTimeout(() => {
        setSelectedReward(null);
        setPurchaseSuccess(false);
        setQuantity(1);
        setPurchaseForm({ studentName: '', studentGroup: '', comment: '' });
        setValidationErrors([]);
      }, 3000);
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      setValidationErrors(['Ошибка при отправке заявки: ' + error.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Вычисляем итоговую цену
  const totalPrice = selectedReward ? selectedReward.price * quantity : 0;
  
  // Проверяем достаточно ли баллов
  const hasEnoughPoints = studentPoints !== null && studentPoints >= totalPrice;
  const pointsDifference = studentPoints !== null ? totalPrice - studentPoints : 0;

  if (loading) return <div className="text-center py-20 font-hand text-2xl">Загрузка товаров...</div>;

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-hand font-bold text-gray-800 mb-2">Лавка Наград</h1>
        <p className="text-gray-600">Обменивайте заработанные баллы на ценные призы</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow flex flex-col">
            <div className="h-40 bg-gradient-to-r from-amber-100 to-amber-50 flex items-center justify-center">
              <Gift size={56} className="text-amber-600" />
            </div>
            
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="text-xl font-bold mb-2 text-gray-800">{reward.title}</h3>
              <p className="text-gray-600 text-sm mb-4 flex-grow">{reward.description}</p>
              
              <div className="flex justify-between items-center mt-auto">
                <div className="text-left">
                  <div className="text-2xl font-bold text-amber-600">{reward.price} б.</div>
                  <div className="text-xs text-gray-500">за 1 шт.</div>
                </div>
                <button 
                  onClick={() => setSelectedReward(reward)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <ShoppingBag size={18} /> Купить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {rewards.length === 0 && (
         <div className="text-center py-12 text-gray-500 font-hand text-xl">
           Магазин пока пуст. Скоро завоз!
         </div>
      )}

      {/* Модальное окно покупки */}
      {selectedReward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {purchaseSuccess ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Заявка отправлена!</h3>
                  <p className="text-gray-600 mb-4">
                    Заявка на покупку <span className="font-semibold">{selectedReward.title}</span> отправлена на подтверждение.
                  </p>
                  <p className="text-sm text-gray-500">
                    Окно закроется автоматически...
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold">Покупка товара</h2>
                    <button 
                      onClick={() => {
                        setSelectedReward(null);
                        setValidationErrors([]);
                        setPurchaseSuccess(false);
                      }}
                      className="text-gray-400 hover:text-gray-700 text-xl"
                    >
                      ✕
                    </button>
                  </div>



                  <div className="mb-6 bg-amber-50 p-4 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="bg-white p-3 rounded-full">
                        <Gift size={32} className="text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selectedReward.title}</h3>
                        <p className="text-gray-600 text-sm">{selectedReward.description}</p>
                        <div className="mt-2 text-amber-700 font-bold">
                          Цена: {selectedReward.price} баллов за шт.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Количество</label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={quantity <= 1}
                      >
                        <Minus size={20} />
                      </button>
                      <div className="text-2xl font-bold w-12 text-center">{quantity}</div>
                      <button 
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={quantity >= 10}
                      >
                        <Plus size={20} />
                      </button>
                      <div className="ml-auto text-lg font-semibold">
                        Итого: <span className="text-amber-600">{totalPrice} баллов</span>
                      </div>
                    </div>
                  </div>

                  {/* Блок с балансом */}
                  {studentPoints !== null && (
                    <div className={`mb-4 p-3 rounded-md ${hasEnoughPoints ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Ваш баланс:</span>
                        <span className={`font-bold ${hasEnoughPoints ? 'text-green-700' : 'text-red-700'}`}>
                          {studentPoints} баллов
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm">Стоимость покупки:</span>
                        <span className={`font-bold ${hasEnoughPoints ? 'text-green-700' : 'text-red-700'}`}>
                          {totalPrice} баллов
                        </span>
                      </div>
                      {!hasEnoughPoints && (
                        <div className="text-red-600 text-sm mt-2 flex items-center gap-1">
                          <AlertCircle size={16} />
                          Не хватает: {pointsDifference} баллов
                        </div>
                      )}
                      {hasEnoughPoints && studentPoints - totalPrice > 0 && (
                        <div className="text-green-600 text-sm mt-2">
                          После покупки останется: {studentPoints - totalPrice} баллов
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ФИО Студента *
                      </label>
                      <input
                        type="text"
                        className={`w-full border rounded-md p-2 focus:ring-1 focus:ring-amber-500 ${
                          purchaseForm.studentName && studentPoints === null 
                            ? 'border-red-300' 
                            : 'border-gray-300 focus:border-amber-500'
                        }`}
                        value={purchaseForm.studentName}
                        onChange={e => {
                          setPurchaseForm({...purchaseForm, studentName: e.target.value});
                          setValidationErrors([]);
                        }}
                        placeholder="Иванов Иван Иванович"
                      />
                      {purchaseForm.studentName && studentPoints === null && (
                        <div className="text-red-500 text-xs mt-1">
                          Студент не найден. Выполните задание чтобы получить баллы.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Группа *
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        value={purchaseForm.studentGroup}
                        onChange={e => {
                          setPurchaseForm({...purchaseForm, studentGroup: e.target.value});
                          setValidationErrors([]);
                        }}
                        placeholder="ИБ-101"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Комментарий (опционально)
                      </label>
                      <textarea
                        className="w-full border border-gray-300 rounded-md p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        rows={2}
                        value={purchaseForm.comment}
                        onChange={e => setPurchaseForm({...purchaseForm, comment: e.target.value})}
                        placeholder="Например, когда удобно забрать..."
                      />
                    </div>
                  </div>

                  {/* Сообщения об ошибках */}
                  {validationErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          {validationErrors.map((error, idx) => (
                            <div key={idx} className="text-red-700">{error}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8">
                    <button
                      onClick={handlePurchase}
                      disabled={isSubmitting || validationErrors.length > 0}
                      className={`w-full py-3 rounded-lg shadow-md transition-colors flex justify-center items-center gap-2 font-bold ${
                        isSubmitting || validationErrors.length > 0
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-700'
                      } text-white`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Отправка...
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={20} />
                          Купить за {totalPrice} баллов
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      После подтверждения администратора баллы будут списаны
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardsPage;