import React, { useState, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartEvent, ActiveElement, PointElement, LineElement, ArcElement } from 'chart.js';
import { Chart, getElementAtEvent } from 'react-chartjs-2';
import { WriteOffFile } from '../../types/writeoff.types';
import { GlassCard } from '../UI/GlassCard';
import { IOSButton } from '../UI/IOSButton';
import { ChartTypeSelector, ChartType } from '../UI/ChartTypeSelector';
import { X, User, ChevronDown, ChevronUp, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

interface WriteOffChartProps {
    files: WriteOffFile[];
}

interface AggregatedItem {
    key: string;
    nomenclature: string;
    supplier: string;
    docReason: string;
    quantity: number;
    sum: number;
}

export const WriteOffChart: React.FC<WriteOffChartProps> = ({ files }) => {
    const [metric, setMetric] = useState<'quantity' | 'sum'>('sum');
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [chartType, setChartType] = useState<ChartType>('horizontalBar');
    const chartRef = useRef<any>(null);

    if (files.length === 0) {
        return (
            <GlassCard className="p-8 text-center text-gray-400">
                Нет данных для отображения. Загрузите файлы "Анализ причин списания".
            </GlassCard>
        );
    }

    // 1. Get all unique reasons and calculate totals for sorting
    const reasonTotals = new Map<string, number>();
    
    files.forEach(file => {
        file.groups.forEach(group => {
            const currentTotal = reasonTotals.get(group.reason) || 0;
            const value = metric === 'quantity' ? group.totalQuantity : group.totalSum;
            reasonTotals.set(group.reason, currentTotal + value);
        });
    });

    const allReasons = Array.from(reasonTotals.keys())
        .sort((a, b) => (reasonTotals.get(b) || 0) - (reasonTotals.get(a) || 0));

    // 2. Prepare datasets
    const datasets = files.map((file, index) => {
        // Create a map for quick lookup
        const reasonMap = new Map(file.groups.map(g => [g.reason, g]));

        const data = allReasons.map(reason => {
            const group = reasonMap.get(reason);
            if (!group) return 0;
            return metric === 'quantity' ? group.totalQuantity : group.totalSum;
        });

        // Generate color based on index
        const hue = (index * 137.5) % 360;
        const color = `hsla(${hue}, 70%, 60%, 0.8)`;
        const borderColor = `hsla(${hue}, 70%, 60%, 1)`;

        return {
            label: `${file.period} (${file.filename})`,
            data,
            backgroundColor: color,
            borderColor: borderColor,
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.9,
        };
    });

    const handleChartClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const chart = chartRef.current;
        if (!chart) return;

        const elements = getElementAtEvent(chart, event);
        if (elements.length > 0) {
            const element = elements[0];
            const reasonIndex = element.index;
            const reason = allReasons[reasonIndex];
            setSelectedReason(reason === selectedReason ? null : reason);
        }
    };

    const data = {
        labels: allReasons,
        datasets,
    };

    const options: any = {
        indexAxis: chartType === 'horizontalBar' ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event: ChartEvent, elements: ActiveElement[]) => {
            // Handled via onClick on the canvas element wrapper or using getElementAtEvent
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#e5e7eb',
                    usePointStyle: true,
                }
            },
            title: {
                display: true,
                text: metric === 'quantity' ? 'Сравнительный анализ (Количество)' : 'Сравнительный анализ (Сумма убытков)',
                color: '#f3f4f6',
                font: { size: 16 }
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        let value;
                        if (chartType === 'pie' || chartType === 'doughnut') {
                            value = context.parsed;
                        } else if (chartType === 'horizontalBar') {
                            value = context.parsed.x;
                        } else {
                            value = context.parsed.y;
                        }

                        if (value !== null && value !== undefined) {
                            if (metric === 'sum') {
                                label += new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
                                
                                // Find quantity for tooltip
                                const fileIndex = context.datasetIndex;
                                const reasonIndex = context.dataIndex;
                                const reason = allReasons[reasonIndex];
                                const file = files[fileIndex];
                                const group = file.groups.find(g => g.reason === reason);
                                if (group) {
                                    label += ` (${group.totalQuantity} шт.)`;
                                }
                            } else {
                                label += value + ' шт.';
                            }
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#cbd5e1' }
            },
            y: {
                grid: { display: false },
                ticks: { 
                    color: '#cbd5e1',
                    autoSkip: false,
                    font: { size: 11 }
                }
            }
        }
    };
    
    // Remove scales for Pie/Doughnut
    if (chartType === 'pie' || chartType === 'doughnut') {
        delete options.scales;
        delete options.indexAxis;
    }

    const actualType = chartType === 'horizontalBar' ? 'bar' : chartType;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <PieChart className="text-purple-400" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Анализ по причинам</h2>
                </div>
                <div className="flex items-center space-x-4">
                    <ChartTypeSelector currentType={chartType} onChange={setChartType} />
                    <div className="flex space-x-2 bg-white/5 p-1 rounded-lg">
                        <button 
                            onClick={() => setMetric('sum')}
                            className={`px-3 py-1 rounded-md text-sm transition-colors ${metric === 'sum' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Деньги (₽)
                        </button>
                        <button 
                            onClick={() => setMetric('quantity')}
                            className={`px-3 py-1 rounded-md text-sm transition-colors ${metric === 'quantity' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Количество (шт)
                        </button>
                    </div>
                </div>
            </div>

            <GlassCard className="flex-1 min-h-[400px] w-full p-4">
                <Chart 
                    type={actualType}
                    ref={chartRef}
                    data={data} 
                    options={options} 
                    onClick={handleChartClick}
                />
                <div className="mt-2 text-center text-xs text-gray-400">
                    Нажмите на элемент графика, чтобы увидеть детализацию по поставщикам
                </div>
            </GlassCard>

            {/* Drill-down Section */}
            <AnimatePresence>
                {selectedReason && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg mr-3 text-lg">
                                    {selectedReason}
                                </span>
                                Детализация по поставщикам
                            </h3>
                            <button 
                                onClick={() => setSelectedReason(null)}
                                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {files.map((file, idx) => {
                                const group = file.groups.find(g => g.reason === selectedReason);
                                
                                if (!group) {
                                    return (
                                        <GlassCard key={idx} className="p-6 opacity-50">
                                            <h4 className="font-bold text-white mb-2">{file.period}</h4>
                                            <p className="text-gray-400">Нет данных по этой причине</p>
                                        </GlassCard>
                                    );
                                }

                                // Aggregate items
                                const aggregatedItems = new Map<string, AggregatedItem>();
                                
                                group.items.forEach(item => {
                                    const key = `${item.nomenclature}|${item.docReason}|${item.supplier}`;
                                    
                                    if (!aggregatedItems.has(key)) {
                                        aggregatedItems.set(key, {
                                            key,
                                            nomenclature: item.nomenclature,
                                            docReason: item.docReason,
                                            supplier: item.supplier || 'Не указан',
                                            quantity: 0,
                                            sum: 0
                                        });
                                    }
                                    
                                    const agg = aggregatedItems.get(key)!;
                                    agg.quantity += item.quantity;
                                    agg.sum += item.sum;
                                });

                                const items = Array.from(aggregatedItems.values())
                                    .sort((a, b) => b.quantity - a.quantity); // Sort by quantity desc

                                return (
                                    <GlassCard key={idx} className="p-0 overflow-hidden flex flex-col max-h-[600px]">
                                        <div className="p-4 bg-white/5 border-b border-white/10 shrink-0">
                                            <h4 className="font-bold text-white">{file.period}</h4>
                                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                                <span>Всего: {group.totalQuantity} шт</span>
                                                <span>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(group.totalSum)}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-1">
                                            {items.map((item, i) => (
                                                <div key={i} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-medium text-white text-sm line-clamp-2" title={item.nomenclature}>
                                                            {item.nomenclature}
                                                        </div>
                                                        <div className="text-right shrink-0 ml-2">
                                                            <div className="text-emerald-400 font-bold text-sm">
                                                                {item.quantity} шт
                                                            </div>
                                                            <div className="text-gray-500 text-[10px]">
                                                                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(item.sum)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-white/5 mt-2">
                                                        <div className="flex items-center space-x-1 truncate max-w-[60%]">
                                                            <User size={12} className="shrink-0" />
                                                            <span className="truncate" title={item.supplier}>{item.supplier}</span>
                                                        </div>
                                                        <div className="truncate max-w-[40%] text-right text-gray-500" title={item.docReason}>
                                                            {item.docReason}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
