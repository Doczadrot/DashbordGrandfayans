import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DefectRecord, ParetoItem, DashboardStats, SupplierKPI } from '../types/data.types';
import { calculatePareto, calculateKPI, parseFile } from '../utils/dataProcessor';
import { ParetoChart } from '../components/Dashboard/ParetoChart';
import { PPMChart } from '../components/Dashboard/PPMChart';
import { FilePreview } from '../components/FileUpload/FilePreview';
import { SupplierChart } from '../components/Dashboard/SupplierChart';
import { DefectDescriptionChart } from '../components/Dashboard/DefectDescriptionChart';
import { SupplierGroupCard } from '../components/Dashboard/SupplierGroupCard';
import { AIChat } from '../components/Dashboard/AIChat';
import { ArrivalPopup } from '../components/Arrival/ArrivalPopup';
import { IOSButton } from '../components/UI/IOSButton';
import { GlassCard } from '../components/UI/GlassCard';
import { ArrowLeft, Plus, Filter, Check, Package, AlertTriangle, TrendingUp, Users, GripVertical, Wand2, Trash2, FileText } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { useStore } from '../store/useStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResponsiveGridLayout: any = WidthProvider(Responsive as any);

const DASHBOARD_LAYOUT_STORAGE_KEY = 'quality-dashboard-layouts-v3'; // Incremented version to force reset

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultLayouts: any = {
    lg: [
      { i: 'writeoff_link', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
      { i: 'kpi_total', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
      { i: 'kpi_reason', x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
      { i: 'kpi_supplier', x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
      { i: 'supplier_china', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'supplier_rf', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'supplier_furniture', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'pareto', x: 0, y: 8, w: 8, h: 16, minW: 4, minH: 10 },
      { i: 'chat', x: 8, y: 8, w: 4, h: 16, minW: 3, minH: 10 },
      { i: 'suppliers', x: 0, y: 24, w: 6, h: 16, minW: 4, minH: 10 },
      { i: 'defect_desc', x: 6, y: 24, w: 6, h: 16, minW: 4, minH: 10 },
      { i: 'ppm', x: 0, y: 40, w: 12, h: 14, minW: 6, minH: 10 },
      { i: 'preview', x: 0, y: 54, w: 12, h: 14, minW: 6, minH: 10 },
    ],
  md: [
    { i: 'writeoff_link', x: 0, y: 0, w: 5, h: 4, minW: 2, minH: 3 },
    { i: 'kpi_total', x: 5, y: 0, w: 5, h: 4, minW: 2, minH: 3 },
    { i: 'kpi_reason', x: 0, y: 4, w: 5, h: 4, minW: 2, minH: 3 },
    { i: 'kpi_supplier', x: 5, y: 4, w: 5, h: 4, minW: 2, minH: 3 },
    { i: 'supplier_china', x: 0, y: 8, w: 3, h: 4, minW: 3, minH: 3 },
    { i: 'supplier_rf', x: 3, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'supplier_furniture', x: 7, y: 8, w: 3, h: 4, minW: 3, minH: 3 },
    { i: 'pareto', x: 0, y: 12, w: 10, h: 16, minW: 6, minH: 10 },
    { i: 'chat', x: 0, y: 28, w: 10, h: 14, minW: 6, minH: 10 },
    { i: 'suppliers', x: 0, y: 42, w: 10, h: 16, minW: 6, minH: 10 },
    { i: 'defect_desc', x: 0, y: 58, w: 10, h: 16, minW: 6, minH: 10 },
    { i: 'ppm', x: 0, y: 74, w: 10, h: 14, minW: 6, minH: 10 },
    { i: 'preview', x: 0, y: 88, w: 10, h: 14, minW: 6, minH: 10 },
  ],
  sm: [
    { i: 'writeoff_link', x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 3 },
    { i: 'kpi_total', x: 0, y: 4, w: 6, h: 4, minW: 2, minH: 3 },
    { i: 'kpi_reason', x: 0, y: 8, w: 6, h: 4, minW: 2, minH: 3 },
    { i: 'kpi_supplier', x: 0, y: 12, w: 6, h: 4, minW: 2, minH: 3 },
    { i: 'supplier_china', x: 0, y: 16, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'supplier_rf', x: 0, y: 20, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'supplier_furniture', x: 0, y: 24, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'pareto', x: 0, y: 28, w: 6, h: 16, minW: 3, minH: 10 },
    { i: 'chat', x: 0, y: 44, w: 6, h: 16, minW: 3, minH: 10 },
    { i: 'suppliers', x: 0, y: 60, w: 6, h: 16, minW: 3, minH: 10 },
    { i: 'defect_desc', x: 0, y: 76, w: 6, h: 16, minW: 3, minH: 10 },
    { i: 'ppm', x: 0, y: 92, w: 6, h: 14, minW: 3, minH: 10 },
    { i: 'preview', x: 0, y: 106, w: 6, h: 14, minW: 3, minH: 10 },
  ],
};

export const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use global store
  const { 
    data, 
    salesData,
    meta, 
    setData, 
    addData, 
    addSalesData,
    setMeta, 
    updateMeta, 
    autoClassifySuppliers, 
    resetStore, 
    supplierGroups, 
    updateSupplierGroup,
    arrivalData
  } = useStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isArrivalPopupOpen, setIsArrivalPopupOpen] = useState(false);

  // Initialize store from location.state if store is empty but location has data (e.g., initial load)
  React.useEffect(() => {
    if (data.length === 0 && location.state?.data) {
      setData(location.state.data);
      if (location.state.sales) {
          addSalesData(location.state.sales);
      }
      if (location.state.meta) {
        setMeta(location.state.meta);
      }
    } else if (data.length === 0 && !location.state?.data) {
       // Only redirect if absolutely no data anywhere
       // navigate('/'); 
       // Commented out to allow file drag-drop on dashboard if empty
    }
  }, [data.length, location.state, setData, addSalesData, setMeta, navigate]);

  // Load layouts from localStorage or use default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [layouts, setLayouts] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading layout:', e);
    }
    return defaultLayouts;
  });
  
  // Filter state
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Redirect if no data initially
  React.useEffect(() => {
    if (!location.state?.data && data.length === 0) {
      navigate('/');
    }
  }, [data, navigate, location.state]);

  // Extract available months and files from data
  const availableMonths = useMemo(() => {
    const months = new Set(data.map(item => item.reportMonth));
    return Array.from(months).sort();
  }, [data]);

  const availableFiles = useMemo(() => {
    if (!meta.fileName) return [];
    return meta.fileName.split(', ').map(f => f.trim());
  }, [meta.fileName]);

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  React.useEffect(() => {
    if (availableFiles.length > 0 && selectedFiles.length === 0) {
      setSelectedFiles(availableFiles);
    }
  }, [availableFiles]);

  const toggleFile = (fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  React.useEffect(() => {
    if (availableMonths.length === 0) return;
    setSelectedMonths((prev) => {
      if (prev.length === 0) return availableMonths;
      const newMonths = availableMonths.filter((m) => !prev.includes(m));
      if (newMonths.length === 0) return prev;
      return [...prev, ...newMonths];
    });
  }, [availableMonths]);

  // Enforce China classification rule
  React.useEffect(() => {
      const { china, rf, furniture } = supplierGroups;
      
      // 1. Move from other groups
      const chinaInRf = rf.filter(s => s.toLowerCase().includes('китай') || s.toLowerCase().includes('china'));
      const chinaInFurniture = furniture.filter(s => s.toLowerCase().includes('китай') || s.toLowerCase().includes('china'));
      
      // 2. Find unclassified
      const allClassified = new Set([...china, ...rf, ...furniture]);
      const unclassifiedChina = data
          .map(d => d.supplier)
          .filter(s => s && !allClassified.has(s))
          .filter(s => s.toLowerCase().includes('китай') || s.toLowerCase().includes('china'));
      const uniqueUnclassified = Array.from(new Set(unclassifiedChina));

      if (chinaInRf.length > 0 || chinaInFurniture.length > 0 || uniqueUnclassified.length > 0) {
          const newChina = Array.from(new Set([...china, ...chinaInRf, ...chinaInFurniture, ...uniqueUnclassified]));
          
          if (chinaInRf.length > 0) {
             updateSupplierGroup('rf', rf.filter(s => !chinaInRf.includes(s)));
          }
          if (chinaInFurniture.length > 0) {
             updateSupplierGroup('furniture', furniture.filter(s => !chinaInFurniture.includes(s)));
          }
          // Always update China if we found any
          updateSupplierGroup('china', newChina);
      }
  }, [data, supplierGroups, updateSupplierGroup]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Предотвращаем повторную загрузку тех же файлов (имя + размер)
    const STORAGE_KEY = 'uploaded-files-v1';
    let storedSignatures: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        storedSignatures = JSON.parse(raw);
      }
    } catch (err) {
      console.error('DASHBOARD: Error reading uploaded files from storage', err);
    }
    const uploadedSet = new Set(storedSignatures);
    const newUploadedSet = new Set(uploadedSet);

    // Блокируем взаимодействие и показываем индикатор загрузки
    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          const signature = `${file.name}|${file.size}`;
          if (uploadedSet.has(signature)) {
            console.warn(`DASHBOARD: Skipping already uploaded file: ${file.name}`);
            errorCount++;
            errors.push(`${file.name}: файл уже был загружен ранее и будет пропущен.`);
            continue;
          }

          console.log(`DASHBOARD: Processing file ${i + 1}/${fileArray.length}: ${file.name}`);
          const result = await parseFile(file);
          console.log("DASHBOARD: parseFile result:", {
            recordsCount: result.records?.length,
            salesCount: result.sales?.length,
            fileName: result.fileName,
            reportMonth: result.reportMonth
          });
          
          if (result.sales && result.sales.length > 0) {
            console.log("DASHBOARD: Adding sales data to store...");
            addSalesData(result.sales);
          }

          if (result.records && result.records.length > 0) {
            console.log("DASHBOARD: Adding records to store...");
            addData(result.records);
          }
          
          // Update meta to reflect multiple files
          const currentMonths = meta.reportMonth ? meta.reportMonth.split(' / ').map(m => m.trim()) : [];
          if (!currentMonths.includes(result.reportMonth)) {
            currentMonths.push(result.reportMonth);
          }
          const newReportMonth = currentMonths.sort().join(' / ');

          const currentFiles = meta.fileName ? meta.fileName.split(', ').map(f => f.trim()) : [];
          if (!currentFiles.includes(result.fileName)) {
            currentFiles.push(result.fileName);
          }
          const newFileName = currentFiles.join(', ');

          updateMeta({
            fileName: newFileName,
            reportMonth: newReportMonth
          });
          
          successCount++;
          newUploadedSet.add(signature);
        } catch (error) {
          console.error(`DASHBOARD: File upload FAILED for ${file.name}:`, error);
          errorCount++;
          errors.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Показываем результат загрузки
      if (successCount > 0 && errorCount === 0) {
        alert(`Успешно загружено файлов: ${successCount}`);
      } else if (successCount > 0 && errorCount > 0) {
        alert(`Загружено: ${successCount}, Ошибок: ${errorCount}\n\n${errors.join('\n')}`);
      } else {
        alert(`Ошибка загрузки всех файлов:\n\n${errors.join('\n')}`);
      }

      // Сохраняем список загруженных файлов
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newUploadedSet)));
      } catch (err) {
        console.error('DASHBOARD: Error saving uploaded files to storage', err);
      }
    } finally {
      setIsUploading(false);
      // Сбрасываем значение input, чтобы можно было загрузить те же файлы снова
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const toggleMonth = (month: string) => {
      setSelectedMonths(prev => 
          prev.includes(month) 
              ? prev.filter(m => m !== month)
              : [...prev, month]
      );
  };

  const toggleAllMonths = () => {
      if (selectedMonths.length === availableMonths.length) {
          setSelectedMonths([]);
      } else {
          setSelectedMonths(availableMonths);
      }
  };

  const handleDetailClick = (type: string, value: string) => {
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('value', value);
    if (selectedFiles.length > 0) {
      params.set('files', selectedFiles.join(','));
    }
    navigate(`/details?${params.toString()}`);
  };

  // Filter data based on selection
  const filteredData = useMemo(() => {
      console.log("DASHBOARD: recalculating filteredData...", {
          totalData: data.length,
          selectedMonths,
          selectedFiles
      });
      if (selectedMonths.length === 0) return [];
      let result = data.filter(item => selectedMonths.includes(item.reportMonth));
      
      console.log("DASHBOARD: filteredData size:", result.length);
      return result;
  }, [data, selectedMonths, selectedFiles]);

  const filteredSalesData = useMemo(() => {
    console.log("DASHBOARD: recalculating filteredSalesData...", {
        salesDataTotal: salesData.length,
        selectedMonths
    });
    if (selectedMonths.length === 0) return [];
    
    const res = salesData.filter(item => {
        const matchesMonth = selectedMonths.some(sm => sm.toLowerCase().includes(item.month.toLowerCase()));
        const matchesFile = selectedFiles.length === 0 || (item.fileName && selectedFiles.includes(item.fileName));
        return matchesMonth && matchesFile;
    });
    console.log("DASHBOARD: filteredSalesData size:", res.length);
    return res;
  }, [salesData, selectedMonths, selectedFiles]);

  const salesStats = useMemo(() => {
    console.log("DASHBOARD: recalculating salesStats from", filteredSalesData.length, "items");
    const monthlySales: Record<string, number> = {};
    filteredSalesData.forEach(s => {
        monthlySales[s.month] = (monthlySales[s.month] || 0) + s.quantity;
    });
    return monthlySales;
  }, [filteredSalesData]);

  const paretoData: ParetoItem[] = useMemo(() => {
      console.log("DASHBOARD: calculating paretoData...");
      try {
          return calculatePareto(filteredData);
      } catch (e) {
          console.error("DASHBOARD: Error in calculatePareto:", e);
          return [];
      }
  }, [filteredData]);

  const supplierData: SupplierKPI[] = useMemo(() => {
      console.log("DASHBOARD: calculating supplierData...");
      try {
          return calculateKPI(filteredData);
      } catch (e) {
          console.error("DASHBOARD: Error in calculateKPI:", e);
          return [];
      }
  }, [filteredData]);
  
  const stats: DashboardStats = useMemo(() => {
    console.log("DASHBOARD: calculating stats...");
    try {
        const totalDefects = filteredData.reduce((sum, item) => sum + item.quantity, 0);
        const pareto = calculatePareto(filteredData);
        const topReason = pareto.length > 0 ? pareto[0].reason : 'Н/Д';
        
        const factoryDefectData = filteredData.filter(item => 
          item.claimReason === 'Заводской брак' || 
          item.claimReason === 'Производственный брак' || 
          item.claimReason?.toLowerCase().includes('завод')
        );
        const suppliers = calculateKPI(factoryDefectData);
        const topSupplier = suppliers.length > 0 ? suppliers[0].supplier : 'Н/Д';

        return {
          totalDefects,
          topReason,
          topSupplier
        };
    } catch (e) {
        console.error("DASHBOARD: Error in stats useMemo:", e);
        return { totalDefects: 0, topReason: 'Ошибка', topSupplier: 'Ошибка' };
    }
  }, [filteredData]);

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-ios-dark-blue flex items-center justify-center p-8">
        <GlassCard className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
             <FileText size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white">Нет данных для анализа</h2>
          <p className="text-gray-400">Пожалуйста, загрузите файл отчета на главной странице или воспользуйтесь кнопкой ниже.</p>
          <IOSButton variant="primary" onClick={() => navigate('/')} className="w-full">
            Перейти к загрузке
          </IOSButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ios-dark-blue p-6 md:p-8 pb-20 text-white">
      <div className="w-full max-w-[1920px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <IOSButton variant="secondary" onClick={() => navigate('/')} className="!p-3 rounded-full h-12 w-12 flex items-center justify-center shadow-md border-white/10 bg-white/10 text-white hover:bg-white/20">
              <ArrowLeft size={20} />
            </IOSButton>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Панель качества</h1>
              <p className="text-gray-400">Аналитика и Инсайты</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <IOSButton 
                variant="secondary"
                className="!py-3 !px-6 text-lg flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                onClick={() => {
                  if (window.confirm('Вы уверены, что хотите удалить все загруженные данные? Это действие нельзя отменить.')) {
                     resetStore();
                     // Также очищаем список уже загруженных файлов,
                     // чтобы их можно было загрузить повторно после полного сброса
                     try {
                       localStorage.removeItem('uploaded-files-v1');
                     } catch (err) {
                       console.error('DASHBOARD: Error clearing uploaded files storage on reset', err);
                     }
                  }
                }}
                title="Сброс всех данных"
             >
                <Trash2 size={16} />
                <span className="hidden lg:inline">Сброс</span>
             </IOSButton>

             <IOSButton 
                variant="secondary"
                className="!py-3 !px-6 text-lg flex items-center gap-2 bg-white/5 hover:bg-white/10"
                onClick={() => {
                  if (window.confirm('Автоматически распределить поставщиков по группам (Китай/РФ/Мебель)? Текущие ручные настройки будут сброшены.')) {
                     autoClassifySuppliers();
                  }
                }}
                title="Авто-распределение поставщиков"
             >
                <Wand2 size={16} />
                <span className="hidden lg:inline">Нормализация</span>
             </IOSButton>

             {/* Month Filter */}
             {availableMonths.length > 0 && (
                 <div className="relative">
                     <IOSButton 
                        variant="secondary" 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`!py-3 !px-6 text-lg flex items-center gap-2 ${isFilterOpen ? 'bg-white/20' : 'bg-white/5'}`}
                     >
                        <Filter size={16} />
                        <span>Период ({selectedMonths.length})</span>
                     </IOSButton>

                     {isFilterOpen && (
                         <div className="absolute right-0 top-full mt-2 w-64 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
                             <div className="p-2 border-b border-white/10 flex justify-between items-center">
                                 <span className="text-xs text-gray-400 font-medium px-2">Выберите месяцы</span>
                                 <button 
                                    onClick={toggleAllMonths}
                                    className="text-xs text-blue-400 hover:text-blue-300 px-2"
                                 >
                                    {selectedMonths.length === availableMonths.length ? 'Снять все' : 'Выбрать все'}
                                 </button>
                             </div>
                             <div className="p-2 space-y-1 max-h-60 overflow-y-auto border-b border-white/10">
                                 {availableMonths.map(month => (
                                     <button
                                        key={month}
                                        onClick={() => toggleMonth(month)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                                     >
                                         <span className="text-sm text-gray-200">{month}</span>
                                         {selectedMonths.includes(month) && (
                                             <Check size={16} className="text-blue-500" />
                                         )}
                                     </button>
                                 ))}
                             </div>

                             {availableFiles.length > 0 && (
                                 <>
                                     <div className="p-2 border-b border-white/10 flex justify-between items-center bg-white/5">
                                         <span className="text-[10px] text-gray-500 font-bold uppercase px-2 tracking-wider">Файлы в анализе</span>
                                     </div>
                                     <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
                                         {availableFiles.map(file => (
                                             <button
                                                key={file}
                                                onClick={() => toggleFile(file)}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                                             >
                                                 <span className="text-xs text-gray-400 truncate max-w-[180px]" title={file}>{file}</span>
                                                 {selectedFiles.includes(file) && (
                                                     <Check size={14} className="text-blue-500" />
                                                 )}
                                             </button>
                                         ))}
                                     </div>
                                 </>
                             )}
                         </div>
                     )}
                 </div>
             )}

             <IOSButton 
                variant="secondary"
                className="!py-3 !px-6 text-lg flex items-center gap-2 bg-white/5 hover:bg-white/10"
                onClick={() => {
                  const exportData = {
                      data: filteredData,
                      sales: filteredSalesData,
                      meta: meta
                  };
                  const template = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quality Dashboard - Export</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .glass-card { 
            background: rgba(255, 255, 255, 0.05); 
            backdrop-filter: blur(10px); 
            border: 1px border rgba(255, 255, 255, 0.1); 
            border-radius: 16px;
        }
    </style>
</head>
<body class="p-8">
    <div class="max-w-7xl mx-auto">
        <header class="mb-10 flex justify-between items-end">
            <div>
                <h1 class="text-4xl font-bold mb-2">Отчет по качеству</h1>
                <p class="text-gray-400">Экспорт данных от ${new Date().toLocaleDateString()}</p>
            </div>
            <div id="meta-info" class="text-right text-sm text-gray-500"></div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" id="stats-grid"></div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <div class="glass-card p-6 h-[400px]">
                <h3 class="text-lg font-bold mb-4">Динамика брака по месяцам</h3>
                <canvas id="dynamicsChart"></canvas>
            </div>
            <div class="glass-card p-6 h-[400px]">
                <h3 class="text-lg font-bold mb-4">Топ-10 Номенклатур</h3>
                <canvas id="topSkuChart"></canvas>
            </div>
        </div>

        <div class="glass-card p-6 overflow-hidden">
            <h3 class="text-lg font-bold mb-4">Детальные данные (Первые 100 строк)</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm" id="data-table">
                    <thead>
                        <tr class="border-b border-white/10">
                            <th class="py-2 px-4">Месяц</th>
                            <th class="py-2 px-4">Номенклатура</th>
                            <th class="py-2 px-4">Дефект</th>
                            <th class="py-2 px-4">Поставщик</th>
                            <th class="py-2 px-4">Кол-во</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const DASHBOARD_DATA = ${JSON.stringify(exportData)};

        function init() {
            const { data, sales, meta } = DASHBOARD_DATA;
            document.getElementById('meta-info').innerText = 'Файлы: ' + (meta.fileName || 'Нет данных');

            const totalDefects = data.reduce((sum, d) => sum + d.quantity, 0);
            const totalSales = sales.reduce((sum, s) => sum + s.quantity, 0);
            const rate = totalSales > 0 ? (totalDefects / totalSales * 100).toFixed(2) : 0;

            const statsGrid = document.getElementById('stats-grid');
            statsGrid.innerHTML = \`
                <div class="glass-card p-6">
                    <p class="text-xs text-gray-400 uppercase font-bold mb-1">Всего брака</p>
                    <p class="text-3xl font-bold">\${totalDefects.toLocaleString()} шт.</p>
                </div>
                <div class="glass-card p-6">
                    <p class="text-xs text-gray-400 uppercase font-bold mb-1">Продажи</p>
                    <p class="text-3xl font-bold text-blue-400">\${totalSales.toLocaleString()} шт.</p>
                </div>
                <div class="glass-card p-6">
                    <p class="text-xs text-gray-400 uppercase font-bold mb-1">Процент брака</p>
                    <p class="text-3xl font-bold text-red-400">\${rate}%</p>
                </div>
            \`;

            const months = [...new Set(data.map(d => d.reportMonth))].sort();
            new Chart(document.getElementById('dynamicsChart'), {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Брак (шт)',
                        data: months.map(m => data.filter(d => d.reportMonth === m).reduce((sum, d) => sum + d.quantity, 0)),
                        backgroundColor: '#FF6384'
                    }]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#fff' } } },
                    scales: { 
                        x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
                        y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });

            const skus = {};
            data.forEach(d => { skus[d.nomenclature] = (skus[d.nomenclature] || 0) + d.quantity; });
            const topSkus = Object.entries(skus).sort((a,b) => b[1] - a[1]).slice(0, 10);

            new Chart(document.getElementById('topSkuChart'), {
                type: 'doughnut',
                data: {
                    labels: topSkus.map(s => s[0].length > 20 ? s[0].substring(0,20)+'...' : s[0]),
                    datasets: [{
                        data: topSkus.map(s => s[1]),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
                    }]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { color: '#fff', font: { size: 10 } } } }
                }
            });

            const tbody = document.querySelector('#data-table tbody');
            data.slice(0, 100).forEach(d => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';
                tr.innerHTML = \`
                    <td class="py-2 px-4 text-gray-400">\${d.reportMonth}</td>
                    <td class="py-2 px-4 font-medium">\${d.nomenclature}</td>
                    <td class="py-2 px-4 text-red-300">\${d.defectDescription}</td>
                    <td class="py-2 px-4 text-gray-400">\${d.supplier}</td>
                    <td class="py-2 px-4">\${d.quantity}</td>
                \`;
                tbody.appendChild(tr);
            });
        }
        window.onload = init;
    </script>
</body>
</html>`;
                  const blob = new Blob([template], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Quality_Dashboard_Export_${new Date().toISOString().split('T')[0]}.html`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
             >
                <FileText size={16} />
                <span className="hidden lg:inline">Экспорт</span>
             </IOSButton>

             <IOSButton 
                variant="secondary"
                className="!py-3 !px-6 text-lg flex items-center gap-2 bg-white/5 hover:bg-white/10"
                onClick={() => setIsArrivalPopupOpen(true)}
             >
                <Package size={16} />
                <span>Приходы</span>
             </IOSButton>

             <div className="glass-panel px-4 py-3 text-lg text-gray-300 font-medium bg-white/5 border-white/10">
                Отчетный период: {meta?.reportMonth || 'Неизвестно'}
             </div>
             <div className="relative">
                <input 
                    type="file"
                    multiple 
                    id="add-file" 
                    className="hidden" 
                    accept=".xlsx,.xls,.csv,.txt" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                />
                <label htmlFor="add-file">
                    <IOSButton as="span" variant="primary" className="cursor-pointer !py-3 !px-6 text-lg">
                        <Plus size={16} /> Добавить отчет
                    </IOSButton>
                </label>
             </div>
          </div>
        </div>

        <ResponsiveGridLayout
          className="layout"
          breakpoints={{ lg: 1200, md: 996, sm: 640 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={30}
          margin={[24, 24]}
          containerPadding={[0, 0]}
          layouts={layouts}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onLayoutChange={(_layout: any, allLayouts: any) => {
            setLayouts(allLayouts);
            try {
              localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
            } catch (e) {
              console.error('Error saving layout:', e);
            }
          }}
          draggableHandle=".tile-drag-handle"
          resizeHandles={['se', 'e', 's']}
          compactType="vertical"
          useCSSTransforms
          isResizable
          isDraggable
        >
          <div key="writeoff_link" className="h-full">
            <GlassCard 
                className="h-full flex items-center space-x-4 relative cursor-pointer hover:bg-white/10 transition-colors group"
                onClick={() => navigate('/writeoff')}
            >
              <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors" onClick={(e) => e.stopPropagation()}>
                <GripVertical size={16} />
              </div>
              <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400 shadow-sm group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-300 font-medium">Анализ</p>
                <h4 className="text-xl font-bold text-white">Списания</h4>
              </div>
            </GlassCard>
          </div>

          <div key="kpi_total" className="h-full">
            <GlassCard 
                className="h-full flex items-center space-x-4 relative cursor-pointer hover:bg-white/10 transition-colors group"
                onClick={() => handleDetailClick('total', 'all')}
            >
              <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors" onClick={(e) => e.stopPropagation()}>
                <GripVertical size={16} />
              </div>
              <div className="p-3 bg-red-500/20 rounded-full text-red-400 shadow-sm group-hover:scale-110 transition-transform">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-300 font-medium">Количество НП</p>
                <h4 className="text-2xl font-bold text-white">{stats.totalDefects}</h4>
              </div>
            </GlassCard>
          </div>

          <div key="kpi_reason" className="h-full">
            <GlassCard 
                className="h-full flex items-center space-x-4 relative cursor-pointer hover:bg-white/10 transition-colors group"
                onClick={() => handleDetailClick('reason', stats.topReason)}
            >
              <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors" onClick={(e) => e.stopPropagation()}>
                <GripVertical size={16} />
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full text-blue-400 shadow-sm group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-300 font-medium">Топ причина</p>
                <h4 className="text-lg font-bold text-white truncate max-w-[220px]" title={stats.topReason}>
                  {stats.topReason || 'Н/Д'}
                </h4>
              </div>
            </GlassCard>
          </div>

          <div key="kpi_supplier" className="h-full">
            <GlassCard 
                className="h-full flex items-center space-x-4 relative cursor-pointer hover:bg-white/10 transition-colors group"
                onClick={() => handleDetailClick('supplier', stats.topSupplier)}
            >
              <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors" onClick={(e) => e.stopPropagation()}>
                <GripVertical size={16} />
              </div>
              <div className="p-3 bg-green-500/20 rounded-full text-green-400 shadow-sm group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-300 font-medium">Топ поставщик</p>
                <h4 className="text-lg font-bold text-white truncate max-w-[220px]" title={stats.topSupplier}>
                  {stats.topSupplier || 'Н/Д'}
                </h4>
              </div>
            </GlassCard>
          </div>

          <div key="supplier_china" className="h-full">
            <SupplierGroupCard 
              title="Поставщики Китай" 
              groupKey="china" 
              data={filteredData}
              totalDefects={stats.totalDefects}
              onDetailClick={handleDetailClick}
            />
          </div>

          <div key="supplier_rf" className="h-full">
            <SupplierGroupCard 
              title="Поставщики РФ" 
              groupKey="rf" 
              data={filteredData}
              totalDefects={stats.totalDefects}
              onDetailClick={handleDetailClick}
            />
          </div>

          <div key="supplier_furniture" className="h-full">
            <SupplierGroupCard 
              title="Поставщики Мебель" 
              groupKey="furniture" 
              data={filteredData}
              totalDefects={stats.totalDefects}
              onDetailClick={handleDetailClick}
            />
          </div>

          <div key="pareto" className="h-full">
            <ParetoChart data={paretoData} rawData={filteredData} onDetailClick={handleDetailClick} />
          </div>

          <div key="chat" className="h-full">
            <AIChat data={filteredData} />
          </div>

          <div key="supplier_chart" className="h-full">
            <SupplierChart data={supplierData} rawData={filteredData} onDetailClick={handleDetailClick} />
          </div>

          <div key="defect_desc" className="h-full">
            <DefectDescriptionChart data={filteredData} onDetailClick={handleDetailClick} />
          </div>

          <div key="preview" className="h-full">
            <FilePreview data={filteredData} />
          </div>
        </ResponsiveGridLayout>

        <ArrivalPopup 
          isOpen={isArrivalPopupOpen} 
          onClose={() => setIsArrivalPopupOpen(false)} 
        />
      </div>
    </div>
  );
};
