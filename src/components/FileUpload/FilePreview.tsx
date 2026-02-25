import React, { useState } from 'react';
import { DefectRecord } from '../../types/data.types';
import { GlassCard } from '../UI/GlassCard';
import { IOSButton } from '../UI/IOSButton';
import { GripVertical } from 'lucide-react';

interface FilePreviewProps {
  data: DefectRecord[];
}

export const FilePreview: React.FC<FilePreviewProps> = ({ data }) => {
  const [visibleCount, setVisibleCount] = useState(10);
  const previewData = data.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + 10, data.length));
  };

  return (
    <GlassCard className="h-full min-h-[360px] overflow-hidden text-white relative flex flex-col">
      <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors">
        <GripVertical size={16} />
      </div>

      <div className="mb-4 pr-10">
        <h3 className="text-xl font-semibold text-white">
          Предпросмотр данных ({previewData.length} из {data.length})
        </h3>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[720px]">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-200 uppercase bg-white/10">
            <tr>
              <th className="px-6 py-3">Номенклатура</th>
              <th className="px-6 py-3">Причина претензии</th>
              <th className="px-6 py-3">Поставщик</th>
              <th className="px-6 py-3">Персональный №</th>
            </tr>
          </thead>
          <tbody>
            {previewData.map((row) => (
              <tr key={row.id} className="bg-transparent border-b border-white/10 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-white truncate max-w-[200px]" title={row.nomenclature}>{row.nomenclature}</td>
                <td className="px-6 py-4 truncate max-w-[200px]" title={row.claimReason}>{row.claimReason}</td>
                <td className="px-6 py-4 truncate max-w-[150px]" title={row.supplier}>{row.supplier}</td>
                <td className="px-6 py-4">{row.personalNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      
      {visibleCount < data.length && (
        <div className="mt-6 flex justify-center flex-shrink-0">
            <IOSButton variant="secondary" onClick={handleLoadMore}>
                Показать еще 10
            </IOSButton>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-400 text-center flex-shrink-0">
        Показано {previewData.length} из {data.length} записей
      </div>
    </GlassCard>
  );
};
