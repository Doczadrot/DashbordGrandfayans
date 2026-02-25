import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { GlassCard } from '../components/UI/GlassCard';
import { IOSButton } from '../components/UI/IOSButton';
import { WriteOffChart } from '../components/WriteOff/WriteOffChart';
import { OzonAnalysis } from '../components/Ozon/OzonAnalysis';
import { SupplierAnalysis } from '../components/Supplier/SupplierAnalysis';
import { WriteOffTable } from '../components/WriteOff/WriteOffTable';
import { parseWriteOffFile } from '../utils/writeOffParser';
import { ArrowLeft, Trash2, LayoutGrid, Upload, X, Download, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export const WriteOffAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { data, writeOffData, meta, supplierGroups, addWriteOffFile, resetWriteOffData, loadState } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const stateToSave = {
      data,
      writeOffData,
      meta,
      supplierGroups,
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(stateToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.writeOffData || parsed.data) {
          loadState({
            data: parsed.data || [],
            writeOffData: parsed.writeOffData || [],
            meta: parsed.meta || { fileName: '', reportMonth: '' },
            supplierGroups: parsed.supplierGroups || { china: [], rf: [], furniture: [] }
          });
        } else {
          setError('Неверный формат файла сохранения');
        }
      } catch (err) {
        setError('Ошибка при чтении файла');
      }
      
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Use the new hook for width
  const { width, containerRef, mounted } = useContainerWidth();

  // Default Layouts
  const defaultLayouts = {
    lg: [
      { i: 'ozon', x: 0, y: 0, w: 2, h: 2, minW: 1, minH: 2 },
      { i: 'supplier', x: 2, y: 0, w: 2, h: 2, minW: 1, minH: 2 },
      { i: 'chart', x: 0, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
      { i: 'table', x: 0, y: 5, w: 4, h: 3, minW: 2, minH: 2 }
    ],
    md: [
      { i: 'ozon', x: 0, y: 0, w: 1, h: 2 },
      { i: 'supplier', x: 1, y: 0, w: 2, h: 2 },
      { i: 'chart', x: 0, y: 2, w: 3, h: 3 },
      { i: 'table', x: 0, y: 5, w: 3, h: 3 }
    ],
    sm: [
      { i: 'ozon', x: 0, y: 0, w: 1, h: 2 },
      { i: 'supplier', x: 0, y: 2, w: 1, h: 2 },
      { i: 'chart', x: 0, y: 4, w: 1, h: 3 },
      { i: 'table', x: 0, y: 7, w: 1, h: 3 }
    ]
  };

  const [layouts, setLayouts] = useState(defaultLayouts);

  const handleFileUpload = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    try {
      for (const file of files) {
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
             console.warn('Skipping non-excel file:', file.name);
             continue;
        }
        
        const parsedFile = await parseWriteOffFile(file);
        addWriteOffFile(parsedFile);
      }
    } catch (err: any) {
      console.error('Error processing file:', err);
      setError(err.message || 'Ошибка при обработке файла. Убедитесь, что формат соответствует шаблону "Анализ причин списания".');
    } finally {
      setIsProcessing(false);
      // Reset input value to allow re-uploading same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileUpload(Array.from(event.target.files));
    }
  };

  const onLayoutChange = (layout: Layout, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 p-6 space-y-8" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
            <IOSButton 
                variant="secondary" 
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 py-1 px-3 text-sm"
            >
                <ArrowLeft size={16} />
                <span>Назад</span>
            </IOSButton>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Анализ списания
            </h1>
        </div>
        <div className="flex items-center space-x-2">
            <input
                type="file"
                ref={importInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
            />
            <IOSButton 
                variant="secondary" 
                onClick={handleExport}
                disabled={writeOffData.length === 0 && data.length === 0}
                className="flex items-center space-x-2 py-1 px-3 text-sm"
                title="Сохранить данные в файл"
            >
                <Download size={16} />
                <span>Сохранить</span>
            </IOSButton>

            <IOSButton 
                variant="secondary" 
                onClick={() => importInputRef.current?.click()}
                className="flex items-center space-x-2 py-1 px-3 text-sm"
                title="Загрузить данные из файла"
            >
                <FolderOpen size={16} />
                <span>Открыть</span>
            </IOSButton>

            <div className="w-px h-6 bg-gray-700 mx-2" />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".xlsx, .csv"
                className="hidden"
            />
            <IOSButton 
                variant="primary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center space-x-2 py-1 px-3 text-sm shadow-lg shadow-blue-500/20"
                title="Принимаются только файлы Excel (.xlsx)"
            >
                <Upload size={16} />
                <span>{isProcessing ? 'Загрузка...' : 'Загрузить'}</span>
            </IOSButton>

            <IOSButton 
                variant="secondary" 
                onClick={() => setLayouts(defaultLayouts)}
                className="flex items-center space-x-2 py-1 px-3 text-sm"
                title="Сбросить расположение плиток"
            >
                <LayoutGrid size={16} />
                <span>Сброс UI</span>
            </IOSButton>

            {writeOffData.length > 0 && (
                <IOSButton 
                    variant="danger" 
                    onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить все загруженные данные?')) {
                            resetWriteOffData();
                        }
                    }}
                    className="flex items-center space-x-2 py-1 px-3 text-sm"
                >
                    <Trash2 size={16} />
                    <span>Сбросить данные</span>
                </IOSButton>
            )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between text-red-400 text-sm animate-fade-in">
            <div className="flex items-center space-x-2">
                <span>⚠️</span>
                <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="hover:text-white transition-colors">
                <X size={16} />
            </button>
        </div>
      )}

      {mounted && (
        <Responsive
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 4, md: 3, sm: 1, xs: 1, xxs: 1 }}
            rowHeight={150}
        dragConfig={{ handle: ".drag-handle", enabled: true }}
        resizeConfig={{ enabled: true }}
        onLayoutChange={onLayoutChange}
        margin={[24, 24]}
            width={width}
        >
            {/* Upload Zone Removed */}


            {/* Ozon Analysis Widget */}
            <div key="ozon" className="relative group">
                <div className="drag-handle absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-white z-20 bg-black/20 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <LayoutGrid size={16} />
                </div>
                <div className="h-full w-full overflow-hidden">
                    <OzonAnalysis files={writeOffData} />
                </div>
            </div>

            {/* Supplier Analysis Widget */}
            <div key="supplier" className="relative group">
                <div className="drag-handle absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-white z-20 bg-black/20 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <LayoutGrid size={16} />
                </div>
                <div className="h-full w-full overflow-hidden">
                    <SupplierAnalysis files={writeOffData} />
                </div>
            </div>

            {/* Main Chart */}
            <div key="chart" className="relative group">
                <div className="drag-handle absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-white z-20 bg-black/20 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <LayoutGrid size={16} />
                </div>
                <div className="h-full w-full overflow-hidden flex flex-col">
                    <WriteOffChart files={writeOffData} />
                </div>
            </div>

            {/* Full Table */}
            <div key="table" className="relative group">
                <div className="drag-handle absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-white z-20 bg-black/20 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <LayoutGrid size={16} />
                </div>
                <div className="h-full w-full overflow-hidden flex flex-col overflow-y-auto custom-scrollbar">
                    <WriteOffTable files={writeOffData} />
                </div>
            </div>
        </Responsive>
      )}
    </div>
  );
};
