import React from 'react';
import { DashboardStats } from '../../types/data.types';
import { GlassCard } from '../UI/GlassCard';
import { TrendingUp, AlertTriangle, Users } from 'lucide-react';

interface KPICardsProps {
  stats: DashboardStats;
  onDetailClick?: (type: string, value: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({ stats, onDetailClick }) => {
  return (
    <>
      <div key="kpi_total">
        <GlassCard 
          className="h-full flex items-center space-x-4 transform transition-transform hover:scale-105 cursor-pointer"
          onClick={() => onDetailClick?.('total', 'all')}
        >
          <div className="p-3 bg-red-500/20 rounded-full text-red-400 shadow-sm">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-300 font-medium">Количество НП</p>
            <h4 className="text-2xl font-bold text-white">{stats.totalDefects}</h4>
          </div>
        </GlassCard>
      </div>

      <div key="kpi_reason">
        <GlassCard 
          className="h-full flex items-center space-x-4 transform transition-transform hover:scale-105 cursor-pointer"
          onClick={() => stats.topReason && onDetailClick?.('reason', stats.topReason)}
        >
          <div className="p-3 bg-blue-500/20 rounded-full text-blue-400 shadow-sm">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-300 font-medium">Топ причина</p>
            <h4 className="text-lg font-bold text-white truncate max-w-[180px]" title={stats.topReason}>
              {stats.topReason || 'Н/Д'}
            </h4>
          </div>
        </GlassCard>
      </div>

      <div key="kpi_supplier">
        <GlassCard 
          className="h-full flex items-center space-x-4 transform transition-transform hover:scale-105 cursor-pointer"
          onClick={() => stats.topSupplier && onDetailClick?.('supplier', stats.topSupplier)}
        >
          <div className="p-3 bg-green-500/20 rounded-full text-green-400 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-300 font-medium">Топ поставщик</p>
            <h4 className="text-lg font-bold text-white truncate max-w-[180px]" title={stats.topSupplier}>
              {stats.topSupplier || 'Н/Д'}
            </h4>
          </div>
        </GlassCard>
      </div>
    </>
  );
};