import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface SimpleDropZoneProps {
  onFilesSelect: (files: File[]) => Promise<void>;
  isProcessing?: boolean;
  accept?: string;
  label?: string;
  multiple?: boolean;
}

export const SimpleDropZone: React.FC<SimpleDropZoneProps> = ({ 
    onFilesSelect, 
    isProcessing = false, 
    accept = ".xlsx,.xls,.csv",
    label = "Перетащите файлы сюда",
    multiple = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      try {
        await onFilesSelect(files);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки');
      }
    }
  }, [onFilesSelect]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        try {
            await onFilesSelect(files);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Ошибка загрузки');
        }
    }
  }, [onFilesSelect]);

  return (
    <div
      className={`relative border border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
        isDragging ? 'border-ios-blue bg-blue-500/10' : 'border-white/10 hover:border-ios-blue/30'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleChange}
        accept={accept}
        multiple={multiple}
        disabled={isProcessing}
      />
      
      <div className="flex flex-row items-center justify-center space-x-4">
        <div className={`p-2 rounded-full ${isProcessing ? 'bg-blue-500/20' : 'bg-white/5'}`}>
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-ios-blue border-t-transparent rounded-full animate-spin" />
          ) : error ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Upload className="w-5 h-5 text-ios-blue" />
          )}
        </div>
        
        <div className="text-left">
          <h3 className="text-sm font-medium text-white">
            {isProcessing ? 'Обработка...' : label}
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Поддержка XLSX, CSV
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-xs bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 ml-auto">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
