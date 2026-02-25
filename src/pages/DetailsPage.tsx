import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { parseFile } from '../utils/dataProcessor';
import { GlassCard } from '../components/UI/GlassCard';
import { IOSButton } from '../components/UI/IOSButton';
import { ArrowLeft, XCircle, GripVertical, PieChart, Calendar, Package, TrendingUp, Download, RotateCcw } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TooltipItem,
  LineElement,
  PointElement,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line, Pie, PolarArea } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale
);

const ResponsiveGridLayout = WidthProvider(Responsive);
const DETAILS_LAYOUT_STORAGE_KEY = 'details-layout-v1';
const GROUP_LAYOUT_STORAGE_KEY = 'group-layout-v1';

  const defaultLayouts = {
  lg: [
    { i: 'comparison', x: 0, y: 0, w: 12, h: 10 },
    { i: 'breakdown_left', x: 0, y: 10, w: 6, h: 10 },
    { i: 'breakdown_right', x: 6, y: 10, w: 6, h: 10 },
    { i: 'breakdown_description_ozon', x: 0, y: 20, w: 12, h: 10 },
    { i: 'sales_stats', x: 0, y: 30, w: 12, h: 4 },
    { i: 'table', x: 0, y: 34, w: 12, h: 12 },
  ],
  md: [
    { i: 'comparison', x: 0, y: 0, w: 10, h: 10 },
    { i: 'breakdown_left', x: 0, y: 10, w: 5, h: 10 },
    { i: 'breakdown_right', x: 5, y: 10, w: 5, h: 10 },
    { i: 'breakdown_description_ozon', x: 0, y: 20, w: 10, h: 10 },
    { i: 'sales_stats', x: 0, y: 30, w: 10, h: 4 },
    { i: 'table', x: 0, y: 34, w: 10, h: 12 },
  ],
  sm: [
    { i: 'comparison', x: 0, y: 0, w: 6, h: 10 },
    { i: 'breakdown_left', x: 0, y: 10, w: 6, h: 10 },
    { i: 'breakdown_right', x: 0, y: 20, w: 6, h: 10 },
    { i: 'breakdown_description_ozon', x: 0, y: 30, w: 6, h: 10 },
    { i: 'sales_stats', x: 0, y: 40, w: 6, h: 4 },
    { i: 'table', x: 0, y: 44, w: 6, h: 12 },
  ],
};

const defaultGroupLayouts = {
  lg: [
    { i: 'metrics_share', x: 0, y: 0, w: 4, h: 4 },
    { i: 'metrics_time', x: 4, y: 0, w: 4, h: 4 },
    { i: 'metrics_sku', x: 8, y: 0, w: 4, h: 4 },
    { i: 'chart_rating', x: 0, y: 4, w: 6, h: 10 },
    { i: 'chart_dynamics', x: 6, y: 4, w: 6, h: 10 },
    { i: 'chart_top_sku', x: 0, y: 14, w: 12, h: 10 },
    { i: 'list_details', x: 0, y: 24, w: 12, h: 12 },
  ],
  md: [
    { i: 'metrics_share', x: 0, y: 0, w: 3, h: 4 },
    { i: 'metrics_time', x: 3, y: 0, w: 3, h: 4 },
    { i: 'metrics_sku', x: 6, y: 0, w: 4, h: 4 },
    { i: 'chart_rating', x: 0, y: 4, w: 10, h: 10 },
    { i: 'chart_dynamics', x: 0, y: 14, w: 10, h: 10 },
    { i: 'chart_top_sku', x: 0, y: 24, w: 10, h: 10 },
    { i: 'list_details', x: 0, y: 34, w: 10, h: 12 },
  ],
  sm: [
    { i: 'metrics_share', x: 0, y: 0, w: 6, h: 4 },
    { i: 'metrics_time', x: 0, y: 4, w: 6, h: 4 },
    { i: 'metrics_sku', x: 0, y: 8, w: 6, h: 4 },
    { i: 'chart_rating', x: 0, y: 12, w: 6, h: 10 },
    { i: 'chart_dynamics', x: 0, y: 22, w: 6, h: 10 },
    { i: 'chart_top_sku', x: 0, y: 32, w: 6, h: 10 },
    { i: 'list_details', x: 0, y: 42, w: 6, h: 12 },
  ],
};

