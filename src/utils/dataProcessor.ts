import * as XLSX from 'xlsx';
import { DefectRecord, ParetoItem, RawDataRow, SupplierKPI, ReportData, SalesRecord } from '../types/data.types';

export const parseFile = (file: File): Promise<ReportData> => {
  console.log("PROCESSOR: Starting parseFile for", file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        console.log("PROCESSOR: File read as array buffer, size:", data instanceof ArrayBuffer ? data.byteLength : 'N/A');
        
        // Force UTF-8 (65001) to handle Cyrillic correctly in CSVs/TXT without BOM
        // Use codepage 1251 for Cyrillic CSVs if they are not UTF-8
        let workbook;
        try {
            // Try to read with UTF-8 first
            workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
            
            // Simple heuristic to check if encoding is wrong (lots of replacement characters or nonsense)
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const csvContent = XLSX.utils.sheet_to_csv(firstSheet);
            if (csvContent.includes('�') || /[^а-яёА-ЯЁa-zA-Z0-9\s.,;:"'()!?-]/.test(csvContent.slice(0, 100))) {
                console.log("PROCESSOR: Potential encoding issue with UTF-8, trying Windows-1251...");
                workbook = XLSX.read(data, { type: 'array', codepage: 1251 });
            }
        } catch (e) {
            console.log("PROCESSOR: UTF-8 read failed, falling back to Windows-1251");
            workbook = XLSX.read(data, { type: 'array', codepage: 1251 });
        }
        
        console.log("PROCESSOR: XLSX workbook read, sheets:", workbook.SheetNames);
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Use header: 1 to get raw array first to find the header row
        let rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        console.log("PROCESSOR: Raw rows count:", rawRows.length);
        
        // Handle case where TXT/CSV might be parsed into a single column due to wrong delimiter
        if (rawRows.length > 0 && rawRows[0].length === 1 && typeof rawRows[0][0] === 'string') {
             console.log("PROCESSOR: Single column detected, attempting delimiter detection...");
             // Try to detect delimiter
             const firstRow = rawRows[0][0];
             let delimiter = ',';
             if (firstRow.includes('\t')) delimiter = '\t';
             else if (firstRow.includes(';')) delimiter = ';';
             
             console.log("PROCESSOR: Detected delimiter:", delimiter === '\t' ? 'TAB' : delimiter);

             if (delimiter !== ',') {
                 // Re-parse manually if SheetJS didn't split it
                 rawRows = rawRows.map(row => {
                     if (row.length === 1 && typeof row[0] === 'string') {
                         return row[0].split(delimiter);
                     }
                     return row;
                 });
                 console.log("PROCESSOR: Manually split rows, first row now has length:", rawRows[0].length);
             }
        }

        // Find the header row index (looking for 'Номенклатура' or 'Дата накладной')
        const headerRowIndex = rawRows.findIndex((row, idx) => {
            if (idx > 20) return false; // Limit search
            return row && row.some(cell => {
                if (!cell) return false;
                const str = String(cell).trim().replace(/^\uFEFF/, '');
                const lower = str.toLowerCase();
                return lower.includes('номенклатура') || lower.includes('дата накладной');
            });
        });
        
        if (headerRowIndex === -1) {
            console.error('PROCESSOR: Header row not found. Available rows sample:', rawRows.slice(0, 5));
            throw new Error('Не найдена строка заголовка с "Номенклатура" или "Дата накладной". Проверьте файл.');
        }
        console.log("PROCESSOR: Header row found at index:", headerRowIndex);

        // Extract headers from the found row
        const headers = rawRows[headerRowIndex].map(cell => String(cell).trim().replace(/^\uFEFF/, ''));
        console.log("PROCESSOR: Headers extracted:", headers);

        // Parse data rows manually
        const jsonData: RawDataRow[] = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;
            
            const rowObj: Record<string, unknown> = {};
            headers.forEach((header, index) => {
                if (index < row.length) {
                    rowObj[header] = row[index];
                }
            });
            jsonData.push(rowObj as unknown as RawDataRow);
        }
        console.log("PROCESSOR: Parsed JSON data count:", jsonData.length);
    
        // Normalize keys (remove newlines, trim)
        const normalizedJsonData: RawDataRow[] = jsonData.map(row => {
            const newRow: Record<string, unknown> = {};
            Object.keys(row).forEach((key) => {
                const normalizedKey = key.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
                newRow[normalizedKey] = (row as Record<string, unknown>)[key];
            });
            return newRow as RawDataRow;
        });

        const reportMonth = extractMonth(file.name);
        console.log("PROCESSOR: Extracted month:", reportMonth);

        const normalizedData = normalizeData(normalizedJsonData, reportMonth);
        console.log("PROCESSOR: Normalized records count:", normalizedData.length);
        
        // Extract sales data if it's a sales file
        const salesData = extractSalesData(normalizedJsonData, reportMonth, file.name);
        if (salesData.length > 0) {
            console.log("PROCESSOR: Extracted sales records count:", salesData.length);
        }

        resolve({
          records: normalizedData,
          sales: salesData,
          fileName: file.name,
          reportMonth: reportMonth
        });
      } catch (error) {
        console.error("PROCESSOR: Error during file parsing:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
        console.error("PROCESSOR: FileReader error:", error);
        reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};

const extractMonth = (fileName: string): string => {
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const monthsLower = months.map(m => m.toLowerCase());
  const englishMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  
  const lower = fileName.toLowerCase();
  
  // Try to find month and year in the filename
  let year = new Date().getFullYear().toString();
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // Check for month name in Russian
  for (let i = 0; i < monthsLower.length; i++) {
    const m = monthsLower[i];
    if (lower.includes(m)) return `${months[i]} ${year}`;
  }
  
  // Check for month name in English
  for (let i = 0; i < englishMonths.length; i++) {
    const m = englishMonths[i];
    if (lower.includes(m)) return `${months[i]} ${year}`;
  }
  
  // Try to find date pattern like 01.11 or 11.2024 or 01.11.2024
  const dateMatch = lower.match(/(\d{2})[./](\d{2})([./](\d{4}))?/);
  if (dateMatch) {
    const monthNum = parseInt(dateMatch[2]);
    const matchedYear = dateMatch[4] || year;
    if (monthNum >= 1 && monthNum <= 12) {
      return `${months[monthNum - 1]} ${matchedYear}`;
    }
  }
  
  // Fallback to filename (without extension) if no month found
  return fileName.replace(/\.[^/.]+$/, "");
};

const extractSalesData = (rawData: RawDataRow[], reportMonth: string, fileName: string): SalesRecord[] => {
    // Detect if this is a sales file based on "Дата накладной" or specific MP format
    const hasDateColumn = rawData.length > 0 && Object.keys(rawData[0]).some(k => k.includes('Дата накладной'));
    
    // MP Sales specific detection: check if any column contains date-like string and file has nomenclature
    const isMPSales = !hasDateColumn && rawData.length > 0 && rawData.some(row => {
        return Object.values(row).some(v => /\d{2}\.\d{2}\.\d{4}/.test(String(v)));
    }) && rawData.some(row => {
        return Object.keys(row).some(k => k.toLowerCase().includes('номенклатура') || k.toLowerCase().includes('название услуги') || k.toLowerCase().includes('товар'));
    });

    if (!hasDateColumn && !isMPSales) return [];

    const salesRecords: SalesRecord[] = [];
    
    rawData.forEach(row => {
        // "1 строка = 1 штука" rule for marketplace sales files as requested by user
        let qty = 1;

        const nomenclature = String(row['Список товаров или название услуги'] || row['Номенклатура'] || row['Товар'] || '');
        
        // Try multiple supplier/marketplace column names
        let supplier = String(row['Контрагент'] || row['Поставщик'] || row['Маркетплейс'] || 'Неизвестно');
        
        // Map marketplace names to standard categories
        const lowerSupplier = supplier.toLowerCase();
        const lowerFileName = fileName.toLowerCase();
        
        if (lowerSupplier.includes('интернет решения') || lowerSupplier.includes('ozon') || lowerFileName.includes('ozon')) {
            supplier = 'Озон';
        } else if (lowerSupplier.includes('яндекс') || lowerSupplier.includes('yandex') || lowerFileName.includes('yandex')) {
            supplier = 'Яндекс';
        } else if (lowerSupplier.includes('вайлдберриз') || lowerSupplier.includes('wildberries') || lowerSupplier.includes('рвб') || lowerFileName.includes('wb')) {
            supplier = 'Вайлдберриз';
        }
        
        // Use the actual date from the file if available, or fallback to reportMonth
        let month = reportMonth;
        
        // Search for date in any column
        const dateVal = row['Дата накладной'] || Object.values(row).find(v => /\d{2}\.\d{2}\.\d{4}/.test(String(v)));
        
        if (dateVal) {
            const dateStr = String(dateVal);
            const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (match) {
                const m = parseInt(match[2]);
                const y = match[3];
                const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                // Format: "Month Year" for consistent display
                month = `${months[m-1]} ${y}`;
            }
        }
        
        if (nomenclature && nomenclature !== 'undefined' && nomenclature.trim() !== '' && nomenclature !== 'Товар' && nomenclature !== 'Номенклатура') {
            salesRecords.push({
                month: month,
                quantity: qty,
                fileName: fileName,
                nomenclature: nomenclature,
                supplier: supplier
            });
        }
    });
    
    return salesRecords;
};

export const normalizeData = (rawData: RawDataRow[], reportMonth: string): DefectRecord[] => {
  return rawData.map((row, index) => {
    let claimReason = String(row['Причина претензии'] || 'Другое').trim().replace(/\s+/g, ' ');
    let originalClaimReason = claimReason;
    
    // Homoglyph normalization helper
    const normalizeHomoglyphs = (str: string) => {
        return str
            .replace(/a/g, 'а')
            .replace(/c/g, 'с')
            .replace(/e/g, 'е')
            .replace(/o/g, 'о')
            .replace(/p/g, 'р')
            .replace(/x/g, 'х')
            .replace(/y/g, 'у')
            .replace(/k/g, 'к');
    };

    // Normalization logic: Group specific defects into 'Заводской брак' and normalize sub-reasons
    const lowerReason = normalizeHomoglyphs(claimReason.toLowerCase());
    
    const FACTORY_DEFECT = 'Заводской брак';

    // Check for variations
    if (lowerReason.includes('заводской брак') || 
        lowerReason.includes('чечь') || 
        lowerReason.includes('течь') || 
        lowerReason.includes('арматур') || 
        lowerReason.includes('сиден') || 
        lowerReason.includes('мастер') || 
        (lowerReason.includes('отк') && !lowerReason.includes('не товарный'))) {
        
        claimReason = FACTORY_DEFECT;
        
        // Determine sub-reason (original reason)
        if (lowerReason.includes('чечь') || lowerReason.includes('течь')) {
            originalClaimReason = 'Течь';
        } else if (lowerReason.includes('арматур')) {
            originalClaimReason = 'Брак арматуры';
        } else if (lowerReason.includes('сиден')) {
            originalClaimReason = 'Брак сиденья';
        } else if (lowerReason.includes('мастер') || lowerReason.includes('отк')) {
             originalClaimReason = 'Дефект мастера ОТК';
        } else {
             // It was already factory defect, keep it as 'Заводской брак' (or the original string if we want detail)
             // User wants to merge "two columns". 
             // If we have "Заводской брак" and "Заводской брак (механика)", they are now both claimReason = FACTORY_DEFECT.
             // Breakdown will show "Заводской брак" and "Заводской брак (механика)".
             originalClaimReason = 'Заводской брак';
        }
    }

    return {
      id: String(row['Персональный номер'] || `row-${index}`),
      nomenclature: String(row['Номенклатура'] || 'Неизвестно'),
      personalNumber: String(row['Персональный номер'] || ''),
      claimReason,
      originalClaimReason,
      defectDescription: String(row['Описание дефекта'] || ''),
      supplier: String(row['Поставщик'] || 'Неизвестно'),
    responsibility: String(row['Ответственность за брак'] || ''),
    warehouse: String(row['Склад обнаружения'] || ''),
    defectType: String(row['Вид дефекта'] || ''),
    date: new Date().toISOString(), // Placeholder
    reportMonth: reportMonth,
    quantity: 1,
  };
  }).filter(item => 
    item.nomenclature && 
    item.nomenclature !== 'Номенклатура' && 
    // Filter out completely empty rows where defaults were applied
    !(item.nomenclature === 'Неизвестно' && item.supplier === 'Неизвестно' && item.claimReason === 'Другое')
  );
};

export const calculatePareto = (data: DefectRecord[]): ParetoItem[] => {
  const reasonCounts: Record<string, number> = {};
  const breakdowns: Record<string, Record<string, number>> = {};
  
  data.forEach(item => {
    const reason = item.claimReason;
    reasonCounts[reason] = (reasonCounts[reason] || 0) + item.quantity;

    if (!breakdowns[reason]) breakdowns[reason] = {};
    const subReason = item.originalClaimReason || reason;
    // Only track breakdown if it differs from the main reason (avoid redundant single-item breakdown)
    // Actually, for "Заводской брак" we want to see sub-reasons even if one of them is "Заводской брак"
    breakdowns[reason][subReason] = (breakdowns[reason][subReason] || 0) + item.quantity;
  });

  const sortedReasons = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([reason, count]) => ({ reason, count }));

  const total = sortedReasons.reduce((sum, item) => sum + item.count, 0);
  let cumulative = 0;

  return sortedReasons.map(item => {
    const percentage = (item.count / total) * 100;
    cumulative += percentage;
    return {
      reason: item.reason,
      count: item.count,
      percentage: Number(percentage.toFixed(2)),
      cumulativePercentage: Number(cumulative.toFixed(2)),
      breakdown: breakdowns[item.reason],
    };
  });
};

export const calculateKPI = (data: DefectRecord[]): SupplierKPI[] => {
  const supplierCounts: Record<string, number> = {};
  
  data.forEach(item => {
    const supplier = item.supplier;
    supplierCounts[supplier] = (supplierCounts[supplier] || 0) + item.quantity;
  });

  const total = data.length;
  
  return Object.entries(supplierCounts)
    .map(([supplier, count]) => ({
      supplier,
      totalDefects: count,
      defectPercentage: Number(((count / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.totalDefects - a.totalDefects);
};
