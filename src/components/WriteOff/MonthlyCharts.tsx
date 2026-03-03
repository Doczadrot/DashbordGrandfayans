import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { WriteOffFile } from '../../types/writeoff.types';
import { GlassCard } from '../UI/GlassCard';
import { useNavigate } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend);

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

  // Группируем данные по месяцам
  const monthlyData = useMemo(() => {
    if (!files || files.length === 0) {
      return [];
    }

    try {
      const monthsMap = new Map<string, Map<string, number>>(); // month -> reason -> count

      files.forEach(file => {
        if (!file.groups) return;
        file.groups.forEach(group => {
          if (!group.items) return;
          group.items.forEach(item => {
            if (item.writeOffMonth) {
              if (!monthsMap.has(item.writeOffMonth)) {
                monthsMap.set(item.writeOffMonth, new Map());
              }
              const reasonsMap = monthsMap.get(item.writeOffMonth)!;
              const currentCount = reasonsMap.get(group.reason) || 0;
              reasonsMap.set(group.reason, currentCount + (item.quantity || 0));
            }
          });
        });
      });

      // Преобразуем в массив объектов
      const result: Array<{ month: string; reasons: Array<{ reason: string; count: number }> }> = [];
      monthsMap.forEach((reasonsMap, month) => {
        const reasons = Array.from(reasonsMap.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);
        if (reasons.length > 0) {
          result.push({ month, reasons });
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
        {monthlyData.map(({ month, reasons }) => {
          if (!reasons || reasons.length === 0) {
            return null;
          }

          const chartData: ChartData<'doughnut'> = {
            labels: reasons.map(r => r.reason || 'Не указано'),
            datasets: [
              {
                data: reasons.map(r => r.count || 0),
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

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (_event: unknown, elements: { index: number }[]) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const reason = reasons[index]?.reason;
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
            }
          },
          cutout: '60%',
        };

          return (
            <GlassCard key={month} className="p-4">
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
