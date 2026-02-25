import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDropZone } from '../components/FileUpload/FileDropZone';
import { DefectRecord } from '../types/data.types';
import { GlassCard } from '../components/UI/GlassCard';
import { BarChart2 } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleDataLoaded = (data: DefectRecord[], meta: { fileName: string, reportMonth: string }) => {
    navigate('/dashboard', { state: { data, meta } });
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
          <FileDropZone onDataLoaded={handleDataLoaded} />
        </GlassCard>
        
        <div className="mt-8 text-center text-sm text-gray-500 font-medium">
          Поддерживаемые форматы: .xlsx, .xls, .csv, .txt
        </div>
      </div>
    </div>
  );
};