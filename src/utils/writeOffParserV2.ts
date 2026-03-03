import * as XLSX from 'xlsx';
import { WriteOffFile, WriteOffGroup, WriteOffItem } from '../types/writeoff.types';

const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Функция для определения заводского брака (из dataProcessor.ts)
const isFactoryDefect = (reason: string): boolean => {
    const lowerReason = reason.toLowerCase()
        .replace(/a/g, 'а')
        .replace(/c/g, 'с')
        .replace(/e/g, 'е')
        .replace(/o/g, 'о')
        .replace(/p/g, 'р')
        .replace(/x/g, 'х')
        .replace(/y/g, 'у')
        .replace(/k/g, 'к');
    
    return lowerReason.includes('заводской брак') || 
           lowerReason.includes('чечь') || 
           lowerReason.includes('течь') || 
           lowerReason.includes('арматур') || 
           lowerReason.includes('сиден') || 
           lowerReason.includes('мастер') || 
           (lowerReason.includes('отк') && !lowerReason.includes('не товарный'));
};

// Функция для извлечения даты из документа списания
// Формат: "Списание недостач товаров ГФУТ-000003 от 26.01.2026 13:26:23"
const extractDateFromDocument = (docStr: string): string | null => {
    if (!docStr) return null;
    const dateMatch = docStr.match(/(\d{2}\.\d{2}\.\d{4})/);
    return dateMatch ? dateMatch[1] : null;
};

// Функция для преобразования даты в месяц (например "26.01.2026" -> "Январь 2026")
const dateToMonth = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('.');
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
};

