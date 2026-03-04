import React, { useMemo, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartData } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { WriteOffFile } from '../../types/writeoff.types';
import { GlassCard } from '../UI/GlassCard';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ComparativeBarChartProps {
  files: WriteOffFile[];
}

// Функция для преобразования месяца в дату для сортировки
const parseMonthToDate = (monthStr: string): Date => {
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const [monthName, year] = monthStr.split(' ');
  const monthIndex = monthNames.indexOf(monthName);
  if (monthIndex === -1 || !year) {
    return new Date(0);
  }
  return new Date(parseInt(year, 10), monthIndex, 1);
};

export const ComparativeBarChart: React.FC<ComparativeBarChartProps> = ({ files }) => {
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  // Группируем данные: причина -> месяц -> количество
  const chartData = useMemo(() => {
    if (!files || files.length === 0) {
      return null;
    }

    try {
      // Собираем все причины и месяцы
      const reasonsMap = new Map<string, Map<string, number>>(); // reason -> month -> count
      const monthsSet = new Set<string>();

      files.forEach(file => {
        if (!file.groups) return;
        file.groups.forEach(group => {
          if (!group.items) return;
          group.items.forEach(item => {
            if (item.writeOffMonth && item.writeOffReason) {
              monthsSet.add(item.writeOffMonth);
              
              if (!reasonsMap.has(item.writeOffReason)) {
                reasonsMap.set(item.writeOffReason, new Map());
              }
              const monthMap = reasonsMap.get(item.writeOffReason)!;
              const currentCount = monthMap.get(item.writeOffMonth) || 0;
              monthMap.set(item.writeOffMonth, currentCount + (item.quantity || 0));
            }
          });
        });
      });

      // Сортируем месяцы
      const sortedMonths = Array.from(monthsSet).sort((a, b) => {
        try {
          const dateA = parseMonthToDate(a);
          const dateB = parseMonthToDate(b);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          return 0;
        }
      });

      // Считаем общее количество по каждой причине (сумма по всем месяцам)
      const reasonTotals = new Map<string, number>();
      reasonsMap.forEach((monthMap, reason) => {
        let total = 0;
        monthMap.forEach(count => {
          total += count;
        });
        reasonTotals.set(reason, total);
      });

      // Сортируем причины по общему количеству и берём топ-10
      const sortedReasons = Array.from(reasonsMap.entries())
        .sort((a, b) => {
          const totalA = reasonTotals.get(a[0]) || 0;
          const totalB = reasonTotals.get(b[0]) || 0;
          return totalB - totalA;
        });

      const reasonsToShow = showAll 
        ? sortedReasons 
        : sortedReasons.slice(0, 10);

      // Формируем данные для Chart.js
      const labels = reasonsToShow.map(([reason]) => reason);
      const datasets = sortedMonths.map((month, monthIndex) => {
        // Генерируем цвет для каждого месяца
        const colors = [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F',
          '#C9CBCF', '#4BC0C0', '#FF6384', '#36A2EB'
        ];
        const color = colors[monthIndex % colors.length];

        return {
          label: month,
          data: labels.map(reason => {
            const monthMap = reasonsMap.get(reason);
            return monthMap?.get(month) || 0;
          }),
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1
        };
      });

      return {
        labels,
        datasets,
        allReasonsCount: sortedReasons.length
      };
    } catch (error) {
      console.error('WRITEOFF: Error processing comparative chart data', error);
      return null;
    }
  }, [files, showAll]);

  if (!chartData) {
    return (
      <GlassCard className="p-6">
        <p className="text-gray-400 text-center">Нет данных для отображения диаграммы</p>
      </GlassCard>
    );
  }

  const data: ChartData<'bar'> = {
    labels: chartData.labels,
    datasets: chartData.datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Переход в детальный дашборд по клику на столбец
    onClick: (_event: unknown, elements: any[]) => {
      if (!elements || elements.length === 0) return;
      const { index, datasetIndex } = elements[0];
      const reason = chartData.labels[index];
      const dataset = chartData.datasets[datasetIndex] as any;
      const month = dataset.label as string;

      if (!reason || !month) return;

      navigate(`/writeoff/details?month=${encodeURIComponent(month)}&reason=${encodeURIComponent(reason)}`);
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: {
            size: 11
          },
          boxWidth: 12
        }
      },
      title: {
        display: true,
        text: 'Сравнение причин списаний по месяцам',
        font: {
          size: 16,
          family: 'Nunito, sans-serif',
          weight: 'bold' as const
        },
        color: '#f1f5f9'
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.raw as number;
            return `${label}: ${value} шт.`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
        ticks: {
          color: '#cbd5e1',
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        stacked: false,
        ticks: {
          color: '#cbd5e1',
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        beginAtZero: true
      }
    }
  };

  return (
    <GlassCard className="p-6 relative">
      <div className="absolute top-4 right-4 z-10">
        {chartData.allReasonsCount > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
          >
            {showAll ? 'Показать топ-10' : 'Показать всех'}
          </button>
        )}
      </div>
      <div style={{ height: '400px' }}>
        <Bar data={data} options={options} />
      </div>
    </GlassCard>
  );
};
