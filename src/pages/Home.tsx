import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDropZone } from '../components/FileUpload/FileDropZone';
import { DefectRecord, SalesRecord } from '../types/data.types';
import { GlassCard } from '../components/UI/GlassCard';
import { BarChart2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { 
    addData, 
    addSalesData, 
    setMeta, 
    updateMeta,
    meta 
  } = useStore();

  const handleMultipleFilesLoaded = async (files: Array<{ 
    data: DefectRecord[], 
    sales?: SalesRecord[],
    meta: { fileName: string, reportMonth: string } 
  }>) => {
    let allRecords: DefectRecord[] = [];
    let allSales: SalesRecord[] = [];
    const fileNames: string[] = [];
    const months: string[] = [];

    // Собираем все данные из всех файлов
    for (const file of files) {
      if (file.data && file.data.length > 0) {
        allRecords = [...allRecords, ...file.data];
      }
      if (file.sales && file.sales.length > 0) {
        allSales = [...allSales, ...file.sales];
      }
      if (file.meta.fileName && !fileNames.includes(file.meta.fileName)) {
        fileNames.push(file.meta.fileName);
      }
      if (file.meta.reportMonth && !months.includes(file.meta.reportMonth)) {
        months.push(file.meta.reportMonth);
      }
    }

    // Пересчитываем месяцы непосредственно из записей, чтобы точно
    // отразить все периоды, которые реально есть в данных (в т.ч. Ноябрь)
    const recordMonths = Array.from(
      new Set(
        allRecords
          .map(r => r.reportMonth)
          .filter((m): m is string => Boolean(m))
      )
    );

    const allMonthsForMeta = [...new Set([...months, ...recordMonths])];

    // Добавляем данные в store
    if (allRecords.length > 0) {
      addData(allRecords);
    }
    if (allSales.length > 0) {
      addSalesData(allSales);
    }

    // Обновляем метаданные
    const currentMonths = meta.reportMonth ? meta.reportMonth.split(' / ').map(m => m.trim()) : [];
    const newMonths = [...new Set([...currentMonths, ...allMonthsForMeta])].sort();
    const newReportMonth = newMonths.join(' / ');

    const currentFiles = meta.fileName ? meta.fileName.split(', ').map(f => f.trim()) : [];
    const newFiles = [...new Set([...currentFiles, ...fileNames])];
    const newFileName = newFiles.join(', ');

    if (meta.fileName === '' && meta.reportMonth === '') {
      // Первая загрузка - устанавливаем метаданные
      setMeta({
        fileName: newFileName,
        reportMonth: newReportMonth
      });
    } else {
      // Обновляем существующие метаданные
      updateMeta({
        fileName: newFileName,
        reportMonth: newReportMonth
      });
    }

    // Переходим на dashboard
    navigate('/dashboard');
  };

  const handleDataLoaded = (data: DefectRecord[], meta: { fileName: string, reportMonth: string }) => {
    // Обратная совместимость для одного файла
    addData(data);
    setMeta(meta);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex p-4 bg-white/10 rounded-2xl shadow-lg mb-4 backdrop-blur-md border border-white/10">
             <BarChart2 size={48} className="text-ios-blue" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Панель качества</h1>
          <p className="text-lg text-gray-400 max-w-md mx-auto">
            Загрузите ежемесячный отчет о браке для анализа причин, поставщиков и трендов.
          </p>
        </div>

        <GlassCard className="p-8 transform transition-all hover:scale-[1.01] border-white/10 bg-white/5">
          <FileDropZone 
            onDataLoaded={handleDataLoaded} 
            onMultipleFilesLoaded={handleMultipleFilesLoaded}
          />
        </GlassCard>
        
        <div className="mt-8 text-center text-sm text-gray-500 font-medium">
          Поддерживаемые форматы: .xlsx, .xls, .csv, .txt
        </div>
      </div>
    </div>
  );
};