import React, { useState, useRef } from 'react';
import { WriteOffFile } from '../../types/writeoff.types';
import { GlassCard } from '../UI/GlassCard';
import { ChartTypeSelector, ChartType } from '../UI/ChartTypeSelector';
import { Users } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

interface SupplierAnalysisProps {
    files: WriteOffFile[];
}

export const SupplierAnalysis: React.FC<SupplierAnalysisProps> = ({ files }) => {
    const [metric, setMetric] = useState<'quantity' | 'sum'>('sum');
    const [chartType, setChartType] = useState<ChartType>('horizontalBar');
    const chartRef = useRef<any>(null);

    if (files.length === 0) {
        return (
            <GlassCard className="p-6 h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-sm text-center">Нет данных по поставщикам</p>
            </GlassCard>
        );
    }

    // 1. Find Top Suppliers across ALL files
    const globalSupplierTotals = new Map<string, number>();
    files.forEach(file => {
        file.groups.forEach(group => {
            group.items.forEach(item => {
                const supplier = item.supplier ? item.supplier.trim() : 'Неизвестный поставщик';
                const value = metric === 'quantity' ? item.quantity : item.sum;
                globalSupplierTotals.set(supplier, (globalSupplierTotals.get(supplier) || 0) + value);
            });
        });
    });

    // Sort and take Top 15
    const topSuppliers = Array.from(globalSupplierTotals.keys())
        .sort((a, b) => (globalSupplierTotals.get(b) || 0) - (globalSupplierTotals.get(a) || 0))
        .slice(0, 15);

    // 2. Prepare datasets (one per file for comparison)
    const datasets = files.map((file, index) => {
        // Pre-calculate totals for this file
        const fileSupplierTotals = new Map<string, number>();
        file.groups.forEach(group => {
            group.items.forEach(item => {
                const supplier = item.supplier ? item.supplier.trim() : 'Неизвестный поставщик';
                const value = metric === 'quantity' ? item.quantity : item.sum;
                fileSupplierTotals.set(supplier, (fileSupplierTotals.get(supplier) || 0) + value);
            });
        });

        const data = topSuppliers.map(supplier => fileSupplierTotals.get(supplier) || 0);

        // Generate color
        const hue = ((index * 137.5) + 60) % 360; // Offset hue to differ from Reason chart
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

    const data = {
        labels: topSuppliers,
        datasets,
    };

    const options: any = {
        indexAxis: chartType === 'horizontalBar' ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#e5e7eb', usePointStyle: true }
            },
            title: {
                display: true,
                text: metric === 'quantity' ? 'Топ-15 Поставщиков (Количество)' : 'Топ-15 Поставщиков (Сумма убытков)',
                color: '#f3f4f6',
                font: { size: 16 }
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
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
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Users className="text-blue-400" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Анализ по поставщикам</h2>
                </div>
                <div className="flex items-center space-x-4">
                    <ChartTypeSelector currentType={chartType} onChange={setChartType} />
                    <div className="flex space-x-2 bg-white/5 p-1 rounded-lg">
                        <button 
                            onClick={() => setMetric('sum')}
                            className={`px-3 py-1 rounded-md text-sm transition-colors ${metric === 'sum' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            ₽
                        </button>
                        <button 
                            onClick={() => setMetric('quantity')}
                            className={`px-3 py-1 rounded-md text-sm transition-colors ${metric === 'quantity' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Шт
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
                />
            </GlassCard>
        </div>
    );
};
