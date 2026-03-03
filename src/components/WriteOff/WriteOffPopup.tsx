import React, { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { parseWriteOffFileV2 } from '../../utils/writeOffParserV2';
import { IOSButton } from '../UI/IOSButton';
import { FileText, Upload, Trash2, X, FileSpreadsheet, Calendar, Building2, ChevronDown, ChevronUp } from 'lucide-react';

interface WriteOffPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WriteOffPopup: React.FC<WriteOffPopupProps> = ({ isOpen, onClose }) => {
  const { writeOffData, addWriteOffFile, removeWriteOffFile } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  console.log('WRITEOFF: Popup render', {
    isOpen,
    files: writeOffData?.length ?? 0,
  });

  // Проверка на дубликаты файлов (по имени и размеру)
  const checkDuplicateFile = (file: File): boolean => {
    const storageKey = 'uploaded-writeoff-files-v1';
    const stored = localStorage.getItem(storageKey);
    const uploadedFiles: Array<{ name: string; size: number }> = stored ? JSON.parse(stored) : [];
    
    const fileSignature = `${file.name}|${file.size}`;
    const isDuplicate = uploadedFiles.some(f => `${f.name}|${f.size}` === fileSignature);
    
    if (!isDuplicate) {
      uploadedFiles.push({ name: file.name, size: file.size });
      localStorage.setItem(storageKey, JSON.stringify(uploadedFiles));
    }
    
    return isDuplicate;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);
    const fileArray = Array.from(files);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const duplicates: string[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        
        // Проверка на дубликат
        if (checkDuplicateFile(file)) {
          duplicates.push(file.name);
          continue;
        }

        try {
          console.log(`WRITEOFF: Processing file ${i + 1}/${fileArray.length}: ${file.name}`);
          const parsedFile = await parseWriteOffFileV2(file);
          addWriteOffFile(parsedFile);
          successCount++;
        } catch (err: any) {
          console.error(`WRITEOFF: Error parsing write-off file ${file.name}:`, err);
          errorCount++;
          errors.push(`${file.name}: ${err.message || 'Ошибка при обработке файла'}`);
          
          // Удаляем файл из localStorage если была ошибка
          const storageKey = 'uploaded-writeoff-files-v1';
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const uploadedFiles: Array<{ name: string; size: number }> = JSON.parse(stored);
            const filtered = uploadedFiles.filter(f => `${f.name}|${f.size}` !== `${file.name}|${file.size}`);
            localStorage.setItem(storageKey, JSON.stringify(filtered));
          }
        }
      }

      // Показываем результат загрузки
      if (duplicates.length > 0) {
        setError(`Дубликаты пропущены: ${duplicates.join(', ')}${errors.length > 0 ? '\n\n' + errors.join('\n') : ''}`);
      } else if (successCount > 0 && errorCount === 0) {
        // Успешно загружены все файлы
      } else if (successCount > 0 && errorCount > 0) {
        setError(`Загружено: ${successCount}, Ошибок: ${errorCount}\n\n${errors.join('\n')}`);
      } else if (errors.length > 0) {
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

  const handleRemoveFile = (fileId: string, filename: string) => {
    // Удаляем файл из localStorage
    const storageKey = 'uploaded-writeoff-files-v1';
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const uploadedFiles: Array<{ name: string; size: number }> = JSON.parse(stored);
      const filtered = uploadedFiles.filter(f => f.name !== filename);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    }
    
    // Удаляем из store
    removeWriteOffFile(fileId);
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
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Анализ списания</h2>
              <p className="text-sm text-gray-400">
                {writeOffData.length > 0 
                  ? `${writeOffData.length} файл(ов) загружено` 
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
            <span className="whitespace-pre-line">{error}</span>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {writeOffData.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Нет загруженных файлов списаний</p>
              <p className="text-gray-500 text-sm">Загрузите файл для начала работы</p>
            </div>
          ) : (
            writeOffData.map((file) => {
              const totalItems = file.groups.reduce((sum, g) => sum + g.items.length, 0);
              const totalQuantity = file.groups.reduce((sum, g) => sum + g.totalQuantity, 0);
              const totalSum = file.groups.reduce((sum, g) => sum + g.totalSum, 0);
              
              return (
                <div
                  key={file.id}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleFileExpand(file.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <FileSpreadsheet className="w-4 h-4 text-purple-400" />
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
                            Групп: {file.groups.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-gray-400">Записей: <span className="text-white">{totalItems}</span></p>
                        <p className="text-gray-400">Кол-во: <span className="text-white">{totalQuantity.toLocaleString()}</span></p>
                        <p className="text-gray-400">Сумма: <span className="text-white">{totalSum.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}</span></p>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.id, file.filename);
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
                  
                  {expandedFiles.has(file.id) && file.groups.length > 0 && (
                    <div className="border-t border-white/10 p-4 bg-black/20">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 text-left">
                            <th className="pb-2 font-medium">Причина претензии</th>
                            <th className="pb-2 font-medium text-right">Кол-во</th>
                            <th className="pb-2 font-medium text-right">Сумма</th>
                            <th className="pb-2 font-medium text-right">Записей</th>
                          </tr>
                        </thead>
                        <tbody>
                          {file.groups.slice(0, 10).map((group, idx) => (
                            <tr key={idx} className="text-gray-300 border-t border-white/5">
                              <td className="py-2">{group.reason}</td>
                              <td className="py-2 text-right">{group.totalQuantity.toLocaleString()}</td>
                              <td className="py-2 text-right">{group.totalSum.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}</td>
                              <td className="py-2 text-right">{group.items.length}</td>
                            </tr>
                          ))}
                          {file.groups.length > 10 && (
                            <tr className="text-gray-500 text-center">
                              <td colSpan={4} className="py-2">
                                ... и ещё {file.groups.length - 10} причин
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
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
                <span>Загрузить файлы списаний</span>
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
