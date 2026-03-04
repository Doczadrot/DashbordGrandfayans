import React, { useMemo, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { WriteOffFile } from '../../types/writeoff.types';
import { GlassCard } from '../UI/GlassCard';
import { useNavigate } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend);

// Плагин для отображения суммы в центре круговой диаграммы
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: (chart: any) => {
    const ctx = chart.ctx;
    if (!chart.chartArea) return;
    
    const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
    const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
    
    // Получаем сумму из опций плагина
    const pluginOptions = chart.options?.plugins?.centerText;
    const totalSum = pluginOptions?.totalSum || 0;
    
    if (totalSum === 0) return;
    
    ctx.save();
    ctx.font = 'bold 20px Nunito, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const formattedSum = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(totalSum);
    
    ctx.fillText(formattedSum, centerX, centerY);
    ctx.restore();
  }
};

ChartJS.register(centerTextPlugin);

interface MonthlyChartsProps {
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
    return new Date(0); // Fallback для некорректных данных
  }
  return new Date(parseInt(year, 10), monthIndex, 1);
};

export const MonthlyCharts: React.FC<MonthlyChartsProps> = ({ files }) => {
  const navigate = useNavigate();

  console.log('WRITEOFF: MonthlyCharts render', {
    filesCount: files?.length ?? 0,
  });

  // Локальное состояние: какие месяцы развернуты (показывать всех причин, а не топ-15)
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Группируем данные по месяцам (с учётом суммы по дате записи)
  const monthlyData = useMemo(() => {
    if (!files || files.length === 0) {
      return [];
    }

    try {
      const monthsMap = new Map<string, {
        reasons: Map<string, number>; // reason -> count
        totalSum: number; // общая сумма по месяцу
      }>();

      files.forEach(file => {
        if (!file.groups) return;
        file.groups.forEach(group => {
          if (!group.items) return;
          group.items.forEach(item => {
            if (item.writeOffMonth) {
              if (!monthsMap.has(item.writeOffMonth)) {
                monthsMap.set(item.writeOffMonth, {
                  reasons: new Map(),
                  totalSum: 0
                });
              }
              const monthData = monthsMap.get(item.writeOffMonth)!;
              const currentCount = monthData.reasons.get(group.reason) || 0;
              monthData.reasons.set(group.reason, currentCount + (item.quantity || 0));
              // Суммируем сумму по дате записи (writeOffDate)
              monthData.totalSum += item.sum || 0;
            }
          });
        });
      });

      // Преобразуем в массив объектов
      const result: Array<{ 
        month: string; 
        reasons: Array<{ reason: string; count: number }>;
        totalSum: number;
      }> = [];
      monthsMap.forEach((monthData, month) => {
        const reasons = Array.from(monthData.reasons.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);
        if (reasons.length > 0) {
          result.push({ month, reasons, totalSum: monthData.totalSum });
        }
      });

      // Сортируем по дате (месяц)
      result.sort((a, b) => {
        try {
          const dateA = parseMonthToDate(a.month);
          const dateB = parseMonthToDate(b.month);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          console.error('WRITEOFF: Error sorting months', e);
          return 0;
        }
      });

      return result;
    } catch (error) {
      console.error('WRITEOFF: Error processing monthly data', error);
      return [];
    }
  }, [files]);

  const handleChartClick = (month: string, reason: string) => {
    // Переход в детальный дашборд
    navigate(`/writeoff/details?month=${encodeURIComponent(month)}&reason=${encodeURIComponent(reason)}`);
  };

  if (monthlyData.length === 0) {
    return (
      <GlassCard className="p-6">
        <p className="text-gray-400 text-center">Нет данных для отображения диаграмм</p>
        <p className="text-gray-500 text-sm text-center mt-2">
          Убедитесь, что в файлах списаний указаны даты в документах списания
        </p>
      </GlassCard>
    );
  }

  try {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {monthlyData.map(({ month, reasons, totalSum }) => {
          if (!reasons || reasons.length === 0) {
            return null;
          }

          const isExpanded = expandedMonths[month] ?? false;
          const reasonsToShow = isExpanded ? reasons : reasons.slice(0, 15);

          const chartData: ChartData<'doughnut'> = {
            labels: reasonsToShow.map(r => r.reason || 'Не указано'),
            datasets: [
              {
                data: reasonsToShow.map(r => r.count || 0),
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
                type: 'doughnut'
              },
            ],
          };

        // Находим общую сумму для этого месяца
        const monthTotalSum = monthlyData.find(m => m.month === month)?.totalSum || 0;

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (_event: unknown, elements: { index: number }[]) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const reason = reasonsToShow[index]?.reason;
              if (reason) {
                handleChartClick(month, reason);
              }
            }
          },
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
              display: true,
              text: `Списания за ${month}`,
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
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1) + '%';
                  return `${label}: ${value} шт. (${percentage})`;
                }
              }
            },
            centerText: {
              totalSum: monthTotalSum
            }
          },
          cutout: '60%',
        };

          return (
            <GlassCard key={month} className="p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">
                  {isExpanded
                    ? `Показаны все (${reasons.length}) причин` 
                    : `Топ-15 из ${reasons.length} причин`}
                </span>
                {reasons.length > 15 && (
                  <button
                    onClick={() =>
                      setExpandedMonths(prev => ({
                        ...prev,
                        [month]: !isExpanded,
                      }))
                    }
                    className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                  >
                    {isExpanded ? 'Показать топ-15' : 'Показать всех'}
                  </button>
                )}
              </div>
              <div style={{ height: '320px' }}>
                <Doughnut data={chartData} options={options} />
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  } catch (error) {
    console.error('WRITEOFF: Error rendering charts', error);
    return (
      <GlassCard className="p-6">
        <p className="text-red-400 text-center">Ошибка при отображении диаграмм</p>
        <p className="text-gray-500 text-sm text-center mt-2">
          {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </p>
      </GlassCard>
    );
  }
};
