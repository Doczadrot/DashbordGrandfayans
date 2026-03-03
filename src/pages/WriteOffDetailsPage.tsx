import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { GlassCard } from '../components/UI/GlassCard';
import { IOSButton } from '../components/UI/IOSButton';
import { ArrowLeft } from 'lucide-react';
import { WriteOffItem } from '../types/writeoff.types';

export const WriteOffDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { writeOffData } = useStore();
  
  const month = searchParams.get('month') || '';
  const reason = searchParams.get('reason') || '';

  // Фильтруем данные по месяцу и причине
  const filteredItems = useMemo(() => {
    const items: WriteOffItem[] = [];
    
    writeOffData.forEach(file => {
      file.groups.forEach(group => {
        if (group.reason === reason) {
          group.items.forEach(item => {
            if (item.writeOffMonth === month) {
              items.push(item);
            }
          });
        }
      });
    });
    
    return items;
  }, [writeOffData, month, reason]);

  // Группируем по поставщикам
  const suppliersData = useMemo(() => {
    const suppliersMap = new Map<string, { count: number; sum: number; items: WriteOffItem[] }>();
    
    filteredItems.forEach(item => {
      const supplier = item.supplier || 'Неизвестно';
      if (!suppliersMap.has(supplier)) {
        suppliersMap.set(supplier, { count: 0, sum: 0, items: [] });
      }
      const supplierData = suppliersMap.get(supplier)!;
      supplierData.count += item.quantity;
      supplierData.sum += item.sum;
      supplierData.items.push(item);
    });
    
    return Array.from(suppliersMap.entries())
      .map(([supplier, data]) => ({ supplier, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredItems]);

  const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalSum = filteredItems.reduce((sum, item) => sum + item.sum, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <IOSButton 
              variant="secondary" 
              onClick={() => navigate('/writeoff')}
              className="flex items-center space-x-2 py-1 px-3 text-sm"
            >
              <ArrowLeft size={16} />
              <span>Назад</span>
            </IOSButton>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                Детальный анализ списаний
              </h1>
              <p className="text-gray-400 mt-1">
                Месяц: {month} | Причина: {reason}
              </p>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-6">
            <p className="text-gray-400 text-sm mb-2">Всего записей</p>
            <p className="text-3xl font-bold text-white">{filteredItems.length}</p>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-gray-400 text-sm mb-2">Общее количество</p>
            <p className="text-3xl font-bold text-white">{totalQuantity.toLocaleString()}</p>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-gray-400 text-sm mb-2">Общая сумма</p>
            <p className="text-3xl font-bold text-white">
              {totalSum.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}
            </p>
          </GlassCard>
        </div>

        {/* Виновники (Топ поставщиков) */}
        {suppliersData.length > 0 && (
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Виновники (Топ поставщиков)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-white/10">
                    <th className="pb-3 font-medium">Поставщик</th>
                    <th className="pb-3 font-medium text-right">Количество</th>
                    <th className="pb-3 font-medium text-right">Сумма</th>
                    <th className="pb-3 font-medium text-right">Записей</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliersData.map((supplier, idx) => (
                    <tr key={idx} className="text-gray-300 border-b border-white/5 hover:bg-white/5">
                      <td className="py-3">{supplier.supplier}</td>
                      <td className="py-3 text-right">{supplier.count.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        {supplier.sum.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 text-right">{supplier.items.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* Детальный список записей */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Детальный список записей</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-white/10">
                  <th className="pb-3 font-medium">Номенклатура</th>
                  <th className="pb-3 font-medium text-right">Количество</th>
                  <th className="pb-3 font-medium text-right">Себестоимость</th>
                  <th className="pb-3 font-medium">Поставщик</th>
                  <th className="pb-3 font-medium">Склад</th>
                  <th className="pb-3 font-medium">Документ списания</th>
                  <th className="pb-3 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="text-gray-300 border-b border-white/5 hover:bg-white/5">
                    <td className="py-3">{item.nomenclature}</td>
                    <td className="py-3 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="py-3 text-right">
                      {item.sum.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3">{item.supplier || 'Не указано'}</td>
                    <td className="py-3">{item.warehouse || 'Не указано'}</td>
                    <td className="py-3">{item.writeOffDocument || 'Не указано'}</td>
                    <td className="py-3">{item.writeOffDate || 'Не указано'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
