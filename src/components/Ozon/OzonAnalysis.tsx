import React, { useState } from 'react';
import { WriteOffFile, WriteOffItem } from '../../types/writeoff.types';
import { GlassCard } from '../UI/GlassCard';
import { ChevronDown, ChevronUp, Package, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OzonAnalysisProps {
    files: WriteOffFile[];
}

interface SkuStats {
    nomenclature: string;
    quantity: number;
    sum: number;
}

interface MonthStats {
    period: string;
    filename: string;
    topSkus: SkuStats[];
    totalQuantity: number;
    totalSum: number;
}

export const OzonAnalysis: React.FC<OzonAnalysisProps> = ({ files }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter and process data
    const monthsData: MonthStats[] = files.map(file => {
        // Filter items related to Ozon/Yandex
        const ozonItems: WriteOffItem[] = [];
        
        file.groups.forEach(group => {
            const isOzon = /озон|ozon|яндекс|yandex/i.test(group.reason);
            if (isOzon) {
                ozonItems.push(...group.items);
            }
        });

        // Group by SKU
        const skuMap = new Map<string, SkuStats>();
        let totalQuantity = 0;
        let totalSum = 0;

        ozonItems.forEach(item => {
            const existing = skuMap.get(item.nomenclature) || { nomenclature: item.nomenclature, quantity: 0, sum: 0 };
            existing.quantity += item.quantity;
            existing.sum += item.sum;
            skuMap.set(item.nomenclature, existing);
            
            totalQuantity += item.quantity;
            totalSum += item.sum;
        });

        // Sort by Quantity descending
        const topSkus = Array.from(skuMap.values()).sort((a, b) => b.quantity - a.quantity);

        return {
            period: file.period,
            filename: file.filename,
            topSkus,
            totalQuantity,
            totalSum
        };
    });

    if (monthsData.every(m => m.topSkus.length === 0)) {
        return (
            <GlassCard className="p-6 h-full flex flex-col items-center justify-center text-gray-400">
                <AlertTriangle className="mb-2 opacity-50" size={32} />
                <p className="text-sm text-center">Нет данных по ОЗОН / Яндекс</p>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                        <AlertTriangle className="text-orange-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Бой ОЗОН / Яндекс</h2>
                        <p className="text-sm text-gray-400">Топ проблемных SKU по количеству</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <span>{isExpanded ? 'Свернуть' : 'Показать все'}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            <GlassCard className="p-6 relative overflow-hidden flex-1">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50" />
                
                <div className="flex flex-wrap gap-6 h-full overflow-y-auto custom-scrollbar">
                    {monthsData.map((month, idx) => (
                    <div key={idx} className={`bg-white/5 rounded-xl p-4 border border-white/10 ${monthsData.length === 1 ? 'w-full' : 'flex-1 min-w-[300px]'}`}>
                        <div className="flex justify-between items-end mb-4 pb-2 border-b border-white/10">
                            <div>
                                <h3 className="font-semibold text-white">{month.period}</h3>
                                <p className="text-xs text-gray-500 truncate max-w-[150px]">{month.filename}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-orange-400">{month.totalQuantity} шт</div>
                                <div className="text-xs text-gray-400">
                                    {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(month.totalSum)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {month.topSkus.slice(0, isExpanded ? undefined : 5).map((sku, i) => (
                                <div key={i} className="flex items-start justify-between group">
                                    <div className="flex items-start space-x-2 overflow-hidden">
                                        <div className={`
                                            flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold mt-0.5
                                            ${i < 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-gray-400'}
                                        `}>
                                            {i + 1}
                                        </div>
                                        <span className="text-sm text-gray-300 break-words line-clamp-2 group-hover:text-white transition-colors" title={sku.nomenclature}>
                                            {sku.nomenclature}
                                        </span>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <div className="text-sm font-medium text-white">{sku.quantity}</div>
                                        <div className="text-[10px] text-gray-500">
                                            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(sku.sum)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {!isExpanded && month.topSkus.length > 5 && (
                                <div className="text-center pt-2">
                                    <span className="text-xs text-gray-500">
                                        Еще {month.topSkus.length - 5} SKU...
                                    </span>
                                </div>
                            )}
                            
                            {month.topSkus.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    Нет данных по ОЗОН/Яндекс
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </GlassCard>
    </div>
    );
};
