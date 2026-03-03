import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { GlassCard } from '../components/UI/GlassCard';
import { IOSButton } from '../components/UI/IOSButton';
import { MonthlyCharts } from '../components/WriteOff/MonthlyCharts';
import { WriteOffPopup } from '../components/WriteOff/WriteOffPopup';
import { parseWriteOffSalesFile, WriteOffSalesFile } from '../utils/writeOffSalesParser';
import { WriteOffFile } from '../types/writeoff.types';
import { ArrowLeft, Trash2, Upload, X, Download, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Обертка для MonthlyCharts с обработкой ошибок
const MonthlyChartsWrapper: React.FC<{ files: WriteOffFile[] }> = ({ files }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setHasError(false);
    setErrorMessage(null);
  }, [files]);

  if (hasError) {
    return (
      <GlassCard className="p-6">
        <p className="text-red-400 text-center mb-2">Ошибка при отображении диаграмм</p>
        {errorMessage && (
          <p className="text-gray-500 text-sm text-center">{errorMessage}</p>
        )}
        <p className="text-gray-400 text-sm text-center mt-4">
          Попробуйте перезагрузить страницу или загрузить файлы заново
        </p>
      </GlassCard>
    );
  }

  try {
    return <MonthlyCharts files={files} />;
  } catch (error) {
    console.error('WRITEOFF: Error in MonthlyChartsWrapper', error);
    setHasError(true);
    setErrorMessage(error instanceof Error ? error.message : 'Неизвестная ошибка');
    return (
      <GlassCard className="p-6">
        <p className="text-red-400 text-center">Ошибка при отображении диаграмм</p>
      </GlassCard>
    );
  }
};

export const WriteOffAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { data, writeOffData, meta, supplierGroups, resetWriteOffData, loadState } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [isWriteOffPopupOpen, setIsWriteOffPopupOpen] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const salesInputRef = React.useRef<HTMLInputElement>(null);
  const [salesFiles, setSalesFiles] = useState<WriteOffSalesFile[]>([]);

  // Debug лог, чтобы убедиться, что страница реально монтируется
  console.log('WRITEOFF: WriteOffAnalysis render', {
    writeOffFiles: writeOffData?.length ?? 'no-store',
  });
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

  const handleSalesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const fileArray = Array.from(files);
      const parsedFiles: WriteOffSalesFile[] = [];

      for (const file of fileArray) {
        console.log('WRITEOFF: parsing sales file', file.name);
        const parsed = await parseWriteOffSalesFile(file);
        parsedFiles.push(parsed);
      }

      setSalesFiles(prev => [...prev, ...parsedFiles]);
      console.log('WRITEOFF: sales files parsed', parsedFiles);
    } catch (err: any) {
      console.error('WRITEOFF: error parsing sales files', err);
      setError(err?.message || 'Ошибка при загрузке файла продаж');
    } finally {
      if (salesInputRef.current) {
        salesInputRef.current.value = '';
      }
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 p-6 space-y-8">
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

            <IOSButton 
                variant="primary" 
                onClick={() => setIsWriteOffPopupOpen(true)}
                className="flex items-center space-x-2 py-1 px-3 text-sm shadow-lg shadow-blue-500/20"
                title="Загрузить файлы списаний"
            >
                <Upload size={16} />
                <span>Загрузить списания</span>
            </IOSButton>

            <input
                type="file"
                ref={salesInputRef}
                onChange={handleSalesUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
            />
            <IOSButton 
                variant="primary" 
                onClick={() => salesInputRef.current?.click()}
                className="flex items-center space-x-2 py-1 px-3 text-sm shadow-lg shadow-green-500/20"
                title="Загрузить файлы продаж"
            >
                <Upload size={16} />
                <span>Загрузить продажи</span>
            </IOSButton>

            {writeOffData.length > 0 && (
                <IOSButton 
                    variant="danger" 
                    onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить все загруженные данные?')) {
                            resetWriteOffData();
                            // Сбрасываем историю загруженных файлов списаний, чтобы можно было загрузить их снова
                            try {
                              localStorage.removeItem('uploaded-writeoff-files-v1');
                            } catch (err) {
                              console.error('WRITEOFF: Error clearing uploaded write-off files history', err);
                            }
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

      {writeOffData.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Upload className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Нет загруженных файлов</h2>
          <p className="text-gray-400 mb-6">Загрузите файлы списаний для начала анализа</p>
          <IOSButton 
            variant="primary" 
            onClick={() => setIsWriteOffPopupOpen(true)}
            className="flex items-center space-x-2 mx-auto"
          >
            <Upload size={20} />
            <span>Загрузить списания</span>
          </IOSButton>
        </GlassCard>
      ) : (
        <MonthlyChartsWrapper files={writeOffData} />
      )}

      <WriteOffPopup 
        isOpen={isWriteOffPopupOpen} 
        onClose={() => setIsWriteOffPopupOpen(false)} 
      />
    </div>
  );
};
