import React, { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { parseArrivalFile } from '../../utils/arrivalParser';
import { IOSButton } from '../UI/IOSButton';
import { Package, Upload, Trash2, X, FileSpreadsheet, Calendar, Building2, ChevronDown, ChevronUp } from 'lucide-react';

interface ArrivalPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArrivalPopup: React.FC<ArrivalPopupProps> = ({ isOpen, onClose }) => {
  const { arrivalData, addArrivalFile, removeArrivalFile } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    const fileArray = Array.from(files);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          console.log(`ARRIVAL: Processing file ${i + 1}/${fileArray.length}: ${file.name}`);
          const parsedFile = await parseArrivalFile(file);
          addArrivalFile(parsedFile);
          successCount++;
        } catch (err: any) {
          console.error(`ARRIVAL: Error parsing arrival file ${file.name}:`, err);
          errorCount++;
          errors.push(`${file.name}: ${err.message || 'Ошибка при обработке файла'}`);
        }
      }

      // Показываем результат загрузки
      if (successCount > 0 && errorCount === 0) {
        // Успешно загружены все файлы
      } else if (successCount > 0 && errorCount > 0) {
        setError(`Загружено: ${successCount}, Ошибок: ${errorCount}\n\n${errors.join('\n')}`);
      } else {
        setError(`Ошибка загрузки всех файлов:\n\n${errors.join('\n')}`);
      }
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleFileExpand = (fileId: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-[#1c1c1e] border border-white/10 rounded-t-3xl shadow-2xl animate-slide-up max-h-[70vh] flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Приходы</h2>
              <p className="text-sm text-gray-400">
                {arrivalData.length > 0 
                  ? `${arrivalData.length} файл(ов) загружено` 
                  : 'Нет загруженных файлов'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {arrivalData.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Нет загруженных файлов приходов</p>
              <p className="text-gray-500 text-sm">Загрузите файл для начала работы</p>
            </div>
          ) : (
            arrivalData.map((file) => (
              <div
                key={file.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleFileExpand(file.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{file.filename}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {file.period}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 size={12} />
                          {file.warehouse || 'Не указан'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-gray-400">Поставщиков: <span className="text-white">{file.suppliers.length}</span></p>
                      <p className="text-gray-400">Кол-во: <span className="text-white">{file.totalQuantity.toLocaleString()}</span></p>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeArrivalFile(file.id);
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    {expandedFiles.has(file.id) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {expandedFiles.has(file.id) && file.suppliers.length > 0 && (
                  <div className="border-t border-white/10 p-4 bg-black/20">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-left">
                          <th className="pb-2 font-medium">Поставщик</th>
                          <th className="pb-2 font-medium text-right">Кол-во</th>
                          <th className="pb-2 font-medium text-right">Объём</th>
                          <th className="pb-2 font-medium text-right">Документов</th>
                        </tr>
                      </thead>
                      <tbody>
                        {file.suppliers.slice(0, 10).map((supplier, idx) => (
                          <tr key={idx} className="text-gray-300 border-t border-white/5">
                            <td className="py-2">{supplier.supplier}</td>
                            <td className="py-2 text-right">{supplier.totalQuantity.toLocaleString()}</td>
                            <td className="py-2 text-right">{supplier.totalVolume.toFixed(2)}</td>
                            <td className="py-2 text-right">{supplier.documents.length}</td>
                          </tr>
                        ))}
                        {file.suppliers.length > 10 && (
                          <tr className="text-gray-500 text-center">
                            <td colSpan={4} className="py-2">
                              ... и ещё {file.suppliers.length - 10} поставщиков
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/20">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.xls,.csv"
            multiple
            className="hidden"
          />
          
          <IOSButton
            variant="primary"
            onClick={handleUploadClick}
            disabled={isProcessing}
            className="w-full !py-4 text-lg flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Обработка...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>Загрузить приходы</span>
              </>
            )}
          </IOSButton>
        </div>
      </div>
      
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
