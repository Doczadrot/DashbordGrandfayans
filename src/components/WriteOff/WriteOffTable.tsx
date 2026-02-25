import React, { useState } from 'react';
import { WriteOffFile } from '../../types/writeoff.types';
import { GlassCard } from '../UI/GlassCard';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WriteOffTableProps {
    files: WriteOffFile[];
}

export const WriteOffTable: React.FC<WriteOffTableProps> = ({ files }) => {
    const [expandedFiles, setExpandedFiles] = useState<string[]>([]);

    const toggleFile = (fileId: string) => {
        setExpandedFiles(prev => 
            prev.includes(fileId) 
                ? prev.filter(id => id !== fileId) 
                : [...prev, fileId]
        );
    };

    if (files.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <FileText className="text-emerald-400" size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Полная таблица данных</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {files.map(file => {
                    const isExpanded = expandedFiles.includes(file.id);
                    const totalQty = file.groups.reduce((acc, g) => acc + g.totalQuantity, 0);
                    const totalSum = file.groups.reduce((acc, g) => acc + g.totalSum, 0);

                    return (
                        <GlassCard key={file.id} className="p-0 overflow-hidden">
                            <div 
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={() => toggleFile(file.id)}
                            >
                                <div>
                                    <h3 className="text-lg font-bold text-white">{file.period}</h3>
                                    <p className="text-sm text-gray-400">{file.filename}</p>
                                </div>
                                <div className="flex items-center space-x-6">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-sm text-gray-400">Количество</div>
                                        <div className="font-bold text-white">{totalQty} шт</div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <div className="text-sm text-gray-400">Сумма</div>
                                        <div className="font-bold text-emerald-400">
                                            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(totalSum)}
                                        </div>
                                    </div>
                                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="overflow-x-auto border-t border-white/10">
                                            <table className="w-full text-left text-sm text-gray-300">
                                                <thead className="text-xs uppercase bg-white/5 text-gray-400">
                                                    <tr>
                                                        <th className="px-6 py-3">Причина</th>
                                                        <th className="px-6 py-3 text-right">Количество</th>
                                                        <th className="px-6 py-3 text-right">Сумма</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/10">
                                                    {file.groups.map((group, idx) => (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-6 py-3 font-medium text-white">{group.reason}</td>
                                                            <td className="px-6 py-3 text-right">{group.totalQuantity} шт.</td>
                                                            <td className="px-6 py-3 text-right text-emerald-400">
                                                                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(group.totalSum)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-white/10 font-bold text-white">
                                                        <td className="px-6 py-3">ИТОГО</td>
                                                        <td className="px-6 py-3 text-right">{totalQty} шт.</td>
                                                        <td className="px-6 py-3 text-right text-emerald-400">
                                                            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(totalSum)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );
};
