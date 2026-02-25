import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { parseFile } from '../../utils/dataProcessor';
import { DefectRecord } from '../../types/data.types';

interface FileDropZoneProps {
  onDataLoaded: (data: DefectRecord[], meta: { fileName: string, reportMonth: string }) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const { records, fileName, reportMonth } = await parseFile(file);
      if (records.length === 0) {
        throw new Error('Не найдено записей о браке. Проверьте формат файла.');
      }
      onDataLoaded(records, { fileName, reportMonth });
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Ошибка обработки файла.');
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
        isDragging ? 'border-ios-blue bg-blue-500/10' : 'border-white/20 hover:border-ios-blue/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        data-testid="file-input"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleChange}
        accept=".xlsx,.xls,.csv,.txt"
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${loading ? 'bg-blue-500/20' : 'bg-white/10'}`}>
          {loading ? (
            <div className="w-8 h-8 border-4 border-ios-blue border-t-transparent rounded-full animate-spin" />
          ) : error ? (
            <AlertCircle className="w-8 h-8 text-red-500" />
          ) : (
            <Upload className="w-8 h-8 text-ios-blue" />
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-white">
            {loading ? 'Обработка данных...' : 'Перетащите файл отчета сюда'}
          </h3>
          <p className="text-gray-400 mt-1">
            Поддержка XLSX, CSV, TXT
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};