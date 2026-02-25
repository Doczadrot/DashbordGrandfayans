import React from 'react';
import { BarChart, PieChart, Activity, Circle, AlignLeft } from 'lucide-react';

export type ChartType = 'bar' | 'horizontalBar' | 'line' | 'pie' | 'doughnut';

interface ChartTypeSelectorProps {
    currentType: ChartType;
    onChange: (type: ChartType) => void;
}

export const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({ currentType, onChange }) => {
    const types: { id: ChartType; icon: React.ReactNode; label: string }[] = [
        { id: 'horizontalBar', icon: <AlignLeft size={16} />, label: 'Линейчатая' },
        { id: 'bar', icon: <BarChart size={16} className="rotate-90" />, label: 'Столбчатая' },
        { id: 'line', icon: <Activity size={16} />, label: 'График' },
        { id: 'pie', icon: <PieChart size={16} />, label: 'Круговая' },
        { id: 'doughnut', icon: <Circle size={16} />, label: 'Кольцевая' },
    ];

    return (
        <div className="flex bg-white/5 rounded-lg p-1 space-x-1">
            {types.map((type) => (
                <button
                    key={type.id}
                    onClick={() => onChange(type.id)}
                    className={`p-2 rounded-md transition-all ${
                        currentType === type.id 
                            ? 'bg-blue-500 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={type.label}
                >
                    {type.icon}
                </button>
            ))}
        </div>
    );
};
