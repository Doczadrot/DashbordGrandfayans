import * as XLSX from 'xlsx';
import { WriteOffFile, WriteOffGroup, WriteOffItem } from '../types/writeoff.types';

const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const parseWriteOffFile = async (file: File): Promise<WriteOffFile> => {
    const buffer = await file.arrayBuffer();
    let wb: XLSX.WorkBook;

    // Check if CSV and try to detect encoding
    if (file.name.toLowerCase().endsWith('.csv')) {
        try {
            // Try UTF-8 first (most common for modern systems and the file provided)
            const utf8Decoder = new TextDecoder('utf-8');
            const textUtf8 = utf8Decoder.decode(buffer);

            // Heuristic: Check for common Russian keywords
            // If UTF-8 decoding is correct, we should see these words.
            if (textUtf8.includes('Причина') || textUtf8.includes('Период') || textUtf8.includes('Количество') || textUtf8.includes('Номенклатура')) {
                 wb = XLSX.read(textUtf8, { type: 'string' });
            } else {
                 // If not found, try Windows-1251 (Cyrillic legacy)
                 const win1251Decoder = new TextDecoder('windows-1251');
                 const text1251 = win1251Decoder.decode(buffer);
                 wb = XLSX.read(text1251, { type: 'string' });
            }
        } catch (e) {
            console.warn('Failed to decode CSV, falling back to default array read', e);
            wb = XLSX.read(buffer, { type: 'array' });
        }
    } else {
        wb = XLSX.read(buffer, { type: 'array' });
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

    // 1. Extract Period
    let period = 'Неизвестный период';
    for (let i = 0; i < 5; i++) {
        const row = data[i];
        if (!row) continue;
        // Search in first few columns for "Период"
        for (let j = 0; j < 5; j++) {
            if (row[j] && typeof row[j] === 'string' && String(row[j]).toLowerCase().includes('период')) {
                 period = String(row[j]).replace(/.*период[:.]?/i, '').replace(/[:]/g, '').trim();
                 break;
            }
        }
        if (period !== 'Неизвестный период') break;
    }
    
    // Fallback: guess from filename if not found in cells
    if (period === 'Неизвестный период') {
        const match = file.name.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (match) {
             period = match[0]; 
        } else {
             period = file.name.replace('.xlsx', '').replace('.csv', '');
        }
    }

    // 2. Find Data Start
    let headerRowIndex = -1;
    // Scan first 20 rows for main header
    for (let i = 0; i < 20; i++) {
        const row = data[i];
        if (!row) continue;
        const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
        
        // Look for key headers: "Причина списания" (Col A), "Источник дефекта" (Col E), "Причина претензии" (Col F)
        if (rowStr.includes('причина списания') && rowStr.includes('источник дефекта')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        // Fallback: try to find "Номенклатура" and "Количество"
        for (let i = 0; i < 20; i++) {
             const row = data[i];
             if (!row) continue;
             const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
             if (rowStr.includes('номенклатура') && rowStr.includes('количество')) {
                 headerRowIndex = i - 1; // Assume main header is above or this is the header
                 break;
             }
        }
    }
    
    if (headerRowIndex === -1) {
        throw new Error('Не удалось найти заголовки таблицы. Проверьте, что файл содержит столбцы "Причина списания", "Источник дефекта" или "Номенклатура", "Количество".');
    }
    
    // Data typically starts 2 rows after the main header (header row + sub-header row)
    // Or just 1 row if no sub-header. Based on debug output: Row 3 is Header, Row 5 is Data.
    const dataStartIndex = headerRowIndex !== -1 ? headerRowIndex + 2 : 5;

    // 3. Parse Header to find Column Indices
    const headerRow = headerRowIndex !== -1 ? data[headerRowIndex].map(c => String(c).toLowerCase().trim()) : [];
    
    const mapping = {
        colA: 0, // Default to 0
        colE: 4, // Default to 4
        colF: 5, // Default to 5
        colG: 6, // Default to 6
        colH: 7, // Default to 7
        colI: 8, // Default to 8
        colK: 10 // Default to 10
    };

    if (headerRow.length > 0) {
        headerRow.forEach((val, idx) => {
            // 1. Column A: Reason / Nomenclature
            // Prioritize "Причина списания"
            if (val.includes('причина списания')) {
                mapping.colA = idx;
            } 
            // Only map "Номенклатура" to Col A if it's NOT the combined "Номенклатура.Поставщик" column
            else if (val.includes('номенклатура') && !val.includes('поставщик')) {
                mapping.colA = idx;
            }

            // 2. Other Columns
            if (val.includes('источник дефекта')) mapping.colE = idx;
            
            if (val.includes('причина претензии') || val.includes('причина при проверке отк')) mapping.colF = idx;
            
            if (val.includes('поставщик')) mapping.colG = idx;
            
            if (val === 'количество') mapping.colH = idx;
            
            if (val.includes('себестоимость') || val.includes('сумма')) mapping.colI = idx;
            
            if (val.includes('персональный номер')) mapping.colK = idx;
        });
    }

    // 4. Parse Data
    const items: WriteOffItem[] = [];
    
    // Context state for hierarchical parsing
    let currentContext = {
        docReason: '',      // Col A (0) from Group
        defectSource: '',   // Col E (4) from Group
        reason: '',         // Col F (5) from Group ("Бой ОЗОН" etc)
        supplier: ''        // Col G (6) from Group
    };

    // Helper to clean string
    const cleanStr = (val: any) => String(val || '').trim();
    // Helper to parse number
    const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        const str = String(val || '').replace(/\s/g, '').replace(',', '.');
        return parseFloat(str) || 0;
    };

    for (let i = dataStartIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // Check columns based on dynamic mapping
        const colA = cleanStr(row[mapping.colA]);  // Причина списания / Номенклатура
        const colE = cleanStr(row[mapping.colE]);  // Источник дефекта
        const colF = cleanStr(row[mapping.colF]);  // Причина претензии / Причина при проверке ОТК
        const colG = cleanStr(row[mapping.colG]);  // Поставщик
        const colK = cleanStr(row[mapping.colK]); // Персональный номер

        // Logic to distinguish Group Row (Yellow) vs Item Row (White)
        // User Rules:
        // 1. Yellow Rows: Have "Claim Reason" (Col F) and "Supplier" (Col G). Also "Defect Source" (Col E).
        //    ACTION: Update context. DO NOT USE VALUES.
        // 2. White Rows: Have "Nomenclature" (Col A). Inherit Reason/Supplier (so cols E/F/G are EMPTY).
        //    ACTION: Add to items. Use context.

        // Skip Total rows
        if (colA.toLowerCase().includes('итого') || colA.toLowerCase().includes('total')) continue;

        // Group Row Detection: If any of the grouping columns (E, F, G) are populated
        const hasGroupData = colF !== '' || colG !== '' || colE !== '';

        if (hasGroupData) {
            // It is a Group Row (Yellow)
            // Update context but DO NOT add as item
            currentContext = {
                docReason: colA || currentContext.docReason,
                defectSource: colE || currentContext.defectSource,
                reason: colF || currentContext.reason,
                supplier: colG || currentContext.supplier
            };
        } else {
            // It is an Item Row (White) - Inherits context
            // Must have Nomenclature (Col A)
            if (colA !== '') {
                const quantity = parseNum(row[mapping.colH]); // Col H
                const sum = parseNum(row[mapping.colI]);      // Col I

                // Only add if valid quantity or sum
                if (quantity > 0 || sum > 0) {
                    items.push({
                        nomenclature: colA,
                        quantity: quantity,
                        sum: sum,
                        personalNumber: colK,
                        writeOffReason: currentContext.reason || 'Не указана',
                        defectSource: currentContext.defectSource,
                        supplier: currentContext.supplier,
                        docReason: currentContext.docReason
                    });
                }
            }
        }
    }

    if (items.length === 0) {
        throw new Error('Не удалось найти данные для анализа. Проверьте, что в файле есть строки с номенклатурой и количеством.');
    }

    // 5. Group by Reason
    const groupsMap = new Map<string, WriteOffGroup>();

    items.forEach(item => {
        const key = item.writeOffReason;
        if (!groupsMap.has(key)) {
            groupsMap.set(key, {
                reason: key,
                totalQuantity: 0,
                totalSum: 0,
                items: []
            });
        }
        const group = groupsMap.get(key)!;
        group.items.push(item);
        group.totalQuantity += item.quantity;
        group.totalSum += item.sum;
    });

    return {
        id: generateId(),
        filename: file.name,
        period: period,
        groups: Array.from(groupsMap.values())
    };
};