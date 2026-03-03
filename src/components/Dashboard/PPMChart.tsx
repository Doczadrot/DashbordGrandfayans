import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { DefectRecord } from '../../types/data.types';
import { ArrivalFile } from '../../types/arrival.types';
import { GlassCard } from '../UI/GlassCard';
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PPMChartProps {
  defectData: DefectRecord[];
  arrivalData: ArrivalFile[];
  onSupplierClick?: (supplier: string, month?: string) => void;
  onResetFilter?: () => void;
  hasActiveFilters?: boolean;
}

interface PPMData {
  supplier: string;
  months: Record<string, { defectQty: number; arrivalQty: number; ppm: number }>;
  totalPpm: number;
}

// Яркие цвета без серого/коричневого
const MONTH_COLORS: Record<string, string> = {
  'Январь': '#007AFF',      // Яркий синий
  'Февраль': '#34C759',     // Яркий зеленый
  'Март': '#FF9500',        // Яркий оранжевый
  'Апрель': '#AF52DE',      // Яркий фиолетовый
  'Май': '#FF3B30',         // Яркий красный
  'Июнь': '#5AC8FA',        // Яркий голубой
  'Июль': '#FFCC00',        // Яркий желтый
  'Август': '#FF2D55',      // Яркий розовый
  'Сентябрь': '#00C7BE',    // Яркий бирюзовый
  'Октябрь': '#5856D6',     // Яркий индиго
  'Ноябрь': '#FF6B35',      // Яркий красно-оранжевый (вместо серого)
  'Декабрь': '#FF6B6B',     // Яркий коралловый
};

const MONTH_ORDER = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function extractMonthFromPeriod(period: string): string {
  const months: Record<string, string> = {
    '01': 'Январь', '02': 'Февраль', '03': 'Март', '04': 'Апрель',
    '05': 'Май', '06': 'Июнь', '07': 'Июль', '08': 'Август',
    '09': 'Сентябрь', '10': 'Октябрь', '11': 'Ноябрь', '12': 'Декабрь'
  };
  const match = period.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) {
    const monthNum = match[2];
    return months[monthNum] || period;
  }
  return period;
}

function normalizeMonthName(monthStr: string): string {
  const parts = monthStr.trim().split(' ');
  return parts[0];
}