export const parseWriteOffFileV2 = async (file: File): Promise<WriteOffFile> => {
    const buffer = await file.arrayBuffer();
    let wb: XLSX.WorkBook;

    // Check if CSV and try to detect encoding
    if (file.name.toLowerCase().endsWith('.csv')) {
        try {
            const utf8Decoder = new TextDecoder('utf-8');
            const textUtf8 = utf8Decoder.decode(buffer);
            if (textUtf8.includes('Причина') || textUtf8.includes('Период') || textUtf8.includes('Количество') || textUtf8.includes('Номенклатура')) {
                 wb = XLSX.read(textUtf8, { type: 'string' });
            } else {
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

    // 1. Extract Period from header (e.g., "Период: 01.01.2026 - 28.02.2026")
    let period = 'Неизвестный период';
    for (let i = 0; i < 10; i++) {
        const row = data[i];
        if (!row) continue;
        for (let j = 0; j < 10; j++) {
            const cell = String(row[j] || '');
            if (cell.toLowerCase().includes('период')) {
                const periodMatch = cell.match(/период[:.]?\s*(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i);
                if (periodMatch) {
                    period = `${periodMatch[1]} - ${periodMatch[2]}`;
                    break;
                } else {
                    // Fallback: extract any date range
                    const fallbackMatch = cell.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
                    if (fallbackMatch) {
                        period = `${fallbackMatch[1]} - ${fallbackMatch[2]}`;
                        break;
                    }
                }
            }
        }
        if (period !== 'Неизвестный период') break;
    }

    // 2. Find Header Row
    let headerRowIndex = -1;
    for (let i = 0; i < 20; i++) {
        const row = data[i];
        if (!row) continue;
        const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
        
        // Look for key headers
        if (rowStr.includes('причина списания') && 
            (rowStr.includes('источник дефекта') || rowStr.includes('количество') || rowStr.includes('номенклатура'))) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error('Не удалось найти заголовки таблицы. Проверьте, что файл содержит столбцы "Причина списания", "Источник дефекта" или "Номенклатура", "Количество".');
    }

    // 3. Parse Header to find Column Indices
    const rawHeaderRow = data[headerRowIndex] || [];
    const rawSubHeaderRow = data[headerRowIndex + 1] || [];

    // Объединяем основную и подстроку заголовков, чтобы корректно распознать
    // колонки типа "Причина претензии", "Документ списания", "Номенклатура" и т.д.
    const headerRow = rawHeaderRow.map((val, idx) => {
        const part1 = String(val || '');
        const part2 = String(rawSubHeaderRow[idx] || '');
        return `${part1} ${part2}`.toLowerCase().trim();
    });

    const mapping: Record<string, number> = {
        colReason: -1,        // Причина списания (из документа списания)
        colDefectSource: -1,   // Источник дефекта
        colQuantity: -1,      // Количество
        colCost: -1,          // Себестоимость
        colPersonalNumber: -1, // Персональный номер
        colDefectAct: -1,     // Акт о браке
        colClaimReason: -1,    // Причина претензии
        colWarehouse: -1,     // Склад
        colWriteOffDoc: -1,   // Документ списания
        colComment: -1,       // Комментарий
        colNomenclature: -1   // Номенклатура (может быть в колонке причины списания)
    };

    headerRow.forEach((val, idx) => {
        // Причина списания (из документа списания) - может быть в первой колонке
        if (val.includes('причина списания') && (val.includes('документ') || mapping.colReason === -1)) {
            mapping.colReason = idx;
        }
        // Источник дефекта
        if (val.includes('источник дефекта')) {
            mapping.colDefectSource = idx;
        }
        // Количество
        if (val === 'количество' || (val.includes('количество') && mapping.colQuantity === -1)) {
            mapping.colQuantity = idx;
        }
        // Себестоимость / сумма
        if (val.includes('себестоимость') || (val.includes('сумма') && mapping.colCost === -1)) {
            mapping.colCost = idx;
        }
        // Персональный номер
        if (val.includes('персональный номер')) {
            mapping.colPersonalNumber = idx;
        }
        // Акт о браке
        if (val.includes('акт о браке')) {
            mapping.colDefectAct = idx;
        }
        // Причина претензии / причина при проверке ОТК
        if (val.includes('причина претензии') || val.includes('причина при проверке')) {
            mapping.colClaimReason = idx;
        }
        // Склад
        if (val === 'склад' || (val.includes('склад') && mapping.colWarehouse === -1)) {
            mapping.colWarehouse = idx;
        }
        // Документ списания
        if (val.includes('документ списания')) {
            mapping.colWriteOffDoc = idx;
        }
        // Комментарий
        if (val.includes('комментарий')) {
            mapping.colComment = idx;
        }
        // Номенклатура (может быть во второй строке заголовка)
        if (val.includes('номенклатура') && !val.includes('поставщик')) {
            mapping.colNomenclature = idx;
        }
    });

    // Требуем наличие отдельной колонки "Причина претензии"
    if (mapping.colClaimReason === -1) {
        throw new Error('Не найден столбец "Причина претензии". Убедитесь, что файл сформирован по шаблону "Анализ причин списания".');
    }

    // Если номенклатура не найдена, но есть причина списания, используем её колонку
    // (в файлах списаний номенклатура часто находится в той же колонке, что и причина списания)
    if (mapping.colNomenclature === -1) {
        if (mapping.colReason !== -1) {
            mapping.colNomenclature = mapping.colReason;
        } else {
            // Fallback: используем первую колонку
            mapping.colNomenclature = 0;
        }
    }

    // 4. Parse Data Rows
    const items: WriteOffItem[] = [];
    // Данные обычно начинаются через одну строку после основной шапки,
    // т.к. строка headerRowIndex+1 — подзаголовок с названиями полей
    const dataStartIndex = headerRowIndex + 2;

    // Контекст для группирующих строк (желтые строки)
    let currentContext = {
        docReason: '',
        defectSource: '',
        claimReason: '',
        warehouse: ''
    };

    const cleanStr = (val: any) => String(val || '').trim();
    const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        const str = String(val || '').replace(/\s/g, '').replace(',', '.');
        return parseFloat(str) || 0;
    };

    for (let i = dataStartIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // Extract data based on mapping
        const colReasonVal = mapping.colReason !== -1 ? cleanStr(row[mapping.colReason]) : '';
        const colClaimReasonVal = mapping.colClaimReason !== -1 ? cleanStr(row[mapping.colClaimReason]) : '';
        const colDefectSourceVal = mapping.colDefectSource !== -1 ? cleanStr(row[mapping.colDefectSource]) : '';
        const colWarehouseVal = mapping.colWarehouse !== -1 ? cleanStr(row[mapping.colWarehouse]) : '';
        const colNomenclatureVal = mapping.colNomenclature !== -1 ? cleanStr(row[mapping.colNomenclature]) : '';
        const quantity = mapping.colQuantity !== -1 ? parseNum(row[mapping.colQuantity]) : 0;
        const cost = mapping.colCost !== -1 ? parseNum(row[mapping.colCost]) : 0;
        const personalNumber = mapping.colPersonalNumber !== -1 ? cleanStr(row[mapping.colPersonalNumber]) : '';
        const writeOffDoc = mapping.colWriteOffDoc !== -1 ? cleanStr(row[mapping.colWriteOffDoc]) : '';

        // Skip summary rows
        const firstCell = colReasonVal || colNomenclatureVal;
        if (firstCell.toLowerCase().includes('итого') || firstCell.toLowerCase().includes('total')) {
            continue;
        }

        // Определяем, является ли строка группирующей (желтой) или детальной (белой)
        // Группирующая строка: имеет причину претензии, источник дефекта или склад, но нет номенклатуры продукта
        const hasGroupingData = colClaimReasonVal !== '' || colDefectSourceVal !== '' || colWarehouseVal !== '';
        const lowerNomen = colNomenclatureVal.toLowerCase();
        const hasNomenclature = colNomenclatureVal !== '' && 
                               !lowerNomen.includes('мп утилизация') &&
                               !lowerNomen.includes('утилизация / комиссия') &&
                               !lowerNomen.includes('утилизац') &&
                               !lowerNomen.includes('возвраты');

        if (hasGroupingData && !hasNomenclature) {
            // Это группирующая строка - обновляем контекст
            currentContext = {
                docReason: colReasonVal || currentContext.docReason,
                defectSource: colDefectSourceVal || currentContext.defectSource,
                claimReason: colClaimReasonVal || currentContext.claimReason,
                warehouse: colWarehouseVal || currentContext.warehouse
            };
            continue; // Не добавляем группирующую строку как элемент
        }

        // Это детальная строка (белая) - используем номенклатуру и наследуем контекст
        const nomenclature = colNomenclatureVal || '';
        const claimReason = colClaimReasonVal || currentContext.claimReason || 'Не указана';
        const defectSource = colDefectSourceVal || currentContext.defectSource;
        const warehouse = colWarehouseVal || currentContext.warehouse;
        const docReason = colReasonVal || currentContext.docReason;

        // Skip empty rows
        if (!nomenclature && quantity === 0 && cost === 0) {
            continue;
        }

        // Extract date from write-off document
        const writeOffDate = writeOffDoc ? extractDateFromDocument(writeOffDoc) : null;
        const writeOffMonth = writeOffDate ? dateToMonth(writeOffDate) : null;

        // Determine if it's a factory defect
        const isFactory = claimReason ? isFactoryDefect(claimReason) : false;

        // Only add items with valid data
        if (nomenclature || quantity > 0 || cost > 0) {
            items.push({
                nomenclature: nomenclature || 'Не указано',
                quantity: quantity || 1, // Default to 1 if not specified
                sum: cost,
                personalNumber,
                writeOffReason: claimReason,
                defectSource: defectSource || undefined,
                warehouse: warehouse || undefined,
                writeOffDocument: writeOffDoc || undefined,
                writeOffDate: writeOffDate || undefined,
                writeOffMonth: writeOffMonth || undefined,
                isFactoryDefect: isFactory,
                docReason: docReason || undefined
            });
        }
    }

    if (items.length === 0) {
        throw new Error('Не удалось найти данные для анализа. Проверьте, что в файле есть строки с номенклатурой и количеством.');
    }

    // 5. Group by Reason (Причина претензии)
    const groupsMap = new Map<string, WriteOffGroup>();

    items.forEach(item => {
        const key = item.writeOffReason || 'Не указана';
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