export const DetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data, salesData, supplierGroups, addData, addSalesData, updateMeta, meta, resetStore } = useStore();
  const [isUploading, setIsUploading] = useState(false);

  const type = searchParams.get('type') as 'supplier' | 'reason' | 'description' | 'group' | null;
  const value = searchParams.get('value');
  const selectedFiles = searchParams.get('files')?.split(',') || [];
  const subType = searchParams.get('subType') as 'description' | 'supplier' | 'nomenclature' | null;
  const subValue = searchParams.get('subValue');

  const isOzonYandex = useMemo(() => {
    if (!value) return false;
    const lowerValue = value.toLowerCase();
    const isGroupOzonYandex = type === 'group' && (lowerValue.includes('озон') || lowerValue.includes('яндекс'));
    return lowerValue.includes('озон') || lowerValue.includes('яндекс') || isGroupOzonYandex;
  }, [value, type]);

  // 1. Filter Sales Data (Consistent with Dashboard.tsx and URL params)
  const filteredSalesData = useMemo(() => {
    if (!salesData || !type || !value) return [];
    const lowerValue = value.toLowerCase().trim();
    
    return salesData.filter(item => {
        // Sales data usually doesn't have 'reason' or 'description', 
        // but it has 'supplier' and 'nomenclature'.
        if (type === 'supplier') return item.supplier?.toLowerCase().trim() === lowerValue;
        if (type === 'group') {
            const groupSuppliers = (supplierGroups[value as keyof typeof supplierGroups] || []).map(s => s.toLowerCase().trim());
            return groupSuppliers.includes(item.supplier?.toLowerCase().trim());
        }
        
        // If filtering by reason/description, sales data doesn't apply directly
        // but we might want to show total sales for the context of those defects.
        // For now, return all for the supplier if we can find it, or just all.
        return true; 
    });
  }, [salesData, type, value, supplierGroups]);

  const handleSalesButtonClick = () => {
    fileInputRef.current?.click();
  };

  const mainFilteredData = useMemo(() => {
    if (!data || !type || !value) return [];
    const lowerValue = value.toLowerCase().trim();
    
    // Normalize selected files for better matching
    const normalizedSelectedFiles = selectedFiles.map(f => decodeURIComponent(f).toLowerCase().trim());
    
    const result = data.filter(item => {
      // Filter by files if specified in URL
      if (normalizedSelectedFiles.length > 0 && item.fileName) {
        const itemFileLower = item.fileName.toLowerCase().trim();
        // Handle potential encoding or slight mismatches in filenames
        const hasMatch = normalizedSelectedFiles.some(f => 
          itemFileLower.includes(f) || f.includes(itemFileLower)
        );
        if (!hasMatch) return false;
      }

      const itemSupplier = (item.supplier || '').toLowerCase().trim();
      const itemReason = (item.claimReason || '').toLowerCase().trim();
      const itemDesc = (item.defectDescription || '').toLowerCase().trim();

      if (type === 'supplier') return itemSupplier === lowerValue;
      if (type === 'reason') return itemReason === lowerValue;
      if (type === 'description') return itemDesc === lowerValue;
      if (type === 'group') {
        const groupSuppliers = (supplierGroups[value as keyof typeof supplierGroups] || []).map(s => s.toLowerCase().trim());
        return groupSuppliers.includes(itemSupplier);
      }
      return false;
    });

    console.log(`DETAILS: Filtered data for ${type}=${value}`, {
      inputSize: data.length,
      outputSize: result.length,
      selectedFiles: normalizedSelectedFiles,
      params: { type, value, selectedFiles }
    });

    return result;
  }, [data, type, value, supplierGroups, selectedFiles]);

  const salesStats = useMemo(() => {
    const monthlySales: Record<string, number> = {};
    filteredSalesData.forEach(s => {
        // Normalize month name to "Month Year" format
        let monthKey = s.month;
        const monthsRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        
        // Ensure monthKey has a year if it's just a month name
        if (!monthKey.includes('20')) {
            const year = new Date().getFullYear().toString();
            monthKey = `${monthKey} ${year}`;
        }
        
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + s.quantity;
    });
    
    // Sort by date correctly
    const sortedEntries = Object.entries(monthlySales).sort((a, b) => {
        const monthsRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const parseDate = (s: string) => {
            const parts = s.split(' ');
            const m = monthsRu.indexOf(parts[0]);
            const y = parseInt(parts[1] || '2025');
            return y * 12 + (m === -1 ? 0 : m);
        };
        return parseDate(a[0]) - parseDate(b[0]);
    });

    console.log("DETAILS: Calculated sales stats", sortedEntries);
    return Object.fromEntries(sortedEntries);
  }, [filteredSalesData]);

  const salesByNomenclature = useMemo(() => {
    if (!isOzonYandex) return {};
    const stats: Record<string, Record<string, number>> = {};
    filteredSalesData.forEach(s => {
        if (!stats[s.month]) stats[s.month] = {};
        stats[s.month][s.nomenclature] = (stats[s.month][s.nomenclature] || 0) + s.quantity;
    });
    return stats;
  }, [filteredSalesData, isOzonYandex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setIsUploading(true);
        try {
            const newFile = e.target.files[0];
            const result = await parseFile(newFile);
            
            if (result.records && result.records.length > 0) {
                addData(result.records);
            }
            
            if (result.sales && result.sales.length > 0) {
                addSalesData(result.sales);
            }
            
            // Update meta
            const currentFiles = meta.fileName ? meta.fileName.split(', ').map(f => f.trim()) : [];
            if (!currentFiles.includes(result.fileName)) {
                currentFiles.push(result.fileName);
            }
            const newFileName = currentFiles.join(', ');

            updateMeta({
                fileName: newFileName
            });
            
            let message = `Загружено: ${result.records?.length || 0} строк брака`;
            if (result.sales && result.sales.length > 0) {
                message += ` и ${result.sales.length} строк продаж`;
            }
            alert(message);
        } catch (error) {
            console.error("Failed to add file:", error);
            alert("Ошибка загрузки файла");
        } finally {
            setIsUploading(false);
        }
    }
  };

  const handleReset = () => {
    if (confirm('Вы уверены, что хотите сбросить все данные? Это действие нельзя отменить.')) {
        resetStore();
        addLog('Данные полностью сброшены');
        navigate('/dashboard');
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const setLocalFilter = (filter: { type: 'description' | 'supplier' | 'nomenclature', value: string } | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (filter) {
      newParams.set('subType', filter.type);
      newParams.set('subValue', filter.value);
    } else {
      newParams.delete('subType');
      newParams.delete('subValue');
    }
    // Use navigate with the current path but updated search params
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: false });
  };

  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams);
    if (newParams.has('subType') || newParams.has('subValue')) {
      addLog('Возврат на уровень выше (сброс суб-фильтра)');
      newParams.delete('subType');
      newParams.delete('subValue');
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: false });
    } else {
      addLog('Возврат на главный дашборд');
      navigate('/dashboard');
    }
  };

  const localFilter = useMemo(() => {
    if (subType && subValue) {
      return { type: subType, value: subValue };
    }
    return null;
  }, [subType, subValue]);
  const [selectedChartType, setSelectedChartType] = useState<string>('defect_dynamics');
  const [tileChartTypes, setTileChartTypes] = useState<Record<string, string>>(() => {
    const initial = {
      breakdown_left: 'doughnut',
      breakdown_right: 'doughnut',
      chart_rating: 'bar_horizontal',
      chart_dynamics: 'defect_dynamics',
      comparison: 'defect_dynamics',
      breakdown_description_ozon: 'doughnut',
    };
    
    // For Ozon/Yandex, default to period comparison
    const searchParams = new URLSearchParams(window.location.search);
    const value = searchParams.get('value');
    if (value) {
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes('озон') || lowerValue.includes('яндекс')) {
        initial.comparison = 'period_comparison';
      }
    }
    return initial;
  });
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => {
    setLogs(prev => [new Date().toLocaleTimeString() + ': ' + msg, ...prev].slice(0, 10));
  };
  const [showAllComparison, setShowAllComparison] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  const toggleShowAllComparison = () => {
    setIsExpanding(true);
    setShowAllComparison(prev => !prev);
    addLog(showAllComparison ? 'Скрытие части поставщиков' : 'Показ всех поставщиков');
    setTimeout(() => setIsExpanding(false), 500);
  };

  // Set default chart type for Reason analysis
  React.useEffect(() => {
      if (searchParams.get('type') === 'reason') {
          setTileChartTypes(prev => ({ ...prev, comparison: 'period_comparison' }));
      }
  }, [searchParams]);

  // Load layouts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [layouts, setLayouts] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(DETAILS_LAYOUT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading layout:', e);
    }
    return defaultLayouts;
  });

  // Load group layouts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [groupLayouts, setGroupLayouts] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(GROUP_LAYOUT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading group layout:', e);
    }
    return defaultGroupLayouts;
  });

  // Save layout callback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onLayoutChange = (layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem(DETAILS_LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
  };

  // Save group layout callback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onGroupLayoutChange = (layout: any, allLayouts: any) => {
    setGroupLayouts(allLayouts);
    localStorage.setItem(GROUP_LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
  };

  // Group specific metrics and data
  const groupMetrics = useMemo(() => {
    if (type !== 'group' || !data) return null;
    
    const totalDefects = data.reduce((sum, item) => sum + item.quantity, 0);
    const groupDefects = mainFilteredData.reduce((sum, item) => sum + item.quantity, 0);
    const share = totalDefects > 0 ? (groupDefects / totalDefects) * 100 : 0;
    
    const uniqueMonths = new Set(mainFilteredData.map(d => d.reportMonth)).size;
    const uniqueSKUs = new Set(mainFilteredData.map(d => d.nomenclature)).size;
    
    // Determine month range
    const months = Array.from(new Set(mainFilteredData.map(d => d.reportMonth))).sort();
    const monthRange = months.length > 0 
      ? (months.length > 1 ? `${months[0]} / ${months[months.length - 1]}` : months[0])
      : '-';

    return {
      totalDefects: groupDefects,
      share: share.toFixed(1),
      uniqueMonths,
      uniqueSKUs,
      monthRange
    };
  }, [mainFilteredData, data, type]);

  // Top SKUs for Group View
  const topSKUsData = useMemo(() => {
    if (type !== 'group' || !data) return null;
    
    // 1. Calculate Totals
    const counts: Record<string, number> = {};
    mainFilteredData.forEach(item => {
        const key = item.nomenclature || 'Неизвестно';
        counts[key] = (counts[key] || 0) + item.quantity;
    });

    // 2. Sort and Get Top 10
    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10); 
    
    const topKeys = sorted.map(([k]) => k);
    
    // 3. Get Months
    const months = Array.from(new Set(mainFilteredData.map(d => d.reportMonth))).sort();
    
    // 4. Define Colors
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
    ];

    // 5. Build Datasets for Bar (Stacked by Month)
    const datasetsByMonth = months.map((month, idx) => ({
        label: month,
        data: topKeys.map(key => mainFilteredData
            .filter(d => d.reportMonth === month && (d.nomenclature || 'Неизвестно') === key)
            .reduce((sum, item) => sum + item.quantity, 0)
        ),
        backgroundColor: colors[idx % colors.length],
        stack: 'stack1',
        barThickness: 20,
        borderRadius: 4,
    }));

    // 6. Build Dataset for Pie/Doughnut (Total)
    const datasetTotal = {
        label: 'Количество брака',
        data: sorted.map(([, v]) => v),
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 20,
    };

    return {
      labels: topKeys,
      datasets: datasetsByMonth, // Default to multi-dataset (for Bar)
      totalDataset: datasetTotal // For Pie/Doughnut
    };
  }, [mainFilteredData, data, type]);

  // Group Comparative Dynamics (10 Types)
  const comparativeChartConfig = useMemo(() => {
    // Allow for all types, not just 'group'
    if (!data) return null;
    
    // Include all available months from both defects and sales
    const months = Array.from(new Set([
        ...mainFilteredData.map(d => d.reportMonth),
        ...filteredSalesData.map(s => s.month)
    ])).sort((a, b) => {
        const monthsRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const parse = (s: string) => {
            const parts = s.split(' ');
            const m = monthsRu.indexOf(parts[0]);
            const y = parseInt(parts[1] || '0');
            return y * 12 + m;
        };
        return parse(a) - parse(b);
    });

    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
    ];
    
    const getTopKeys = (keyFn: (d: any) => string, limit = 5) => {
        const counts: Record<string, number> = {};
        mainFilteredData.forEach(item => {
            const key = keyFn(item);
            counts[key] = (counts[key] || 0) + item.quantity;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([k]) => k);
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { 
                position: 'bottom' as const,
                labels: { 
                    color: '#9ca3af', 
                    usePointStyle: true, 
                    padding: 20,
                    font: { size: 14 } 
                }
            }
        },
        scales: {
            x: { 
                grid: { display: false },
                ticks: { 
                    color: '#e5e7eb',
                    callback: function(val: any) {
                        const label = this.getLabelForValue(val);
                        if (typeof label === 'string' && label.length > 15) {
                            return label.substring(0, 15) + '...';
                        }
                        return label;
                    }
                }
            },
            y: { 
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#9ca3af' },
                title: {
                    display: true,
                    text: isOzonYandex ? 'Процент брака (%)' : 'Кол-во брака (шт)',
                    color: '#9ca3af'
                }
            },
            y1: isOzonYandex ? {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                ticks: { color: '#36A2EB' },
                title: {
                    display: true,
                    text: 'Кол-во продаж (шт)',
                    color: '#36A2EB'
                }
            } : undefined
        }
    };

    const activeChartType = type === 'group' 
        ? (tileChartTypes['chart_dynamics'] || 'defect_dynamics')
        : (tileChartTypes['comparison'] || 'defect_dynamics');

    switch (activeChartType) {
        case 'period_comparison': {
            // Pivot: X-Axis = Entities (Suppliers/Defects/Nomenclature), Datasets = Months
            // This allows side-by-side comparison of different periods for the same entity
            const entityKey = isOzonYandex ? 'nomenclature' : (type === 'supplier' ? 'defectDescription' : 'supplier');
            const limit = showAllComparison ? 1000 : 5;
            const entities = getTopKeys(d => d[entityKey] || 'Неизвестно', limit); 
            
            const datasets: any[] = [];
            months.forEach((month, index) => {
                if (isOzonYandex) {
                    // 1. Rate Dataset (Left Y Axis)
                    datasets.push({
                        label: `${month} (% брака)`,
                        yAxisID: 'y',
                        data: entities.map(entity => {
                            const defects = mainFilteredData
                                .filter(d => d.reportMonth === month && (d[entityKey] || 'Неизвестно') === entity)
                                .reduce((sum, item) => sum + item.quantity, 0);
                            const sales = salesByNomenclature[month]?.[entity] || 0;
                            const rate = sales > 0 ? (defects / sales) * 100 : 0;
                            return parseFloat(rate.toFixed(2));
                        }),
                        backgroundColor: colors[index % colors.length],
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.8
                    });
                    // 2. Sales Dataset (Right Y Axis)
                    datasets.push({
                        label: `${month} (Продажи)`,
                        yAxisID: 'y1',
                        data: entities.map(entity => salesByNomenclature[month]?.[entity] || 0),
                        backgroundColor: colors[index % colors.length] + '40', // Very transparent
                        borderColor: colors[index % colors.length],
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.8
                    });
                } else {
                    datasets.push({
                        label: month,
                        data: entities.map(entity => mainFilteredData
                            .filter(d => d.reportMonth === month && (d[entityKey] || 'Неизвестно') === entity)
                            .reduce((sum, item) => sum + item.quantity, 0)
                        ),
                        backgroundColor: colors[index % colors.length],
                        borderRadius: 4,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    });
                }
            });

            return {
                type: 'bar',
                data: { labels: entities, datasets },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            callbacks: {
                                label: (ctx: any) => {
                                    const val = ctx.raw;
                                    const entity = ctx.label;
                                    const datasetLabel = ctx.dataset.label;
                                    const month = datasetLabel.split(' (')[0];
                                    
                                    if (isOzonYandex) {
                                        if (datasetLabel.includes('% брака')) {
                                            const defects = mainFilteredData
                                                .filter(d => d.reportMonth === month && (d[entityKey] || 'Неизвестно') === entity)
                                                .reduce((sum, item) => sum + item.quantity, 0);
                                            const sales = salesByNomenclature[month]?.[entity] || 0;
                                            return `${month} % брака: ${val}% (Брак: ${defects} шт, Прод: ${sales} шт)`;
                                        } else {
                                            return `${month} Продажи: ${val} шт.`;
                                        }
                                    }
                                    return `${month}: ${val} шт.`;
                                }
                            }
                        }
                    },
                    scales: commonOptions.scales
                }
            };
        }
        case 'period_comparison_horizontal': {
            // Pivot: Y-Axis = Entities (Suppliers/Defects/Nomenclature), Datasets = Months
            const entityKey = isOzonYandex ? 'nomenclature' : (type === 'supplier' ? 'defectDescription' : 'supplier');
            const limit = showAllComparison ? 1000 : 10;
            const entities = getTopKeys(d => d[entityKey] || 'Неизвестно', limit); 
            
            const datasets: any[] = [];
            months.forEach((month, index) => {
                if (isOzonYandex) {
                    // Horizontal doesn't play well with dual X-axis for bars in Chart.js easily 
                    // without complex configuration. Let's keep it simple for now or skip sales in horizontal.
                    // Actually, let's include it.
                    datasets.push({
                        label: `${month} (% брака)`,
                        xAxisID: 'x', // For horizontal, scales are flipped
                        data: entities.map(entity => {
                            const defects = mainFilteredData
                                .filter(d => d.reportMonth === month && (d[entityKey] || 'Неизвестно') === entity)
                                .reduce((sum, item) => sum + item.quantity, 0);
                            const sales = salesByNomenclature[month]?.[entity] || 0;
                            const rate = sales > 0 ? (defects / sales) * 100 : 0;
                            return parseFloat(rate.toFixed(2));
                        }),
                        backgroundColor: colors[index % colors.length],
                        borderRadius: 4,
                    });
                } else {
                    datasets.push({
                        label: month,
                        data: entities.map(entity => mainFilteredData
                            .filter(d => d.reportMonth === month && (d[entityKey] || 'Неизвестно') === entity)
                            .reduce((sum, item) => sum + item.quantity, 0)
                        ),
                        backgroundColor: colors[index % colors.length],
                        borderRadius: 4,
                    });
                }
            });

            return {
                type: 'bar',
                data: { labels: entities, datasets },
                options: {
                    ...commonOptions,
                    indexAxis: 'y',
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            callbacks: {
                                label: (ctx: any) => {
                                    const val = ctx.raw;
                                    const entity = ctx.label;
                                    const datasetLabel = ctx.dataset.label;
                                    const month = datasetLabel.split(' (')[0];
                                    if (isOzonYandex) {
                                        const defects = mainFilteredData
                                            .filter(d => d.reportMonth === month && (d[entityKey] || 'Неизвестно') === entity)
                                            .reduce((sum, item) => sum + item.quantity, 0);
                                        const sales = salesByNomenclature[month]?.[entity] || 0;
                                        return `${month}: ${val}% (Брак: ${defects} шт, Прод: ${sales} шт)`;
                                    }
                                    return `${month}: ${val} шт.`;
                                }
                            }
                        }
                    },
                    scales: {
                        ...commonOptions.scales,
                        x: { 
                            ...commonOptions.scales.x, 
                            stacked: false,
                            title: {
                                display: true,
                                text: isOzonYandex ? 'Процент брака (%)' : 'Кол-во брака (шт)',
                                color: '#9ca3af'
                            }
                        },
                        y: { 
                            ...commonOptions.scales.y, 
                            stacked: false,
                        }
                    }
                }
            };
        }
        case 'defect_dynamics': {
            const topDefects = getTopKeys(d => d.defectDescription || 'Не указано');
            const datasets = topDefects.map((key, index) => ({
                label: key,
                data: months.map(month => mainFilteredData
                    .filter(d => d.reportMonth === month && d.defectDescription === key)
                    .reduce((sum, item) => sum + item.quantity, 0)
                ),
                backgroundColor: colors[index % colors.length],
                stack: 'stack1',
            }));
            datasets.push({
                label: 'Другие',
                data: months.map(month => mainFilteredData
                    .filter(d => d.reportMonth === month && !topDefects.includes(d.defectDescription || 'Не указано'))
                    .reduce((sum, item) => sum + item.quantity, 0)
                ),
                backgroundColor: '#9ca3af',
                stack: 'stack1',
            });
            return {
                type: 'bar',
                data: { labels: months, datasets },
                options: {
                    ...commonOptions,
                    scales: {
                        x: { ...commonOptions.scales.x, stacked: true },
                        y: { ...commonOptions.scales.y, stacked: true }
                    }
                }
            };
        }
        case 'supplier_dynamics': {
            const topSuppliers = getTopKeys(d => d.supplier || 'Неизвестно');
            const datasets = topSuppliers.map((key, index) => ({
                label: key,
                data: months.map(month => mainFilteredData
                    .filter(d => d.reportMonth === month && d.supplier === key)
                    .reduce((sum, item) => sum + item.quantity, 0)
                ),
                backgroundColor: colors[index % colors.length],
                stack: 'stack1',
            }));
            datasets.push({
                label: 'Другие',
                data: months.map(month => mainFilteredData
                    .filter(d => d.reportMonth === month && !topSuppliers.includes(d.supplier || 'Неизвестно'))
                    .reduce((sum, item) => sum + item.quantity, 0)
                ),
                backgroundColor: '#9ca3af',
                stack: 'stack1',
            });
            return {
                type: 'bar',
                data: { labels: months, datasets },
                options: {
                    ...commonOptions,
                    scales: {
                        x: { ...commonOptions.scales.x, stacked: true },
                        y: { ...commonOptions.scales.y, stacked: true }
                    }
                }
            };
        }
        case 'defect_distribution': {
            const topDefects = getTopKeys(d => d.defectDescription || 'Не указано', 10);
            const data = topDefects.map(key => mainFilteredData
                .filter(d => d.defectDescription === key)
                .reduce((sum, item) => sum + item.quantity, 0)
            );
            const labels = topDefects.map((key, i) => `${key} (${data[i]})`);
            return {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
                options: { ...commonOptions, scales: { x: { display: false }, y: { display: false } } }
            };
        }
        case 'supplier_distribution': {
            const topSuppliers = getTopKeys(d => d.supplier || 'Неизвестно', 10);
            const data = topSuppliers.map(key => mainFilteredData
                .filter(d => d.supplier === key)
                .reduce((sum, item) => sum + item.quantity, 0)
            );
            const labels = topSuppliers.map((key, i) => `${key} (${data[i]})`);
            return {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
                options: { ...commonOptions, scales: { x: { display: false }, y: { display: false } } }
            };
        }
        case 'nomenclature_distribution': {
            const topNomen = getTopKeys(d => d.nomenclature || 'Неизвестно', 10);
            const data = topNomen.map(key => mainFilteredData
                .filter(d => d.nomenclature === key)
                .reduce((sum, item) => sum + item.quantity, 0)
            );
            const labels = topNomen.map((n, i) => {
                const name = n.length > 20 ? n.substring(0, 20) + '...' : n;
                return `${name} (${data[i]})`;
            });
            return {
                type: 'pie',
                data: { 
                    labels, 
                    datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] 
                },
                options: { ...commonOptions, scales: { x: { display: false }, y: { display: false } } }
            };
        }
        case 'defect_trends': {
            const topDefects = getTopKeys(d => d.defectDescription || 'Не указано');
            const datasets = topDefects.map((key, index) => ({
                label: key,
                data: months.map(month => mainFilteredData
                    .filter(d => d.reportMonth === month && d.defectDescription === key)
                    .reduce((sum, item) => sum + item.quantity, 0)
                ),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length],
                tension: 0.4
            }));
            return {
                type: 'line',
                data: { labels: months, datasets },
                options: commonOptions
            };
        }
        case 'supplier_trends': {
            const topSuppliers = getTopKeys(d => d.supplier || 'Неизвестно');
            const datasets = topSuppliers.map((key, index) => ({
                label: key,
                data: months.map(month => mainFilteredData
                    .filter(d => d.reportMonth === month && d.supplier === key)
                    .reduce((sum, item) => sum + item.quantity, 0)
                ),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length],
                tension: 0.4
            }));
            return {
                type: 'line',
                data: { labels: months, datasets },
                options: commonOptions
            };
        }
        case 'total_dynamics': {
            const data = months.map(month => mainFilteredData
                .filter(d => d.reportMonth === month)
                .reduce((sum, item) => sum + item.quantity, 0)
            );
            return {
                type: 'bar',
                data: { labels: months, datasets: [{ label: 'Количество НП', data, backgroundColor: '#3b82f6', borderRadius: 4 }] },
                options: commonOptions
            };
        }
        case 'cumulative_dynamics': {
            let cumulative = 0;
            const data = months.map(month => {
                const monthly = mainFilteredData
                    .filter(d => d.reportMonth === month)
                    .reduce((sum, item) => sum + item.quantity, 0);
                cumulative += monthly;
                return cumulative;
            });
            return {
                type: 'line',
                data: { 
                    labels: months, 
                    datasets: [{ 
                        label: 'Накопительный итог', 
                        data, 
                        borderColor: '#10b981', 
                        backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                        fill: true, 
                        tension: 0.4 
                    }] 
                },
                options: commonOptions
            };
        }
        case 'claim_cause_distribution': {
            const topCauses = getTopKeys(d => d.claimReason || 'Неизвестно', 8);
            const data = topCauses.map(key => mainFilteredData
                .filter(d => d.claimReason === key)
                .reduce((sum, item) => sum + item.quantity, 0)
            );
            return {
                type: 'polarArea',
                data: { labels: topCauses, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
                options: { 
                    ...commonOptions, 
                    scales: { 
                        x: { display: false }, 
                        y: { display: false },
                        r: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false, backdropColor: 'transparent' } }
                    } 
                }
            };
        }
        default: return null;
    }
  }, [mainFilteredData, type, tileChartTypes, showAllComparison]);

  // Dynamic Layout Adjustment for Expanded Chart
  React.useEffect(() => {
    if (!comparativeChartConfig?.data?.labels) return;

    const isHorizontal = tileChartTypes['comparison'] === 'period_comparison_horizontal' || 
                         tileChartTypes['comparison'] === 'supplier_distribution' || // Pie charts usually don't need huge height but maybe
                         tileChartTypes['comparison'] === 'defect_distribution';

    // We only really need to expand for horizontal bars with many items
    const shouldExpand = showAllComparison && 
                         (tileChartTypes['comparison'] === 'period_comparison_horizontal');

    const itemCount = comparativeChartConfig.data.labels.length;
    const defaultH = 10; // Default height from defaultLayouts

    // Calculate required height: ~4 rows for header/legend + 1 row per item
    // But let's be conservative. 30px row height.
    // If we have 100 items -> 100 rows? That's 3000px.
    // Maybe cap it or just let it be. User asked for it.
    let newH = defaultH;
    if (shouldExpand) {
        newH = Math.max(defaultH, 6 + Math.ceil(itemCount * 1.2)); 
    }

    setLayouts((prevLayouts: any) => {
        // Check if update is needed to avoid loops
        const currentLg = prevLayouts.lg.find((i: any) => i.i === 'comparison');
        if (currentLg && currentLg.h === newH) return prevLayouts;

        const newLayouts = { ...prevLayouts };
        ['lg', 'md', 'sm'].forEach(bp => {
            if (newLayouts[bp]) {
                newLayouts[bp] = newLayouts[bp].map((item: any) => {
                    if (item.i === 'comparison') {
                        return { ...item, h: newH };
                    }
                    // We don't need to manually move others, RGL handles it if compactType is vertical
                    return item;
                });
            }
        });
        return newLayouts;
    });
  }, [showAllComparison, comparativeChartConfig, tileChartTypes]);

  // 2. Table Filter (Main + Local Interaction)
  const tableData = useMemo(() => {
    let filtered = mainFilteredData;
    
    if (localFilter) {
      // Helper to check for "empty" values
      const isEmpty = (val: any) => !val || val === 'Неизвестно' || val === 'Не указано';

      filtered = mainFilteredData.filter(item => {
        const filterValue = localFilter.value;
        const isSpecialValue = filterValue === 'Неизвестно' || filterValue === 'Не указано' || filterValue === 'Другое';

        if (localFilter.type === 'description') {
          if (isSpecialValue) {
            // If filtering by "Other", we need to know what "Other" means in context of the chart it came from
            // But for "Unknown"/"Not specified", we just check empty
            return isEmpty(item.defectDescription);
          }
          return item.defectDescription === filterValue;
        }
        if (localFilter.type === 'supplier') {
          if (isSpecialValue) return isEmpty(item.supplier);
          return item.supplier === filterValue;
        }
        if (localFilter.type === 'nomenclature') {
          if (isSpecialValue) return isEmpty(item.nomenclature);
          return item.nomenclature === filterValue;
        }
        return true;
      });
    }

    // Aggregation for Ozon/Yandex (Marketplace mode)
    if (isOzonYandex) {
        const grouped: Record<string, any> = {};
        filtered.forEach(item => {
            const key = `${item.reportMonth}_${item.nomenclature}`;
            if (!grouped[key]) {
                grouped[key] = { ...item };
            } else {
                grouped[key].quantity += item.quantity;
            }
        });
        return Object.values(grouped);
    }

    return filtered;
  }, [mainFilteredData, localFilter, isOzonYandex]);

  // 3. Comparison Data (Time Series) or Grouped Supplier Data
  const comparisonData = useMemo(() => {
    // Special case for 'group' type: Show simple bar chart of top suppliers
    if (type === 'group') {
      const counts: Record<string, number> = {};
      mainFilteredData.forEach(item => {
        const key = item.supplier || 'Неизвестно';
        counts[key] = (counts[key] || 0) + item.quantity;
      });

      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20); // Top 20

      return {
        labels: sorted.map(([k]) => k),
        datasets: [{
          label: 'Количество брака',
          data: sorted.map(([, v]) => v),
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          barThickness: 20,
        }]
      };
    }

    const months = Array.from(new Set(mainFilteredData.map(d => d.reportMonth))).sort();
    
    // Determine the stacking key (Top 5 categories)
    // If analyzing supplier -> breakdown by defectDescription
    // If analyzing reason -> breakdown by supplier
    // If analyzing description -> breakdown by supplier
    const stackKey = type === 'supplier' ? 'defectDescription' : 'supplier';
    
    // Count totals for stack keys to find top 5
    const stackCounts: Record<string, number> = {};
    mainFilteredData.forEach(item => {
        const key = type === 'supplier' 
            ? (item.defectDescription || 'Не указано') 
            : (item.supplier || 'Неизвестно');
        stackCounts[key] = (stackCounts[key] || 0) + item.quantity;
    });
    
    const topStackKeys = Object.entries(stackCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k]) => k);

    // Prepare datasets
    const datasets = topStackKeys.map((key, index) => {
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
        ];
        
        return {
            label: key,
            data: months.map(month => {
                return mainFilteredData
                    .filter(d => d.reportMonth === month && (
                        type === 'supplier' 
                            ? (d.defectDescription || 'Не указано') === key
                            : (d.supplier || 'Неизвестно') === key
                    ))
                    .reduce((sum, item) => sum + item.quantity, 0);
            }),
            backgroundColor: colors[index % colors.length],
            // Removed stack property to allow grouped bars
        };
    });
    
    // Add "Other" stack
    datasets.push({
        label: 'Другое',
        data: months.map(month => {
             return mainFilteredData
                .filter(d => d.reportMonth === month && (
                    type === 'supplier' 
                        ? !topStackKeys.includes(d.defectDescription || 'Не указано')
                        : !topStackKeys.includes(d.supplier || 'Неизвестно')
                ))
                .reduce((sum, item) => sum + item.quantity, 0);
        }),
        backgroundColor: '#9ca3af',
        // Removed stack property
    });

    return {
      labels: months,
      datasets,
    };
  }, [mainFilteredData, type]);

  // 4. Breakdown Data: Defect Descriptions (Normalized)
  const descriptionBreakdown = useMemo(() => {
      // If viewing a group, show top suppliers as well (or descriptions?)
      // The user wants 'columns diagram broken down by suppliers'. 
      // We already did that in comparisonData for 'group'.
      // Maybe here we can show Defect Descriptions for that group?
      
      const counts: Record<string, number> = {};
      mainFilteredData.forEach(item => {
          const key = item.defectDescription || 'Не указано';
          counts[key] = (counts[key] || 0) + item.quantity;
      });

      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10

      return {
        labels: sorted.map(([k]) => k),
        datasets: [{
            data: sorted.map(([, v]) => v),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
              '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
            ],
            borderWidth: 0,
        }]
      };
  }, [mainFilteredData]);

  // 5. Breakdown Data: Suppliers (Culprits)
  const supplierBreakdown = useMemo(() => {
      const counts: Record<string, number> = {};
      mainFilteredData.forEach(item => {
          const key = item.supplier || 'Неизвестно';
          counts[key] = (counts[key] || 0) + item.quantity;
      });

      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10

      return {
        labels: sorted.map(([k]) => k),
        datasets: [{
            data: sorted.map(([, v]) => v),
            backgroundColor: [
              '#4BC0C0', '#FF9F40', '#FF6384', '#36A2EB', '#9966FF',
              '#FFCE56', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
            ],
            borderWidth: 0,
        }]
      };
  }, [mainFilteredData]);

  // 6. Breakdown Data: Nomenclature (Models)
  const nomenclatureBreakdown = useMemo(() => {
      const counts: Record<string, number> = {};
      mainFilteredData.forEach(item => {
          const key = item.nomenclature || 'Неизвестно';
          counts[key] = (counts[key] || 0) + item.quantity;
      });

      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10

      return {
        labels: sorted.map(([k]) => k),
        datasets: [{
            data: sorted.map(([, v]) => v),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
              '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
            ],
            borderWidth: 0,
        }]
      };
  }, [mainFilteredData]);

  // Click Handlers
  const handleDescriptionClick = (event: any, elements: { index: number }[]) => {
      addLog('Клик по графику дефектов');
      if (event && event.chart) {
        event.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
        event.chart.update();
      }
      if (elements.length > 0) {
          const index = elements[0].index;
          const label = descriptionBreakdown.labels[index];
          addLog(`Выбран дефект: ${label}`);
          setLocalFilter({ type: 'description', value: label });
      }
  };

  const handleSupplierClick = (event: any, elements: { index: number }[]) => {
      addLog('Клик по графику поставщиков');
      if (event && event.chart) {
        event.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
        event.chart.update();
      }
      if (elements.length > 0) {
          const index = elements[0].index;
          const label = supplierBreakdown.labels[index];
          addLog(`Выбран поставщик: ${label}`);
          setLocalFilter({ type: 'supplier', value: label });
      }
  };

  const handleNomenclatureClick = (event: any, elements: { index: number }[]) => {
      addLog('Клик по графику номенклатуры');
      if (event && event.chart) {
        event.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
        event.chart.update();
      }
      if (elements.length > 0) {
          const index = elements[0].index;
          const label = nomenclatureBreakdown.labels[index];
          addLog(`Выбрана номенклатура: ${label}`);
          setLocalFilter({ type: 'nomenclature', value: label });
      }
  };

  const handleMainChartClick = (event: any, elements: any[]) => {
    addLog(`Клик по основному графику: ${elements.length} элементов`);
    if (event && event.chart) {
      event.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      event.chart.update();
    }
    if (elements.length > 0) {
      const { index, datasetIndex } = elements[0];
      
      if (type === 'group') {
        let label = comparisonData.labels[index];
        addLog(`Групповой вид: Выбран поставщик ${label}`);
        setLocalFilter({ type: 'supplier', value: label });
      } else {
        const dataset = comparisonData.datasets[datasetIndex];
        const datasetLabel = dataset.label;
        addLog(`Временной ряд: Выбран датасет ${datasetLabel}`);
        
        if (datasetLabel === 'Другое' || datasetLabel === 'Другие') {
          addLog('Сброс фильтра (выбрано "Другое")');
          setLocalFilter(null);
          return;
        }

        if (type === 'supplier') {
          addLog(`Фильтр по дефекту: ${datasetLabel}`);
          setLocalFilter({ type: 'description', value: datasetLabel });
        } else {
          addLog(`Фильтр по поставщику: ${datasetLabel}`);
          setLocalFilter({ type: 'supplier', value: datasetLabel });
        }
      }
    }
  };

  const handleComparativeChartClick = (event: any, elements: any[]) => {
    addLog('Клик по сравнительному графику');
    
    // Скрываем тултип при клике, чтобы он не "залипал"
    if (event && event.chart) {
      event.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      event.chart.update();
    }

    if (elements.length > 0 && comparativeChartConfig) {
      const { index, datasetIndex } = elements[0];
      const chartType = type === 'group' 
        ? (tileChartTypes['chart_dynamics'] || 'defect_dynamics')
        : (tileChartTypes['comparison'] || 'defect_dynamics');

      let label = comparativeChartConfig.data.labels[index];
      const dataset = comparativeChartConfig.data.datasets[datasetIndex];
      const datasetLabel = (dataset as any).label || '';
      addLog(`Детали клика: тип=${chartType}, метка=${label}, датасет=${datasetLabel}`);

      if (label && typeof label === 'string' && label.includes(' (')) {
        label = label.split(' (')[0];
      }

      if (label === 'Другие' || datasetLabel === 'Другие' || label === 'Другое' || datasetLabel === 'Другое') {
        addLog('Сброс фильтра (выбрано "Другое")');
        setLocalFilter(null);
        return;
      }

      if (chartType === 'period_comparison' || chartType === 'period_comparison_horizontal') {
        if (isOzonYandex) {
          setLocalFilter({ type: 'nomenclature', value: label });
        } else if (type === 'supplier') {
          setLocalFilter({ type: 'description', value: label });
        } else {
          setLocalFilter({ type: 'supplier', value: label });
        }
      } else if (chartType.includes('dynamics') || chartType.includes('trends')) {
        if (chartType.includes('supplier')) {
          setLocalFilter({ type: 'supplier', value: datasetLabel });
        } else if (chartType.includes('defect')) {
          setLocalFilter({ type: 'description', value: datasetLabel });
        }
      } else if (chartType.includes('distribution')) {
        if (chartType.includes('supplier')) {
          setLocalFilter({ type: 'supplier', value: label }); 
        } else if (chartType.includes('defect')) {
          setLocalFilter({ type: 'description', value: label });
        } else if (chartType.includes('nomenclature')) {
          setLocalFilter({ type: 'nomenclature', value: label });
        }
      }
    }
  };

  const ActionLogOverlay = () => (
    <div className="fixed bottom-6 right-6 w-80 bg-black/80 backdrop-blur-lg rounded-2xl border border-white/10 p-4 shadow-2xl z-50 pointer-events-none transition-all hover:bg-black/90">
        <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold text-xs uppercase tracking-widest">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Лог действий (Debug)
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pointer-events-auto">
            {logs.length === 0 ? (
                <div className="text-gray-500 text-[10px] italic">Ожидание действий...</div>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className="text-[10px] text-gray-300 font-mono leading-tight border-l border-blue-500/30 pl-2">
                        {log}
                    </div>
                ))
            )}
        </div>
    </div>
  );

  if (!type || !value) {
    return (
      <div className="p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Ошибка</h2>
        <p>Не выбрана категория для анализа.</p>
        <IOSButton onClick={handleBack} className="mt-4">
          <ArrowLeft size={16} /> Назад
        </IOSButton>
      </div>
    );
  }

  if (type === 'group' && groupMetrics) {
    // Custom layout for Group view
    const groupName = {
      china: 'КИТАЙ',
      rf: 'РФ',
      furniture: 'МЕБЕЛЬ'
    }[value as string] || value;

    const uniqueMonths = Array.from(new Set(tableData.map(d => d.reportMonth))).sort();
    const isSplitView = uniqueMonths.length > 1;

    return (
        <div className="min-h-screen bg-ios-dark-blue p-4 md:p-8 pb-24 space-y-6">
            {/* Custom Header */}
            <div className="flex flex-col items-center justify-center mb-8 relative">
                <div className="absolute left-0 top-1">
                    <IOSButton onClick={handleBack} variant="secondary">
                        <ArrowLeft size={18} /> Назад
                    </IOSButton>
                </div>
                <h1 className="text-4xl font-black text-white uppercase tracking-wide mb-6">
                    ПОСТАВЩИКИ: {groupName}
                </h1>
                <div className="flex flex-wrap justify-center gap-4">
                    <div className="px-4 py-2 bg-white/10 rounded-full border border-white/10 flex items-center gap-2 text-gray-200">
                         <span className="text-blue-400">📅</span>
                         <span>Периоды: {groupMetrics.monthRange}</span>
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-full border border-white/10 flex items-center gap-2 text-gray-200">
                         <span className="text-blue-400">🗄️</span>
                         <span>Объектов: {groupMetrics.totalDefects} инцидентов</span>
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-full border border-white/10 flex items-center gap-2 text-gray-200">
                         <span className="text-blue-400">Category</span>
                         <span>Тип: Категория</span>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".xlsx,.csv,.txt"
                    />
                </div>
            </div>

            <ResponsiveGridLayout
                className="layout"
                breakpoints={{ lg: 1200, md: 996, sm: 640 }}
                cols={{ lg: 12, md: 10, sm: 6 }}
                rowHeight={30}
                margin={[24, 24]}
                containerPadding={[0, 0]}
                layouts={groupLayouts}
                onLayoutChange={onGroupLayoutChange}
                draggableHandle=".tile-drag-handle"
                resizeHandles={['se', 'e', 's']}
                compactType="vertical"
                useCSSTransforms
                isResizable
                isDraggable
            >
                {/* Metrics Share */}
                <div key="metrics_share">
                    <GlassCard className="h-full p-6 flex flex-col justify-between relative">
                        <div className="tile-drag-handle absolute top-2 right-2 z-10 p-1 rounded bg-white/5 hover:bg-white/10 cursor-grab">
                            <GripVertical size={14} className="text-gray-400" />
                        </div>
                        <div className="flex items-start justify-between">
                             <div>
                                 <p className="text-xs uppercase text-gray-400 font-bold mb-1">ДОЛЯ В ОБЩЕМ ПОТОКЕ</p>
                                 <h2 className="text-4xl font-bold text-white">{groupMetrics.share}%</h2>
                             </div>
                             <div className="text-blue-400">
                                <PieChart size={32} strokeWidth={1.5} />
                             </div>
                        </div>
                        <p className="text-sm text-gray-500">От всех инцидентов в базе</p>
                    </GlassCard>
                </div>

                {/* Metrics Time */}
                <div key="metrics_time">
                    <GlassCard className="h-full p-6 flex flex-col justify-between relative">
                        <div className="tile-drag-handle absolute top-2 right-2 z-10 p-1 rounded bg-white/5 hover:bg-white/10 cursor-grab">
                            <GripVertical size={14} className="text-gray-400" />
                        </div>
                        <div className="flex items-start justify-between">
                             <div>
                                 <p className="text-xs uppercase text-gray-400 font-bold mb-1">ВРЕМЕННОЙ ОХВАТ</p>
                                 <h2 className="text-4xl font-bold text-white">{groupMetrics.uniqueMonths} МЕСЯЦА</h2>
                             </div>
                             <div className="text-blue-400">
                                <Calendar size={32} strokeWidth={1.5} />
                             </div>
                        </div>
                        <p className="text-sm text-gray-500">Активность в отчетах</p>
                    </GlassCard>
                </div>

                {/* Metrics SKU */}
                <div key="metrics_sku">
                    <GlassCard className="h-full p-6 flex flex-col justify-between relative">
                        <div className="tile-drag-handle absolute top-2 right-2 z-10 p-1 rounded bg-white/5 hover:bg-white/10 cursor-grab">
                            <GripVertical size={14} className="text-gray-400" />
                        </div>
                        <div className="flex items-start justify-between">
                             <div>
                                 <p className="text-xs uppercase text-gray-400 font-bold mb-1">ЗАТРОНУТО SKU</p>
                                 <h2 className="text-4xl font-bold text-white">{groupMetrics.uniqueSKUs} поз.</h2>
                             </div>
                             <div className="text-blue-400">
                                <Package size={32} strokeWidth={1.5} />
                             </div>
                        </div>
                        <p className="text-sm text-gray-500">Уникальных артикулов</p>
                    </GlassCard>
                </div>

                {/* Chart Rating */}
                <div key="chart_rating">
                    <GlassCard className="h-full p-8 relative flex flex-col">
                        <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                        </div>
                        <div className="mb-4 flex flex-col justify-between gap-2 pr-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-blue-500">📊</span>
                                    <h3 className="text-xl font-bold text-white">Рейтинг поставщиков</h3>
                                </div>
                                <p className="text-gray-500 text-sm">От наибольшего уровня брака к наименьшему</p>
                            </div>
                            <select 
                                value={tileChartTypes['chart_rating'] || 'bar_horizontal'}
                                onChange={(e) => setTileChartTypes(prev => ({...prev, chart_rating: e.target.value}))}
                                className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                            >
                                <option className="bg-gray-800" value="bar_horizontal">Столбцы (Гориз.)</option>
                                <option className="bg-gray-800" value="bar_vertical">Столбцы (Верт.)</option>
                                <option className="bg-gray-800" value="doughnut">Пончик (Doughnut)</option>
                                <option className="bg-gray-800" value="pie">Пирог (Pie)</option>
                            </select>
                        </div>
                        <div className="flex-grow w-full min-h-0 relative flex items-center justify-center">
                             {(() => {
                                 const chartType = tileChartTypes['chart_rating'] || 'bar_horizontal';
                                 const colors = [
                                   '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                                   '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
                                 ];
                                 
                                 const data = {
                                     ...comparisonData,
                                     datasets: comparisonData.datasets.map(ds => ({
                                         ...ds,
                                         backgroundColor: (chartType === 'doughnut' || chartType === 'pie') ? colors : '#3b82f6'
                                     }))
                                 };

                                 const options = {
                                     indexAxis: chartType === 'bar_horizontal' ? 'y' as const : 'x' as const,
                                     responsive: true,
                                     maintainAspectRatio: false,
                                     plugins: { 
                                         legend: { 
                                             display: chartType === 'doughnut' || chartType === 'pie',
                                             position: 'right' as const,
                                             labels: { color: '#fff' }
                                         },
                                         tooltip: { 
                                             backgroundColor: 'rgba(0,0,0,0.8)',
                                             padding: 12,
                                             titleFont: { size: 14 },
                                             bodyFont: { size: 14 }
                                         }
                                     },
                                     scales: (chartType === 'doughnut' || chartType === 'pie') ? {
                                         x: { display: false },
                                         y: { display: false }
                                     } : {
                                         x: { 
                                             grid: { color: 'rgba(255,255,255,0.05)' },
                                             ticks: { color: '#9ca3af' }
                                         },
                                         y: { 
                                             grid: { display: false },
                                             ticks: { 
                                                 color: '#e5e7eb',
                                                 font: { size: 11, weight: 'bold' },
                                                 autoSkip: false
                                             }
                                         }
                                     },
                                     onClick: handleMainChartClick
                                 };

                                 return (
                                     <>
                                         {(chartType === 'bar_horizontal' || chartType === 'bar_vertical') && <Bar data={data} options={options as any} />}
                                         {chartType === 'doughnut' && <Doughnut data={data} options={options as any} />}
                                         {chartType === 'pie' && <Pie data={data} options={options as any} />}
                                     </>
                                 );
                             })()}
                        </div>
                    </GlassCard>
                </div>

                {/* Chart Dynamics */}
                <div key="chart_dynamics">
                    {comparativeChartConfig && (
                    <GlassCard className="h-full p-8 relative flex flex-col">
                        <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                        </div>
                        <div className="mb-4 flex flex-col justify-between gap-2">
                            <div>
                                <h3 className="text-xl font-bold text-white">Сравнительный анализ</h3>
                                <p className="text-gray-500 text-sm">Выберите тип диаграммы</p>
                            </div>
                            <select 
                                value={tileChartTypes['chart_dynamics'] || 'defect_dynamics'}
                                onChange={(e) => setTileChartTypes(prev => ({...prev, chart_dynamics: e.target.value}))}
                                className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            >
                                <option className="bg-gray-800" value="defect_dynamics">Динамика дефектов (Стек)</option>
                                <option className="bg-gray-800" value="supplier_dynamics">Динамика поставщиков (Стек)</option>
                                <option className="bg-gray-800" value="period_comparison">Сравнение периодов (Рядом)</option>
                                <option className="bg-gray-800" value="period_comparison_horizontal">Сравнение периодов (Горизонт)</option>
                                <option className="bg-gray-800" value="defect_distribution">Распределение дефектов (Пай)</option>
                                <option className="bg-gray-800" value="supplier_distribution">Распределение поставщиков (Пай)</option>
                                <option className="bg-gray-800" value="nomenclature_distribution">Топ номенклатур (Пай)</option>
                                <option className="bg-gray-800" value="defect_trends">Тренды дефектов (Линии)</option>
                                <option className="bg-gray-800" value="supplier_trends">Тренды поставщиков (Линии)</option>
                                <option className="bg-gray-800" value="total_dynamics">Общая динамика (Бар)</option>
                                <option className="bg-gray-800" value="cumulative_dynamics">Накопительный итог (Линия)</option>
                                <option className="bg-gray-800" value="claim_cause_distribution">Причины претензий (Полярная)</option>
                            </select>
                        </div>
                        <div className="flex-grow w-full min-h-0 relative flex items-center justify-center">
                             {comparativeChartConfig.type === 'bar' && <Bar data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                             {comparativeChartConfig.type === 'line' && <Line data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                             {comparativeChartConfig.type === 'doughnut' && <Doughnut data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                             {comparativeChartConfig.type === 'pie' && <Pie data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                             {comparativeChartConfig.type === 'polarArea' && <PolarArea data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                        </div>
                    </GlassCard>
                    )}
                </div>

                {/* Chart Top SKU */}
                <div key="chart_top_sku">
                    {topSKUsData && (
                    <GlassCard className="h-full p-8 relative flex flex-col">
                        <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                        </div>
                        <div className="mb-4 flex flex-col justify-between gap-2 pr-10">
                            <div>
                                <h3 className="text-xl font-bold text-white">Топ-10 проблемных SKU</h3>
                                <p className="text-gray-500 text-sm">Позиции номенклатуры с наибольшим числом инцидентов</p>
                            </div>
                            <select 
                                value={tileChartTypes['chart_top_sku'] || 'bar_horizontal'}
                                onChange={(e) => setTileChartTypes(prev => ({...prev, chart_top_sku: e.target.value}))}
                                className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                            >
                                <option className="bg-gray-800" value="bar_horizontal">Столбцы (Гориз.)</option>
                                <option className="bg-gray-800" value="bar_vertical">Столбцы (Верт.)</option>
                                <option className="bg-gray-800" value="doughnut">Пончик (Doughnut)</option>
                                <option className="bg-gray-800" value="pie">Пирог (Pie)</option>
                            </select>
                        </div>
                        <div className="flex-grow w-full min-h-0 relative flex items-center justify-center">
                            {(() => {
                                const chartType = tileChartTypes['chart_top_sku'] || 'bar_horizontal';
                                const isBar = chartType.includes('bar');
                                const colors = [
                                  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                                  '#FF9F40', '#E7E9ED', '#71B37C', '#E6A537', '#6F7F8F'
                                ];
                                
                                const data = {
                                    labels: topSKUsData.labels,
                                    datasets: isBar 
                                        ? topSKUsData.datasets 
                                        : [(topSKUsData as any).totalDataset]
                                };

                                const options = {
                                    indexAxis: chartType === 'bar_horizontal' ? 'y' as const : 'x' as const,
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    interaction: {
                                        mode: isBar ? 'index' : 'nearest',
                                        intersect: !isBar,
                                        axis: chartType === 'bar_horizontal' ? 'y' : 'x',
                                    },
                                    plugins: { 
                                        legend: { 
                                            display: true,
                                            position: (chartType === 'doughnut' || chartType === 'pie') ? 'right' as const : 'bottom' as const,
                                            labels: { color: '#fff' }
                                        },
                                        tooltip: { 
                                            mode: isBar ? 'index' : 'nearest',
                                            intersect: !isBar,
                                            backgroundColor: '#1e293b',
                                            titleColor: '#fff',
                                            bodyColor: '#93c5fd',
                                            borderColor: '#3b82f6',
                                            borderWidth: 1,
                                            padding: 12
                                        }
                                    },
                                    onClick: handleNomenclatureClick,
                                    scales: (chartType === 'doughnut' || chartType === 'pie') ? {
                                        x: { display: false },
                                        y: { display: false }
                                    } : {
                                        x: { 
                                            stacked: true,
                                            grid: { color: 'rgba(255,255,255,0.05)' },
                                            ticks: { color: '#9ca3af' }
                                        },
                                        y: { 
                                            stacked: true,
                                            grid: { display: false },
                                            ticks: { 
                                                color: '#e5e7eb',
                                                font: { size: 10 },
                                                callback: function(val: any) {
                                                    if (chartType === 'bar_horizontal') {
                                                        const label = this.getLabelForValue(val as number);
                                                        return label.length > 20 ? label.substr(0, 20) + '...' : label;
                                                    }
                                                    return val;
                                                }
                                            }
                                        }
                                    }
                                };

                                return (
                                    <>
                                        {(chartType === 'bar_horizontal' || chartType === 'bar_vertical') && <Bar data={data} options={options as any} />}
                                        {chartType === 'doughnut' && <Doughnut data={data} options={options as any} />}
                                        {chartType === 'pie' && <Pie data={data} options={options as any} />}
                                    </>
                                );
                            })()}
                        </div>
                    </GlassCard>
                    )}
                </div>

                {/* List Details */}
                <div key="list_details">
                     <GlassCard className="h-full p-6 relative flex flex-col">
                        <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-4 pr-12">
                            Детальный список записей 
                            {localFilter && <span className="text-sm font-normal text-gray-400 ml-2">(Отфильтровано: {localFilter.value})</span>}
                        </h3>
                        <div className="flex-grow min-h-0 overflow-hidden">
                            {isSplitView ? (
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 h-full`}>
                                    {uniqueMonths.map(month => (
                                    <div key={month} className="flex flex-col h-full overflow-hidden border border-white/10 rounded-lg p-2 bg-black/20">
                                        <h4 className="text-md font-bold text-blue-400 mb-2 text-center sticky top-0 bg-transparent z-10 py-1 border-b border-white/10">{month}</h4>
                                        <div className="overflow-y-auto flex-grow custom-scrollbar">
                                        <table className="w-full text-left text-sm text-gray-300">
                                            <thead className="text-xs uppercase bg-white/5 text-gray-400 sticky top-0 z-10 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-2 py-2">Номенклатура</th>
                                                <th className="px-2 py-2">Поставщик</th>
                                                <th className="px-2 py-2">Причина</th>
                                                <th className="px-2 py-2">Описание</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10">
                                            {tableData.filter(d => d.reportMonth === month).slice(0, 50).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setLocalFilter({ type: 'nomenclature', value: item.nomenclature })}>
                                                <td className="px-2 py-2 text-xs">{item.nomenclature}</td>
                                                <td className="px-2 py-2 text-xs hover:text-blue-400" onClick={(e) => { e.stopPropagation(); setLocalFilter({ type: 'supplier', value: item.supplier }); }}>{item.supplier}</td>
                                                <td className="px-2 py-2 text-xs">{item.claimReason}</td>
                                                <td className="px-2 py-2 text-xs truncate max-w-[150px] hover:text-blue-400" title={item.defectDescription} onClick={(e) => { e.stopPropagation(); setLocalFilter({ type: 'description', value: item.defectDescription }); }}>{item.defectDescription}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="overflow-x-auto h-full">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="text-xs uppercase bg-white/5 text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">Месяц</th>
                                        <th className="px-4 py-3">Номенклатура</th>
                                        <th className="px-4 py-3">Поставщик</th>
                                        <th className="px-4 py-3">Причина претензии</th>
                                        <th className="px-4 py-3">Описание дефекта</th>
                                        <th className="px-4 py-3 text-right">Кол-во</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                    {tableData.slice(0, 100).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setLocalFilter({ type: 'nomenclature', value: item.nomenclature })}>
                                        <td className="px-4 py-3">{item.reportMonth}</td>
                                        <td className="px-4 py-3">{item.nomenclature}</td>
                                        <td className="px-4 py-3 hover:text-blue-400" onClick={(e) => { e.stopPropagation(); setLocalFilter({ type: 'supplier', value: item.supplier }); }}>{item.supplier}</td>
                                        <td className="px-4 py-3">{item.claimReason}</td>
                                        <td className="px-4 py-3 max-w-md truncate hover:text-blue-400" title={item.defectDescription} onClick={(e) => { e.stopPropagation(); setLocalFilter({ type: 'description', value: item.defectDescription }); }}>{item.defectDescription}</td>
                                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {tableData.length > 100 && (
                                    <div className="text-center mt-4 text-gray-500 text-xs">
                                    Показаны первые 100 записей из {tableData.length}
                                    </div>
                                )}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </ResponsiveGridLayout>

            <ActionLogOverlay />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-ios-dark-blue p-4 md:p-8 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
            <IOSButton onClick={handleBack} variant="secondary">
            <ArrowLeft size={18} /> Назад
            </IOSButton>
            <div>
            <h1 className="text-2xl font-bold text-white">
                {type === 'supplier' ? 'Анализ поставщика' : type === 'description' ? 'Анализ дефекта' : 'Анализ причины'}
            </h1>
            <p className="text-gray-400">{value}</p>
            </div>
        </div>
        
        <div className="flex items-center space-x-4">
            {/* Active Filter Indicator */}
            {localFilter && (
                <div className="flex items-center bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full border border-blue-500/30">
                    <span className="mr-2 text-sm">Фильтр: {localFilter.value}</span>
                    <button onClick={() => setLocalFilter(null)} className="hover:text-white transition-colors">
                        <XCircle size={16} />
                    </button>
                </div>
            )}
            
            <IOSButton 
                onClick={handleReset} 
                variant="secondary" 
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
            >
                <RotateCcw size={18} className="mr-2" /> Сброс
            </IOSButton>
            
            <IOSButton 
                onClick={handleSalesButtonClick} 
                variant="primary" 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                disabled={isUploading}
            >
                {isUploading ? 'Загрузка...' : 'Продажи МП'}
            </IOSButton>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".xlsx,.csv,.txt"
            />
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
            localStorage.setItem(DETAILS_LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
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
        {isOzonYandex && (
          <div key="breakdown_description_ozon" className="h-full">
            <GlassCard className="h-full p-6 relative flex flex-col">
              <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
              </div>
              <div className="mb-4 flex flex-col justify-between gap-2 pr-10">
                <h3 className="text-lg font-bold text-white mb-1">
                  Структура по описанию (из общего объема)
                </h3>
                <div className="flex items-center gap-2">
                  <select 
                    value={tileChartTypes['breakdown_description_ozon'] || 'doughnut'}
                    onChange={(e) => setTileChartTypes(prev => ({...prev, breakdown_description_ozon: e.target.value}))}
                    className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                  >
                    <option className="bg-gray-800" value="doughnut">Пончик (Doughnut)</option>
                    <option className="bg-gray-800" value="pie">Пирог (Pie)</option>
                    <option className="bg-gray-800" value="bar">Столбцы (Bar)</option>
                    <option className="bg-gray-800" value="polarArea">Полярная (PolarArea)</option>
                  </select>
                </div>
              </div>
              <div className="flex-grow min-h-0 flex justify-center w-full relative">
                {(() => {
                  const chartType = tileChartTypes['breakdown_description_ozon'] || 'doughnut';
                  const data = descriptionBreakdown;
                  
                  if (!data.labels || data.labels.length === 0) {
                    return <div className="flex items-center justify-center h-full text-gray-500">Нет данных</div>;
                  }

                  const options = {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: handleDescriptionClick,
                    indexAxis: chartType === 'bar' ? 'y' as const : 'x' as const,
                    plugins: { 
                      legend: { 
                        position: chartType === 'bar' ? 'bottom' as const : 'right' as const, 
                        labels: { 
                          color: '#fff', 
                          boxWidth: 10, 
                          font: { size: 10 },
                          callback: (text: string) => text.length > 20 ? text.substring(0, 20) + '...' : text
                        } 
                      },
                      tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} шт.` } }
                    },
                    scales: chartType === 'bar' ? {
                      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                      y: { 
                        ticks: { 
                          color: '#fff',
                          callback: function(val: any) {
                            const label = this.getLabelForValue(val as number);
                            return label.length > 20 ? label.substring(0, 20) + '...' : label;
                          }
                        }, 
                        grid: { display: false } 
                      }
                    } : {
                      x: { display: false },
                      y: { display: false }
                    }
                  };

                  return (
                    <React.Fragment key={`${chartType}-${JSON.stringify(localFilter)}`}>
                      {chartType === 'doughnut' && <Doughnut data={data} options={options as any} />}
                      {chartType === 'pie' && <Pie data={data} options={options as any} />}
                      {chartType === 'bar' && <Bar data={data} options={options as any} />}
                      {chartType === 'polarArea' && <PolarArea data={data} options={options as any} />}
                    </React.Fragment>
                  );
                })()}
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">Нажмите на сегмент для детализации</p>
            </GlassCard>
          </div>
        )}

        {/* Sales Stats Tile (Always visible if data exists) */}
        {Object.entries(salesStats).length > 0 && (
          <div key="sales_stats">
              <GlassCard className="h-full p-6 flex flex-col justify-between relative">
                  <div className="tile-drag-handle absolute top-2 right-2 z-10 p-1 rounded bg-white/5 hover:bg-white/10 cursor-grab">
                      <GripVertical size={14} className="text-gray-400" />
                  </div>
                  <div className="flex items-start justify-between">
                       <div>
                           <p className="text-xs uppercase text-gray-400 font-bold mb-1">ПРОДАЖИ ПО МЕСЯЦАМ</p>
                           <div className="flex flex-wrap gap-4 mt-2">
                               {Object.entries(salesStats).map(([month, qty]) => (
                                   <div key={month} className="flex flex-col">
                                       <span className="text-xs text-gray-400 font-medium">{month}</span>
                                       <span className="text-2xl font-bold text-white">{qty.toLocaleString()} шт.</span>
                                   </div>
                               ))}
                           </div>
                       </div>
                       <div className="text-blue-400">
                          <TrendingUp size={32} strokeWidth={1.5} />
                       </div>
                  </div>
                  <p className="text-sm text-gray-500">Объем продаж за активные месяцы</p>
              </GlassCard>
          </div>
        )}

      {/* Row 1: Comparative Dynamics (Always visible) */}
      <div key="comparison" className="h-full">
      {comparativeChartConfig && (
      <GlassCard className="h-full p-6 relative flex flex-col">
          <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </div>
          <div className="mb-4 flex flex-col justify-between gap-2">
            <div>
                <h3 className="text-lg font-bold text-white mb-1">
                    Сравнительный анализ (показатель качества)
                </h3>
                <p className="text-gray-500 text-sm">Выберите тип диаграммы</p>
            </div>
            <div className="flex items-center gap-2">
                {(tileChartTypes['comparison'] === 'period_comparison' || tileChartTypes['comparison'] === 'period_comparison_horizontal') && (
                    <IOSButton 
                        onClick={toggleShowAllComparison}
                        className={`!py-1 !px-2 text-xs transition-all duration-300 ${isExpanding ? 'scale-95 opacity-80' : ''}`}
                        variant={showAllComparison ? "primary" : "secondary"}
                    >
                        {showAllComparison ? 'Свернуть' : 'Показать всех'}
                    </IOSButton>
                )}
                <select 
                    value={tileChartTypes['comparison'] || 'defect_dynamics'}
                    onChange={(e) => setTileChartTypes(prev => ({...prev, comparison: e.target.value}))}
                    className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                >
                    <option className="bg-gray-800" value="defect_dynamics">Динамика дефектов (Стек)</option>
                    <option className="bg-gray-800" value="supplier_dynamics">Динамика поставщиков (Стек)</option>
                    <option className="bg-gray-800" value="period_comparison">Сравнение периодов (Рядом)</option>
                    <option className="bg-gray-800" value="period_comparison_horizontal">Сравнение периодов (Горизонт)</option>
                    <option className="bg-gray-800" value="defect_distribution">Распределение дефектов (Пай)</option>
                    <option className="bg-gray-800" value="supplier_distribution">Распределение поставщиков (Пай)</option>
                    <option className="bg-gray-800" value="nomenclature_distribution">Топ номенклатур (Пай)</option>
                    <option className="bg-gray-800" value="defect_trends">Тренды дефектов (Линии)</option>
                    <option className="bg-gray-800" value="supplier_trends">Тренды поставщиков (Линии)</option>
                    <option className="bg-gray-800" value="total_dynamics">Общая динамика (Бар)</option>
                    <option className="bg-gray-800" value="cumulative_dynamics">Накопительный итог (Линия)</option>
                    <option className="bg-gray-800" value="claim_cause_distribution">Причины претензий (Полярная)</option>
                </select>
            </div>
          </div>
          <div className="flex-grow min-h-0 relative flex items-center justify-center">
              {(() => {
                const chartType = tileChartTypes['comparison'] || 'defect_dynamics';
                const chartKey = `${chartType}-${showAllComparison}-${JSON.stringify(localFilter)}`;
                return (
                  <React.Fragment key={chartKey}>
                    {comparativeChartConfig.type === 'bar' && <Bar data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                    {comparativeChartConfig.type === 'line' && <Line data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                    {comparativeChartConfig.type === 'doughnut' && <Doughnut data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                    {comparativeChartConfig.type === 'pie' && <Pie data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                    {comparativeChartConfig.type === 'polarArea' && <PolarArea data={comparativeChartConfig.data} options={{...comparativeChartConfig.options, onClick: handleComparativeChartClick} as any} />}
                  </React.Fragment>
                );
              })()}
           </div>
      </GlassCard>
      )}
      </div>

      {/* Row 2: Breakdown Charts */}
        {/* Left Chart: Defect Descriptions (Hide for Ozon/Yandex) */}
        {!isOzonYandex && (
          <div key="breakdown_left" className="h-full">
          <GlassCard className="h-full p-6 relative flex flex-col">
            <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
              <GripVertical size={16} />
            </div>
            <div className="mb-4 flex flex-col justify-between gap-2 pr-10">
              <h3 className="text-lg font-bold text-white mb-1">
                  {type === 'supplier' ? 'Топ-10 дефектов (Нормализовано)' : 
                   type === 'description' ? 'Виновники (Поставщики)' :
                   type === 'group' ? 'Топ-10 дефектов' :
                   'Структура дефектов (По описанию)'}
              </h3>
              <select 
                  value={tileChartTypes['breakdown_left'] || 'doughnut'}
                  onChange={(e) => setTileChartTypes(prev => ({...prev, breakdown_left: e.target.value}))}
                  className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
              >
                  <option className="bg-gray-800" value="doughnut">Пончик (Doughnut)</option>
                  <option className="bg-gray-800" value="pie">Пирог (Pie)</option>
                  <option className="bg-gray-800" value="bar">Столбцы (Bar)</option>
                  <option className="bg-gray-800" value="polarArea">Полярная (PolarArea)</option>
              </select>
            </div>
            <div className="flex-grow min-h-0 flex justify-center w-full relative">
              {(() => {
                  const chartType = tileChartTypes['breakdown_left'] || 'doughnut';
                  const isDescription = type === 'description';
                  const data = isDescription ? supplierBreakdown : descriptionBreakdown;
                  const clickHandler = isDescription ? handleSupplierClick : handleDescriptionClick;
                  
                  if (!data.labels || data.labels.length === 0) {
                      return <div className="flex items-center justify-center h-full text-gray-500">Нет данных</div>;
                  }

                  const options = {
                      responsive: true,
                      maintainAspectRatio: false,
                      onClick: clickHandler,
                      indexAxis: chartType === 'bar' ? 'y' as const : 'x' as const,
                      plugins: { 
                          legend: { position: chartType === 'bar' ? 'bottom' as const : 'right' as const, labels: { color: '#fff', boxWidth: 10, font: { size: 10 } } },
                          tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} шт.` } }
                      },
                      scales: chartType === 'bar' ? {
                          x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                          y: { ticks: { color: '#fff' }, grid: { display: false } }
                      } : {
                          x: { display: false },
                          y: { display: false }
                      }
                  };

                  return (
                    <React.Fragment key={`${chartType}-${JSON.stringify(localFilter)}`}>
                      {chartType === 'doughnut' && <Doughnut data={data} options={options as any} />}
                      {chartType === 'pie' && <Pie data={data} options={options as any} />}
                      {chartType === 'bar' && <Bar data={data} options={options as any} />}
                      {chartType === 'polarArea' && <PolarArea data={data} options={options as any} />}
                    </React.Fragment>
                  );
              })()}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">Нажмите на сегмент для фильтрации списка</p>
          </GlassCard>
          </div>
        )}

        {/* Right Chart: Suppliers or Extra Info (Hide for Ozon/Yandex) */}
        {/* For 'reason', show Suppliers. For 'description', maybe show nothing or Nomenclature? */}
        {!isOzonYandex && (type === 'reason' || type === 'description') && (
            <div key="breakdown_right" className="h-full">
            <GlassCard className="h-full p-6 relative flex flex-col">
            <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
            </div>
            <div className="mb-4 flex flex-col justify-between gap-2 pr-10">
                <h3 className="text-lg font-bold text-white mb-1">
                    {type === 'description' ? 'Топ Номенклатур' : 'Виновники (Топ Поставщиков)'}
                </h3>
                <select 
                    value={tileChartTypes['breakdown_right'] || 'doughnut'}
                    onChange={(e) => setTileChartTypes(prev => ({...prev, breakdown_right: e.target.value}))}
                    className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                >
                    <option className="bg-gray-800" value="doughnut">Пончик (Doughnut)</option>
                    <option className="bg-gray-800" value="pie">Пирог (Pie)</option>
                    <option className="bg-gray-800" value="bar">Столбцы (Bar)</option>
                    <option className="bg-gray-800" value="polarArea">Полярная (PolarArea)</option>
                </select>
            </div>
            <div className="flex-grow min-h-0 flex justify-center w-full relative">
                {(() => {
                    const chartType = tileChartTypes['breakdown_right'] || 'doughnut';
                    const data = type === 'description' ? nomenclatureBreakdown : supplierBreakdown;
                    const clickHandler = type === 'description' ? handleNomenclatureClick : handleSupplierClick;
                    
                    if (!data.labels || data.labels.length === 0) {
                        return <div className="flex items-center justify-center h-full text-gray-500">Нет данных</div>;
                    }

                    const options = {
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: clickHandler,
                        indexAxis: chartType === 'bar' ? 'y' as const : 'x' as const,
                        plugins: { 
                            legend: { position: chartType === 'bar' ? 'bottom' as const : 'right' as const, labels: { color: '#fff', boxWidth: 10, font: { size: 10 } } },
                            tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} шт.` } }
                        },
                        scales: chartType === 'bar' ? {
                            x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                            y: { ticks: { color: '#fff' }, grid: { display: false } }
                        } : {
                            x: { display: false },
                            y: { display: false }
                        }
                    };

                    return (
                      <React.Fragment key={`${chartType}-${JSON.stringify(localFilter)}`}>
                        {chartType === 'doughnut' && <Doughnut data={data} options={options as any} />}
                        {chartType === 'pie' && <Pie data={data} options={options as any} />}
                        {chartType === 'bar' && <Bar data={data} options={options as any} />}
                        {chartType === 'polarArea' && <PolarArea data={data} options={options as any} />}
                      </React.Fragment>
                    );
                })()}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">Нажмите на сегмент для фильтрации списка</p>
            </GlassCard>
            </div>
        )}

      {/* Row 3: Detailed List */}
      <div key="table" className="h-full">
      <GlassCard className="h-full p-6 relative flex flex-col">
        <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
        </div>
        <h3 className="text-lg font-bold text-white mb-4 pr-12">
            Детальный список записей 
            {localFilter && <span className="text-sm font-normal text-gray-400 ml-2">(Отфильтровано: {localFilter.value})</span>}
        </h3>
        <div className="overflow-x-auto flex-grow min-h-0">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">Месяц</th>
                <th className="px-4 py-3">Номенклатура</th>
                <th className="px-4 py-3">Поставщик</th>
                <th className="px-4 py-3">Описание дефекта</th>
                <th className="px-4 py-3 text-right">Кол-во</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {tableData.slice(0, showAllRecords ? undefined : 100).map((item, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setLocalFilter({ type: 'nomenclature', value: item.nomenclature })}>
                  <td className="px-4 py-3">{item.reportMonth}</td>
                  <td className="px-4 py-3">{item.nomenclature}</td>
                  <td className="px-4 py-3 hover:text-blue-400" onClick={(e) => { e.stopPropagation(); setLocalFilter({ type: 'supplier', value: item.supplier }); }}>{item.supplier}</td>
                  <td className="px-4 py-3 max-w-md truncate hover:text-blue-400" title={item.defectDescription} onClick={(e) => { e.stopPropagation(); setLocalFilter({ type: 'description', value: item.defectDescription }); }}>{item.defectDescription}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableData.length > 100 && (
            <div className="text-center mt-4 flex flex-col items-center gap-2">
              <span className="text-gray-500 text-xs">
                Показаны {showAllRecords ? tableData.length : 100} записей из {tableData.length}
              </span>
              {!showAllRecords && (
                <button 
                    onClick={() => setShowAllRecords(true)}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs rounded-lg transition-colors border border-blue-500/30"
                >
                    Показать все записи
                </button>
              )}
            </div>
          )}
           {tableData.length === 0 && (
            <div className="text-center mt-8 text-gray-500">
              Нет записей, соответствующих выбранным фильтрам.
            </div>
          )}
        </div>
      </GlassCard>
      </div>
      </ResponsiveGridLayout>

      <ActionLogOverlay />
    </div>
  );
};
