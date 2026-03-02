import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { parseFile } from '../../utils/dataProcessor';
import { DefectRecord, SalesRecord } from '../../types/data.types';

interface FileDropZoneProps {
  onDataLoaded: (data: DefectRecord[], meta: { fileName: string, reportMonth: string }) => void;
  onMultipleFilesLoaded?: (files: Array<{ 
    data: DefectRecord[], 
    sales?: SalesRecord[],
    meta: { fileName: string, reportMonth: string } 
  }>) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onDataLoaded, onMultipleFilesLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: files.length });

    const fileArray = Array.from(files);
    const results: Array<{ 
      data: DefectRecord[], 
      sales?: SalesRecord[],
      meta: { fileName: string, reportMonth: string } 
    }> = [];
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Читаем уже загруженные файлы (имя + размер) из localStorage
    const STORAGE_KEY = 'uploaded-files-v1';
    let storedSignatures: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        storedSignatures = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading uploaded files from storage', e);
    }
    const uploadedSet = new Set(storedSignatures);
    const newUploadedSet = new Set(uploadedSet);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setProgress({ current: i + 1, total: fileArray.length });

        const signature = `${file.name}|${file.size}`;
        if (uploadedSet.has(signature)) {
          console.warn(`HOME: Skipping already uploaded file: ${file.name}`);
          errorCount++;
          errors.push(`${file.name}: файл уже был загружен ранее и будет пропущен.`);
          continue;
        }
        
        try {
          console.log(`HOME: Processing file ${i + 1}/${fileArray.length}: ${file.name}`);
          const result = await parseFile(file);
          
          if (result.records && result.records.length > 0) {
            results.push({
              data: result.records,
              sales: result.sales,
              meta: { fileName: result.fileName, reportMonth: result.reportMonth }
            });
            successCount++;
            newUploadedSet.add(signature);
          } else if (result.sales && result.sales.length > 0) {
            // Если есть только sales данные, тоже считаем успехом
            results.push({
              data: [],
              sales: result.sales,
              meta: { fileName: result.fileName, reportMonth: result.reportMonth }
            });
            successCount++;
            newUploadedSet.add(signature);
          } else {
            throw new Error('Не найдено записей о браке или продажах. Проверьте формат файла.');
          }
        } catch (err: unknown) {
          console.error(`HOME: File upload FAILED for ${file.name}:`, err);
          errorCount++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          errors.push(`${file.name}: ${errorMessage}`);
        }
      }

      // Если есть обработчик для множественных файлов, используем его
      if (onMultipleFilesLoaded && results.length > 0) {
        onMultipleFilesLoaded(results);
      } else if (results.length > 0) {
        // Иначе используем старый обработчик для первого файла (обратная совместимость)
        onDataLoaded(results[0].data, results[0].meta);
      }

      // Показываем результат загрузки
      if (successCount > 0 && errorCount === 0) {
        // Успех - не показываем ошибку
        setError(null);
      } else if (successCount > 0 && errorCount > 0) {
        setError(`Загружено: ${successCount}, Ошибок: ${errorCount}\n\n${errors.join('\n')}`);
      } else {
        setError(`Ошибка загрузки всех файлов:\n\n${errors.join('\n')}`);
      }

      // Сохраняем обновлённый список загруженных файлов
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newUploadedSet)));
      } catch (e) {
        console.error('Error saving uploaded files to storage', e);
      }
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Ошибка обработки файлов.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [onDataLoaded, onMultipleFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      // Сбрасываем значение input, чтобы можно было загрузить те же файлы снова
      e.target.value = '';
    }
  }, [processFiles]);

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
        multiple
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
            {loading 
              ? progress 
                ? `Обработка файла ${progress.current} из ${progress.total}...` 
                : 'Обработка данных...'
              : 'Перетащите файлы отчета сюда'}
          </h3>
          <p className="text-gray-400 mt-1">
            {loading ? 'Пожалуйста, подождите...' : 'Поддержка XLSX, CSV, TXT (можно выбрать несколько файлов)'}
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