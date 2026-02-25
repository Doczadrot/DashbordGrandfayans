import React, { useMemo, useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { DefectRecord } from '../../types/data.types';
import { GlassCard } from '../UI/GlassCard';
import { GripVertical, Filter } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DefectDescriptionChartProps {
  data: DefectRecord[];
  onDetailClick?: (type: string, value: string) => void;
}

export const DefectDescriptionChart: React.FC<DefectDescriptionChartProps> = ({ data, onDetailClick }) => {
  const navigate = useNavigate();
  const [selectedReason, setSelectedReason] = useState<string>('all');

  // Extract unique reasons for the filter dropdown
  const reasons = useMemo(() => {
    const uniqueReasons = new Set(data.map(item => item.claimReason));
    return Array.from(uniqueReasons).sort();
  }, [data]);

  // Automatically select "Бой ОЗОН, Яндекс" if available
  useEffect(() => {
    const targetReason = reasons.find(r => 
      r.toLowerCase().includes('озон') && r.toLowerCase().includes('яндекс')
    );
    if (targetReason) {
      setSelectedReason(targetReason);
    }
  }, [reasons]);

  const chartData: ChartData<'doughnut'> = useMemo(() => {
    // 0. Filter data by selected reason
    const filteredData = selectedReason === 'all' 
        ? data 
        : data.filter(item => item.claimReason === selectedReason);

    // 1. Group by description
    const counts: Record<string, number> = {};
    
    filteredData.forEach(item => {
        const desc = (item.defectDescription || 'Не указано').trim();
        counts[desc] = (counts[desc] || 0) + item.quantity;
    });

    // 2. Sort by count
    const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10

    const labels = sorted.map(([k]) => k);
    const values = sorted.map(([, v]) => v);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#E7E9ED',
            '#71B37C',
            '#E6A537',
            '#6F7F8F'
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [data, selectedReason]);

  const handleChartClick = (_event: unknown, elements: { index: number }[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const label = chartData.labels?.[index] as string;
      if (label) {
        if (onDetailClick) {
          onDetailClick('description', label);
        } else {
          navigate(`/details?type=description&value=${encodeURIComponent(label)}`);
        }
      }
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#cbd5e1',
          font: {
            size: 11
          },
          boxWidth: 12
        }
      },
      title: {
        display: false, // Custom title in component
      },
      tooltip: {
          callbacks: {
              label: (context: TooltipItem<'doughnut'>) => {
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1) + '%';
                  return `${label}: ${value} шт. (${percentage})`;
              }
          }
      }
    },
    cutout: '60%',
  };

  const getTitle = () => {
    if (selectedReason === 'all') return 'Детализация дефектов';
    if (selectedReason.toLowerCase().includes('озон') && selectedReason.toLowerCase().includes('яндекс')) {
        return 'Бой ОЗОН, Яндекс';
    }
    return selectedReason.length > 20 ? selectedReason.substring(0, 20) + '...' : selectedReason;
  };

  return (
    <GlassCard className="h-full min-h-[320px] flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-start mb-4 pr-12">
          <div>
            <h3 className="text-lg font-bold text-white" title={selectedReason !== 'all' ? selectedReason : undefined}>
                {getTitle()}
            </h3>
            <p className="text-xs text-gray-400">Топ-10 дефектов</p>
          </div>
          
          <div className="relative z-20">
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-2 py-1 border border-white/10">
                <Filter size={14} className="text-gray-300" />
                <select 
                    value={selectedReason} 
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none border-none cursor-pointer max-w-[150px] truncate"
                >
                    <option value="all" className="bg-[#1c1c1e] text-white">Все причины</option>
                    {reasons.map(r => (
                        <option key={r} value={r} className="bg-[#1c1c1e] text-white">{r}</option>
                    ))}
                </select>
            </div>
          </div>
      </div>

      <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </div>

      <div className="flex-1 min-h-[200px] w-full relative">
        {chartData.labels && chartData.labels.length > 0 ? (
            <Doughnut data={chartData} options={options} />
        ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Нет данных для выбранной причины
            </div>
        )}
      </div>
    </GlassCard>
  );
};