export const PPMChart: React.FC<PPMChartProps> = ({ defectData, arrivalData, onSupplierClick, onResetFilter, hasActiveFilters }) => {
  const [showAll, setShowAll] = useState(false);
  // Локальный флаг для отображения среднего PPM (не влияет на фильтры)
  const [showAverage, setShowAverage] = useState(false);

  const chartData = useMemo(() => {
    if (!defectData.length || !arrivalData.length) {
      return null;
    }

    // Фильтруем только записи с точным совпадением "Заводской брак"
    // Исключаем другие типы брака (Бой озон/яндекс, бой/скол от поставщика и т.д.)
    const factoryDefects = defectData.filter(item => {
      const reason = (item.claimReason || '').trim();
      // Точное совпадение с "Заводской брак" или "Производственный брак"
      return reason === 'Заводской брак' || reason === 'Производственный брак';
    });

    const defectBySupplierMonth: Record<string, Record<string, number>> = {};
    factoryDefects.forEach(item => {
      const supplier = item.supplier?.trim();
      const month = normalizeMonthName(item.reportMonth || 'Неизвестно');
      if (supplier && supplier !== 'Неизвестно') {
        if (!defectBySupplierMonth[supplier]) {
          defectBySupplierMonth[supplier] = {};
        }
        defectBySupplierMonth[supplier][month] = (defectBySupplierMonth[supplier][month] || 0) + item.quantity;
      }
    });

    const arrivalBySupplierMonth: Record<string, Record<string, number>> = {};
    arrivalData.forEach(file => {
      const month = normalizeMonthName(extractMonthFromPeriod(file.period || ''));
      file.suppliers.forEach(supplier => {
        const name = supplier.supplier?.trim();
        if (name && name !== '') {
          if (!arrivalBySupplierMonth[name]) {
            arrivalBySupplierMonth[name] = {};
          }
          arrivalBySupplierMonth[name][month] = (arrivalBySupplierMonth[name][month] || 0) + supplier.totalQuantity;
        }
      });
    });

    const allMonths = new Set<string>();
    Object.values(defectBySupplierMonth).forEach(months => {
      Object.keys(months).forEach(m => allMonths.add(m));
    });
    Object.values(arrivalBySupplierMonth).forEach(months => {
      Object.keys(months).forEach(m => allMonths.add(m));
    });
    const sortedMonths = Array.from(allMonths).sort((a, b) => {
      return MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b);
    });

    const suppliersWithBoth = new Set<string>();
    Object.keys(defectBySupplierMonth).forEach(supplier => {
      if (arrivalBySupplierMonth[supplier]) {
        suppliersWithBoth.add(supplier);
      }
    });

    const ppmData: PPMData[] = [];
    let globalDefect = 0;
    let globalArrival = 0;

    suppliersWithBoth.forEach(supplier => {
      const months: Record<string, { defectQty: number; arrivalQty: number; ppm: number }> = {};
      let totalDefect = 0;
      let totalArrival = 0;
      
      sortedMonths.forEach(month => {
        const defectQty = defectBySupplierMonth[supplier]?.[month] || 0;
        const arrivalQty = arrivalBySupplierMonth[supplier]?.[month] || 0;
        
        if (arrivalQty > 0) {
          const ppm = (defectQty / arrivalQty) * 100;
          months[month] = {
            defectQty,
            arrivalQty,
            ppm: Math.round(ppm * 100) / 100
          };
          totalDefect += defectQty;
          totalArrival += arrivalQty;
          globalDefect += defectQty;
          globalArrival += arrivalQty;
        }
      });

      if (Object.keys(months).length > 0) {
        ppmData.push({ 
          supplier, 
          months,
          totalPpm: totalArrival > 0 ? (totalDefect / totalArrival) * 100 : 0
        });
      }
    });

    ppmData.sort((a, b) => b.totalPpm - a.totalPpm);
    
    const globalAvgPpm = globalArrival > 0 ? (globalDefect / globalArrival) * 100 : 0;

    const displayData = showAll ? ppmData : ppmData.slice(0, 10);

    // Если showAverage и есть несколько месяцев, показываем средний PPM по каждому поставщику
    let datasets;
    if (showAverage && sortedMonths.length > 1) {
      // Показываем один столбец со средним PPM для каждого поставщика
      datasets = [{
        label: 'Средний PPM',
        data: displayData.map(d => {
          // Используем totalPpm, который уже рассчитан как средний по всем месяцам
          return Math.round(d.totalPpm * 100) / 100;
        }),
        backgroundColor: '#007AFFCC', // Синий цвет для среднего
        borderColor: '#007AFF',
        borderWidth: 1,
        borderRadius: 4,
      }];
    } else {
      // Обычный режим - показываем столбцы по месяцам
      datasets = sortedMonths.map((month, idx) => {
        const color = MONTH_COLORS[month] || `hsl(${(idx * 360) / sortedMonths.length}, 70%, 50%)`;
        return {
          label: month,
          data: displayData.map(d => d.months[month]?.ppm || 0),
          backgroundColor: color + 'CC',
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4,
        };
      });
    }

    return {
      labels: displayData.map(d => d.supplier.length > 15 ? d.supplier.substring(0, 15) + '...' : d.supplier),
      datasets,
      rawData: displayData,
      months: sortedMonths,
      totalCount: ppmData.length,
      globalAvgPpm,
      globalDefect,
      globalArrival,
    };
  }, [defectData, arrivalData, showAll, showAverage]);

  const handleBarClick = React.useCallback((_event: unknown, elements: unknown[]) => {
    if (elements && (elements as any[]).length > 0 && onSupplierClick && chartData) {
      const element = (elements as any[])[0];
      const datasetIndex = element.datasetIndex;
      const dataIndex = element.index;
      
      const supplier = chartData.rawData[dataIndex]?.supplier;
      
      if (supplier && onSupplierClick) {
        // Если показываем средний PPM, не передаем месяц (undefined)
        // Иначе передаем месяц из датасета
        const clickedMonth = showAverage ? undefined : chartData.months[datasetIndex];
        onSupplierClick(supplier, clickedMonth);
      }
    }
  }, [chartData, onSupplierClick, showAverage]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: unknown, elements: unknown[]) => handleBarClick(event, elements),
    plugins: {
      legend: {
        display: chartData && chartData.months.length > 1 && !showAverage,
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
          boxWidth: 12,
          padding: 8,
          font: { size: 10 }
        }
      },
      title: {
        display: true,
        text: 'PPM по поставщикам (заводской брак)',
        font: {
          size: 16,
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
          weight: 'bold' as const,
        },
        color: '#f3f4f6',
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        filter: (tooltipItem: any) => {
          // Показываем tooltip только если есть данные
          return tooltipItem.parsed.y > 0;
        },
        callbacks: {
          title: (items: any[]) => {
            // Показываем название поставщика из rawData
            if (!chartData?.rawData || items.length === 0) return '';
            const firstItem = items[0];
            const dataIndex = firstItem.dataIndex;
            const supplierData = chartData.rawData[dataIndex];
            return supplierData?.supplier || firstItem.label || '';
          },
          label: (context: any) => {
            const rawData = chartData?.rawData;
            if (!rawData || !context) return '';
            
            const dataIndex = context.dataIndex;
            if (dataIndex === undefined || dataIndex < 0 || dataIndex >= rawData.length) return '';
            
            const supplierData = rawData[dataIndex];
            if (!supplierData) return '';
            
            // Если показываем средний PPM, показываем общую информацию по всем месяцам
            if (showAverage && chartData.months.length > 1) {
              let totalDefect = 0;
              let totalArrival = 0;
              chartData.months.forEach(month => {
                const monthData = supplierData.months?.[month];
                if (monthData) {
                  totalDefect += monthData.defectQty;
                  totalArrival += monthData.arrivalQty;
                }
              });
              const avgPpm = totalArrival > 0 ? (totalDefect / totalArrival) * 100 : 0;
              return `Средний PPM: ${avgPpm.toFixed(2)}% (Брак: ${totalDefect} шт., Поставки: ${totalArrival.toLocaleString()} шт.)`;
            }
            
            // Обычный режим - показываем данные по месяцу
            const month = context.datasetLabel || context.dataset?.label;
            if (!month) return '';
            
            const monthData = supplierData.months?.[month];
            if (!monthData || monthData.ppm === 0) return '';
            
            // Показываем всю информацию: месяц, PPM, количество брака и поставок
            return `${month}: PPM ${monthData.ppm}% (Брак: ${monthData.defectQty} шт., Поставки: ${monthData.arrivalQty.toLocaleString()} шт.)`;
          },
          afterBody: (items: any[]) => {
            return '\nКликните для фильтрации';
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          color: '#9ca3af',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'PPM (%)',
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
  }), [chartData, showAverage, handleBarClick]);

  if (!chartData) {
    return (
      <GlassCard className="h-full min-h-[300px] w-full bg-white/5 border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p>Нет данных о приходах</p>
            <p className="text-sm mt-2">Загрузите файл приходов для расчёта PPM</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (chartData.labels.length === 0) {
    return (
      <GlassCard className="h-full min-h-[300px] w-full bg-white/5 border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p>Нет данных о заводском браке</p>
            <p className="text-sm mt-2">Для расчёта PPM нужны данные о браке и приходах</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full min-h-[360px] w-full bg-white/5 border-white/10 relative overflow-hidden">
      <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors">
        <GripVertical size={16} />
      </div>

      {/* Панель управления: Все (N), Показать средний PPM, Сбросить фильтр */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {chartData.totalCount > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1 text-xs bg-white/10 text-gray-300 rounded-full hover:bg-white/20 transition-colors flex items-center gap-1"
          >
            {showAll ? (
              <>Свернуть <ChevronUp size={12} /></>
            ) : (
              <>Все ({chartData.totalCount}) <ChevronDown size={12} /></>
            )}
          </button>
        )}

        <button
          onClick={() => setShowAverage(prev => !prev)}
          className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-300 rounded-full hover:bg-emerald-500/40 transition-colors"
        >
          {showAverage ? 'Скрыть средний PPM' : 'Показать средний PPM'}
        </button>

        {hasActiveFilters && onResetFilter && (
          <button
            onClick={() => {
              if (onResetFilter) {
                onResetFilter();
              }
            }}
            className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/40 transition-colors"
          >
            Убрать фильтры
          </button>
        )}
      </div>

      <div className="h-full w-full pt-10">
        <Chart type='bar' data={chartData} options={options} />
      </div>
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">
        Кликните на столбец для фильтрации списка по поставщику и месяцу
      </div>
    </GlassCard>
  );
};
