import * as XLSX from 'xlsx';

export interface WriteOffSalesItem {
  nomenclature: string;
  quantity: number;
  cost: number;
  revenue: number;
}

export interface WriteOffSalesFile {
  id: string;
  filename: string;
  period: string;
  items: WriteOffSalesItem[];
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Парсер файла продаж для анализа списаний
export const parseWriteOffSalesFile = async (file: File): Promise<WriteOffSalesFile> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

  // 1. Период
  let period = 'Неизвестный период';
  for (let i = 0; i < 15; i++) {
    const row = data[i];
    if (!row) continue;
    for (let j = 0; j < 10; j++) {
      const cell = String(row[j] || '');
      if (cell.toLowerCase().includes('период')) {
        const match = cell.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
        if (match) {
          period = `${match[1]} - ${match[2]}`;
        } else {
          period = cell.replace(/.*период[:\s]*/i, '').trim();
        }
        break;
      }
    }
    if (period !== 'Неизвестный период') break;
  }

  // 2. Поиск строки заголовка
  let headerRowIndex = -1;
  for (let i = 0; i < 40; i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('товарная категория') && rowStr.includes('количество') && rowStr.includes('себестоимость')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Не удалось найти заголовок таблицы продаж. Ожидается строка с "Товарная категория", "Количество", "Себестоимость".');
  }

  // В следующей строке обычно находятся подписи "Номенклатура", "Количество", "Себестоимость", "Выручка"
  const subHeaderRow = data[headerRowIndex + 1] || [];
  const headerRow = subHeaderRow.map(v => String(v).toLowerCase().trim());

  let colNomenclature = -1;
  let colQuantity = -1;
  let colCost = -1;
  let colRevenue = -1;

  headerRow.forEach((val, idx) => {
    if (val.includes('номенклатура')) colNomenclature = idx;
    if (val === 'количество' || val.includes('количество')) colQuantity = idx;
    if (val.includes('себестоимость')) colCost = idx;
    if (val.includes('выручка')) colRevenue = idx;
  });

  if (colNomenclature === -1 || colQuantity === -1 || colCost === -1 || colRevenue === -1) {
    throw new Error('Не удалось определить колонки Номенклатура / Количество / Себестоимость / Выручка в файле продаж.');
  }

  const items: WriteOffSalesItem[] = [];

  const cleanStr = (val: any) => String(val || '').trim();
  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    const str = String(val || '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(str) || 0;
  };

  // 3. Данные начинаются через две строки после основного заголовка
  const dataStartIndex = headerRowIndex + 2;

  for (let i = dataStartIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const nomenclature = cleanStr(row[colNomenclature]);
    const qty = parseNum(row[colQuantity]);
    const cost = parseNum(row[colCost]);
    const revenue = parseNum(row[colRevenue]);

    // Строки-подгруппы (категории) обычно не имеют номенклатуры, поэтому их пропускаем
    if (!nomenclature) continue;

    // Пропускаем итоги и пустые строки
    const lowerNom = nomenclature.toLowerCase();
    if (lowerNom.startsWith('итого') || lowerNom.startsWith('всего')) continue;

    // Защита от строк, где нет чисел
    if (qty === 0 && cost === 0 && revenue === 0) continue;

    items.push({
      nomenclature,
      quantity: qty || 0,
      cost,
      revenue,
    });
  }

  if (items.length === 0) {
    throw new Error('Не удалось найти строки продаж с номенклатурой. Проверьте формат файла.');
  }

  return {
    id: generateId(),
    filename: file.name,
    period,
    items,
  };
};

