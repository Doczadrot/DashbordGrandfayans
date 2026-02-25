import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  TooltipItem,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { SupplierKPI, DefectRecord } from '../../types/data.types';
import { GlassCard } from '../UI/GlassCard';
import { GripVertical } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SupplierChartProps {
  data: SupplierKPI[];
  rawData: DefectRecord[]; // Need raw data for breakdown
  onDetailClick?: (type: string, value: string) => void;
}

export const SupplierChart: React.FC<SupplierChartProps> = ({ data, rawData, onDetailClick }) => {
  const [showAll, setShowAll] = React.useState(false);
  const navigate = useNavigate();

  const chartData: ChartData<'bar'> = useMemo(() => {
    // 1. Get suppliers (sorted by total defects)
    const sortedSuppliers = [...data].sort((a, b) => b.totalDefects - a.totalDefects);
    
    // Slice if not showAll (show top 10 by default)
    const displaySuppliers = showAll ? sortedSuppliers : sortedSuppliers.slice(0, 10);
    
    const labels = displaySuppliers.map(item => item.supplier);

    // 2. Identify top reasons for coloring (e.g., top 20 reasons + "Other")
    const reasonCounts: Record<string, number> = {};
    rawData.forEach(r => {
        reasonCounts[r.claimReason] = (reasonCounts[r.claimReason] || 0) + 1;
    });
    const topReasons = Object.entries(reasonCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([r]) => r);
    
    // 3. Build datasets (one per reason)
    const datasets = topReasons.map((reason, index) => {
        // Generate distinct colors for reasons
        const colors = [
            '#FF3B30', // Red
            '#FF9500', // Orange
            '#FFCC00', // Yellow
            '#34C759', // Green
            '#00C7BE', // Teal
            '#30B0C7', // Cyan
            '#32ADE6', // Light Blue
            '#007AFF', // Blue
            '#5856D6', // Indigo
            '#AF52DE', // Purple
            '#FF2D55', // Pink
            '#A2845E', // Brown
            '#8E8E93', // Gray
            '#FF453A',
            '#FF9F0A', 
            '#FFD60A',
            '#30D158',
            '#64D2FF',
            '#0A84FF',
            '#5E5CE6'
        ];
        const color = colors[index % colors.length];

        return {
            label: reason,
            data: labels.map(supplier => {
                // Count defects for this supplier AND this reason
                return rawData.filter(r => r.supplier === supplier && r.claimReason === reason).length;
            }),
            backgroundColor: color,
            stack: 'Stack 0',
        };
    });

    // Add "Other" reasons dataset
    datasets.push({
        label: 'Другие причины',
        data: labels.map(supplier => {
            return rawData.filter(r => r.supplier === supplier && !topReasons.includes(r.claimReason)).length;
        }),
        backgroundColor: '#8E8E93', // Gray
        stack: 'Stack 0',
    });

    return {
      labels,
      datasets,
    };
  }, [data, rawData, showAll]);

  const handleChartClick = (_event: unknown, elements: { index: number }[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      // chartData.labels has the supplier names
      const supplierName = chartData.labels?.[index];
      if (supplierName) {
        if (onDetailClick) {
          onDetailClick('supplier', supplierName as string);
        } else {
          navigate(`/details?type=supplier&value=${encodeURIComponent(supplierName as string)}`);
        }
      }
    }
  };

  const options = {
    indexAxis: 'y' as const, // Horizontal bars
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    interaction: {
        mode: 'index' as const,
        intersect: false,
    },
    plugins: {
      legend: {
        display: false, 
        position: 'top' as const,
        labels: { color: '#cbd5e1' }
      },
      title: {
        display: true,
        text: 'Рейтинг Поставщиков (Все)',
        font: {
            size: 16,
            family: 'Nunito, sans-serif',
            weight: 'bold' as const
        },
        color: '#f1f5f9'
      },
      tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              bodyColor: '#1f2937',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 12,
              boxPadding: 6,
              usePointStyle: true,
              xAlign: 'left' as const, // Move tooltip to the right (caret on left)
              itemSort: (a: any, b: any) => b.parsed.x - a.parsed.x, // Sort by value descending
              callbacks: {
                  label: (context: any) => {
                       let label = context.dataset.label || '';
                       if (label) {
                           label += ': ';
                       }
                       if (context.parsed.x !== null) {
                           label += context.parsed.x;
                       }
                       return label;
                  },
                  filter: (tooltipItem: any, data: any) => {
                      // Only show top 5 items (plus filter out 0 values)
                      if (tooltipItem.parsed.x <= 0) return false;
                      
                      const dataIndex = tooltipItem.dataIndex;
                      // Get all values for this supplier
                      const values = data.datasets.map((ds: any) => ({
                          val: ds.data[dataIndex],
                          dsIndex: ds.label // Use label or index as unique identifier
                      }));
                      
                      // Sort descending
                      values.sort((a: any, b: any) => b.val - a.val);
                      
                      // Find rank
                      const rank = values.findIndex((v: any) => v.val === tooltipItem.parsed.x && v.dsIndex === tooltipItem.dataset.label);
                      
                      return rank < 5; // Top 5 (0-4)
                  },
                  footer: (tooltipItems: any[]) => {
                      let shownSum = 0;
                      tooltipItems.forEach(function(tooltipItem) {
                          shownSum += tooltipItem.parsed.x;
                      });

                      // Calculate real total from the first item's context (accessing the chart data)
                      // tooltipItems[0].chart is not directly available in standard types, but we can access data via closure or context if needed.
                      // Actually, we can't easily access the chart data here without a reference.
                      // BUT, we know the sum of *shown* items.
                      // AND we can re-calculate the total sum for the column if we could access all datasets.
                      // Fortunatelly, tooltipItems[0].dataset can give us access to the chart object? No.
                      // However, in the 'filter' we had access to 'data'. In 'footer' we only get 'tooltipItems'.
                      // WAIT: chart.js footer callback context? 
                      // (tooltipItems) => string|string[]
                      
                      // Let's rely on the fact that we can't easily get the "hidden" sum here without hacking.
                      // But wait, the user asked for "opportunity to reveal".
                      // If I can't show "Others: X", I should at least show "Total".
                      // If I filter items out, they are gone from tooltipItems.
                      // I need the total sum.
                      // I can assume the total sum is passed in? No.
                      // I can try to find the total sum from the raw data? 
                      // I have 'data' prop in the component scope! 'rawData' prop is available!
                      // But the chart might be showing filtered/processed data.
                      // 'chartData' is available in the component scope!
                      
                      const dataIndex = tooltipItems[0].dataIndex;
                      let totalSum = 0;
                      // Iterate over all datasets in the chartData object from the component scope
                      chartData.datasets.forEach(ds => {
                          const val = (ds.data[dataIndex] as number) || 0;
                          totalSum += val;
                      });

                      const hiddenSum = totalSum - shownSum;
                      const lines = [];
                      if (hiddenSum > 0) {
                          lines.push(`...и еще: ${hiddenSum}`);
                      }
                      lines.push('ИТОГО: ' + totalSum);
                      return lines;
                  }
              },
              titleFont: { size: 14, weight: 'bold' as const },
              bodyFont: { size: 13 },
              footerFont: { size: 13, weight: 'normal' as const }, // Make footer slightly distinct
              footerColor: '#6b7280',
              footerMarginTop: 8
          },
      },
    scales: {
      x: {
        stacked: true,
        grid: {
            color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
            color: '#cbd5e1'
        }
      },
      y: {
        stacked: true,
        grid: {
            display: false
        },
        ticks: {
            color: '#cbd5e1',
            autoSkip: false, // Show all suppliers
            font: {
                size: 11 
            }
        }
      }
    }
  };

  // Dynamic height based on number of suppliers to prevent squishing
  const itemsCount = showAll ? data.length : Math.min(data.length, 10);
  const height = Math.max(320, itemsCount * 36);

  return (
    <GlassCard className="w-full h-full min-h-[320px] overflow-hidden flex flex-col relative">
      <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors">
        <GripVertical size={16} />
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <div style={{ height: `${height}px` }} className="w-full transition-all duration-500 ease-in-out">
          <Chart type='bar' data={chartData} options={options} />
        </div>
      </div>
      
      {data.length > 10 && (
        <div className="mt-4 flex justify-center border-t border-white/10 pt-4 flex-shrink-0">
             <button 
                onClick={() => setShowAll(!showAll)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors border border-white/10"
             >
                {showAll ? 'Свернуть (Показать Топ-10)' : `Показать всех (${data.length})`}
             </button>
        </div>
      )}
    </GlassCard>
  );
};
