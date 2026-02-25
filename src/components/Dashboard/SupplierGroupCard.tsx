import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { GlassCard } from '../UI/GlassCard';
import { GripVertical, Settings, Check, X, Globe, Flag, Armchair } from 'lucide-react';
import { IOSButton } from '../UI/IOSButton';
import { DefectRecord } from '../../types/data.types';

interface SupplierGroupCardProps {
  title: string;
  groupKey: 'china' | 'rf' | 'furniture';
  data: DefectRecord[];
  totalDefects: number;
  onDetailClick?: (type: string, value: string) => void;
}

export const SupplierGroupCard: React.FC<SupplierGroupCardProps> = ({ title, groupKey, data, totalDefects, onDetailClick }) => {
  const navigate = useNavigate();
  const { supplierGroups, updateSupplierGroup } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get selected suppliers for this group
  const selectedSuppliers = supplierGroups[groupKey] || [];

  // Get map of suppliers in OTHER groups to their group name
  const otherGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    (Object.keys(supplierGroups) as Array<keyof typeof supplierGroups>).forEach(key => {
      if (key !== groupKey) {
        supplierGroups[key].forEach(s => map.set(s, key));
      }
    });
    return map;
  }, [supplierGroups, groupKey]);

  // Get all unique suppliers from data
  const allSuppliers = useMemo(() => {
    const suppliers = new Set(data.map(d => d.supplier).filter(Boolean));
    return Array.from(suppliers).sort();
  }, [data]);

  // Filter data for this group
  const groupData = useMemo(() => {
    if (selectedSuppliers.length === 0) return [];
    return data.filter(d => selectedSuppliers.includes(d.supplier));
  }, [data, selectedSuppliers]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const defectsQty = groupData.reduce((sum, d) => sum + d.quantity, 0);
    const defectsCount = groupData.length;
    const percentage = totalDefects > 0 ? (defectsQty / totalDefects) * 100 : 0;
    
    // Top defect
    const defectCounts: Record<string, number> = {};
    groupData.forEach(d => {
      const desc = d.defectDescription || 'Не указано';
      defectCounts[desc] = (defectCounts[desc] || 0) + d.quantity;
    });
    
    const topDefect = Object.entries(defectCounts)
      .sort(([, a], [, b]) => b - a)[0];

    // Top supplier within group (culprit)
    const supplierCounts: Record<string, number> = {};
    groupData.forEach(d => {
      const supp = d.supplier;
      supplierCounts[supp] = (supplierCounts[supp] || 0) + d.quantity;
    });
    
    const topSupplier = Object.entries(supplierCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      totalDefects: defectsCount,
      percentage,
      topDefect: topDefect ? { name: topDefect[0], count: topDefect[1] } : null,
      topSupplier: topSupplier ? { name: topSupplier[0], count: topSupplier[1] } : null
    };
  }, [groupData, totalDefects]);

  // Modal handlers
  const handleToggleSupplier = (supplier: string) => {
    const newSelection = selectedSuppliers.includes(supplier)
      ? selectedSuppliers.filter(s => s !== supplier)
      : [...selectedSuppliers, supplier];
    updateSupplierGroup(groupKey, newSelection);
  };

  const filteredSuppliers = allSuppliers.filter(s => 
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGroupStyles = () => {
    switch (groupKey) {
      case 'china':
        return {
          icon: <Globe size={20} className="text-gray-400" />,
          barColor: 'bg-red-500',
          borderColor: 'border-blue-500' // Blue left border as in image
        };
      case 'rf':
        return {
          icon: <Flag size={20} className="text-gray-400" />,
          barColor: 'bg-blue-500',
          borderColor: 'border-blue-500'
        };
      case 'furniture':
        return {
          icon: <Armchair size={20} className="text-gray-400" />,
          barColor: 'bg-yellow-500',
          borderColor: 'border-yellow-500'
        };
    }
  };

  const styles = getGroupStyles();

  return (
    <>
      <GlassCard 
        className={`h-full p-6 relative flex flex-col border-l-4 group ${styles.borderColor} cursor-pointer hover:bg-white/5 transition-all active:scale-[0.98]`}
        onClick={() => navigate(`/details?type=group&value=${groupKey}`)}
      >
        <div className="flex justify-between items-start mb-2 pr-8">
          <h3 className="text-xs uppercase font-bold text-gray-300 tracking-wider">{title} <span className="text-gray-500">({selectedSuppliers.length})</span></h3>
          <div className="flex items-center space-x-2">
            {styles.icon}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              title="Настроить список поставщиков"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div 
          className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-transparent text-gray-200 hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </div>

        <div className="flex-grow flex flex-col justify-center">
          <div className="flex items-baseline space-x-3 mb-2">
            <span className="text-4xl font-bold text-white">{metrics.totalDefects}</span>
            <span className="text-sm font-medium text-gray-400">{metrics.percentage.toFixed(1)}%</span>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full ${styles.barColor} rounded-full`} 
              style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
            />
          </div>

          {metrics.topSupplier && (
            <div className="pt-3 border-t border-white/10">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 truncate max-w-[120px]" title={metrics.topSupplier.name}>
                  {metrics.topSupplier.name}
                </span>
                <span className="text-white font-medium">
                  {metrics.topSupplier.count}
                </span>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Configuration Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md max-h-[80vh] flex flex-col bg-[#1c1c1e] border-white/20 shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Настройка: {title}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-white/10">
              <input
                type="text"
                placeholder="Поиск поставщика..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="flex-grow overflow-y-auto p-2 space-y-1">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map(supplier => {
                  const otherGroup = otherGroupMap.get(supplier);
                  const isOther = !!otherGroup;
                  const groupName = otherGroup === 'china' ? 'Китай' : otherGroup === 'rf' ? 'РФ' : 'Мебель';

                  return (
                    <label 
                      key={supplier} 
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        isOther 
                          ? 'opacity-40 cursor-not-allowed bg-white/5' 
                          : 'hover:bg-white/5 cursor-pointer'
                      }`}
                      title={isOther ? `Уже выбран в группе "${groupName}"` : undefined}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        selectedSuppliers.includes(supplier) 
                          ? 'bg-blue-500 border-blue-500 text-white' 
                          : 'border-gray-500 text-transparent'
                      }`}>
                        {selectedSuppliers.includes(supplier) && <Check size={12} />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={selectedSuppliers.includes(supplier)}
                        onChange={() => !isOther && handleToggleSupplier(supplier)}
                        disabled={isOther}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-200">{supplier}</span>
                        {isOther && (
                          <span className="text-[10px] text-red-400 font-medium uppercase tracking-wider">
                            В группе: {groupName}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Поставщики не найдены
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end">
              <IOSButton onClick={() => setIsModalOpen(false)}>
                Готово
              </IOSButton>
            </div>
          </GlassCard>
        </div>,
        document.body
      )}
    </>
  );
};
