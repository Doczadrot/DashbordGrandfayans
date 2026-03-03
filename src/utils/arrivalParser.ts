  // src/utils/arrivalParser.ts
import * as XLSX from 'xlsx';
import { ArrivalFile, ArrivalSupplier, ArrivalDocument } from '../types/arrival.types';
import { normalizeSupplierName } from './supplierAliases';

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

// Паттерн строки-регистратора: начинается с "Приобретение товаров" / "ГФУТ" / "БРУТ" / "ПГУТ" / "УШУТ"
const DOCUMENT_PATTERN = /^(Приобретение товаров|ГФУТ|БРУТ|ПГУТ|УШУТ)/i;

// Паттерн даты из строки регистратора вида "... от DD.MM.YYYY HH:MM:SS"
const DATE_PATTERN = /от\s+(\d{2}\.\d{2}\.\d{4})/;

/**
 * Разобрать число вида "8 463,000" или "8463.000" в float.
 */
const parseNum = (val: unknown): number => {
  if (typeof val === 'number') return val;
  const str = String(val ?? '')
    .replace(/\s/g, '')        // пробелы-разделители тысяч
    .replace(/\u00A0/g, '')    // неразрывный пробел
    .replace(',', '.');        // запятая → точка
  return parseFloat(str) || 0;
};

const cleanStr = (val: unknown): string => String(val ?? '').trim();

export const parseArrivalFile = async (file: File): Promise<ArrivalFile> => {
  const buffer = await file.arrayBuffer();
  let wb: XLSX.WorkBook;

  // --- Определение кодировки (аналогично writeOffParser) ---
  if (file.name.toLowerCase().endsWith('.csv')) {
    try {
      const utf8Text = new TextDecoder('utf-8').decode(buffer);
      if (
        utf8Text.includes('Поставщик') ||
        utf8Text.includes('Период') ||
        utf8Text.includes('Количество')
      ) {
        wb = XLSX.read(utf8Text, { type: 'string' });
      } else {
        const win1251Text = new TextDecoder('windows-1251').decode(buffer);
        wb = XLSX.read(win1251Text, { type: 'string' });
      }
    } catch {
      wb = XLSX.read(buffer, { type: 'array' });
    }
  } else {
    wb = XLSX.read(buffer, { type: 'array' });
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  // defval: '' — пустые ячейки становятся строкой, а не undefined
  const data = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
  }) as unknown[][];

  // ── 1. Извлечь параметры (период, склад) из первых строк ──────────────────
  let period = '';
  let warehouse = '';

  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    // Ищем ячейку, содержащую "Период:"
    for (const cell of row) {
      const str = cleanStr(cell);
      if (str.toLowerCase().includes('период:')) {
        // Вытаскиваем диапазон дат: "01.12.2025 - 31.12.2025"
        const match = str.match(/период[:\s]+(.+)/i);
        if (match) period = match[1].trim();
      }
      if (str.toLowerCase().includes('склад импорта:')) {
        const match = str.match(/склад импорта[:\s]+(.+)/i);
        if (match) warehouse = match[1].trim();
      }
    }
    // Параметры могут быть разбиты по соседним ячейкам одной строки:
    // | "Период:" | "01.12.2025 - 31.12.2025" |
    for (let j = 0; j < row.length - 1; j++) {
      const label = cleanStr(row[j]).toLowerCase();
      const value = cleanStr(row[j + 1]);
      if (label.includes('период') && value) period = period || value;
      if (label.includes('склад импорта') && value) warehouse = warehouse || value;
    }
    if (period && warehouse) break;
  }

  // Фоллбэк: период из имени файла
  if (!period) {
    const match = file.name.match(/(\d{2}\.\d{2}\.\d{4})/);
    period = match ? match[0] : file.name.replace(/\.[^/.]+$/, '');
  }

  // ── 2. Найти строку-заголовок таблицы ("Поставщик" / "Количество") ─────────
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(data.length, 40); i++) {
    const row = data[i];
    const joined = row.map(c => cleanStr(c).toLowerCase()).join(' ');
    if (joined.includes('поставщик') && joined.includes('количество')) {
      headerRowIndex = i;
      break;
    }
  }

  // Если чёткого заголовка нет — ищем первую строку с датой-регистратором
  // или строку, где первая ячейка непустая и не является параметром
  if (headerRowIndex === -1) {
    for (let i = 0; i < Math.min(data.length, 40); i++) {
      const cell = cleanStr(data[i]?.[0]);
      if (cell && !cell.toLowerCase().includes('параметры') && !cell.toLowerCase().includes('отбор')) {
        headerRowIndex = i - 1; // строка перед первым поставщиком
        break;
      }
    }
  }

  const dataStartIndex = headerRowIndex + 1;

  // ── 3. Определить индексы колонок из заголовка ────────────────────────────
  // Дефолты по примеру файла:
  //   col 0  = Поставщик / Регистратор
  //   col 10 = Количество  (колонка "K" визуально — много пустых ячеек)
  //   col 12 = Объём
  let colSupplier = 0;
  let colQuantity = 10; // подбирается ниже по заголовку
  let colVolume   = 12;

  if (headerRowIndex >= 0) {
    const headerRow = data[headerRowIndex];
    headerRow.forEach((cell, idx) => {
      const val = cleanStr(cell).toLowerCase();
      if (val === 'поставщик' || val.includes('поставщик')) colSupplier = idx;
      if (val === 'количество') colQuantity = idx;
      if (val.includes('объем') || val.includes('объём')) colVolume = idx;
    });
  }

  // ── 4. Основной проход — иерархический парсинг ───────────────────────────
  const suppliers: ArrivalSupplier[] = [];
  let currentSupplier: ArrivalSupplier | null = null;

  for (let i = dataStartIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const cellA  = cleanStr(row[colSupplier]);
    const qty    = parseNum(row[colQuantity]);
    const volume = parseNum(row[colVolume]);

    if (!cellA) continue;

    // Пропустить системную строку "Регистратор00.000" или подобные
    if (cellA.startsWith('Регистратор') && /\d+\.\d{3}/.test(cellA)) continue;

    // Строка "Итого" — конец таблицы
    if (cellA.toLowerCase().startsWith('итого')) break;

    // Строка-регистратор (дочерний документ)
    if (DOCUMENT_PATTERN.test(cellA)) {
      if (currentSupplier) {
        // Извлечь дату из строки вида "Приобретение товаров и услуг ГФУТ-005173 от 09.12.2025 15:33:55"
        const dateMatch = cellA.match(DATE_PATTERN);
        // Извлечь номер документа
        const docNumMatch = cellA.match(/((?:ГФУТ|БРУТ|ПГУТ|УШУТ)-\d+)/i);

        const doc: ArrivalDocument = {
          id: docNumMatch ? docNumMatch[1] : cellA,
          date: dateMatch ? dateMatch[1] : '',
          quantity: qty,
          volume,
        };
        currentSupplier.documents.push(doc);
        // Не суммируем здесь: итог берём из строки поставщика
      }
    } else {
      // Строка поставщика — сохранить предыдущего и начать новый
      if (currentSupplier) {
        // Пересчитать итог из документов на случай,
        // если в строке поставщика стоит агрегированное значение
        // (используем то, что уже есть в currentSupplier.totalQuantity)
        suppliers.push(currentSupplier);
      }

      currentSupplier = {
        supplier: normalizeSupplierName(cellA),
        // Количество и объём из самой строки-поставщика (агрегат от 1С)
        totalQuantity: qty,
        totalVolume: volume,
        documents: [],
      };
    }
  }

  // Не забыть последнего поставщика
  if (currentSupplier) {
    suppliers.push(currentSupplier);
  }

  if (suppliers.length === 0) {
    throw new Error(
      'Не удалось найти данные о поставщиках. ' +
      'Убедитесь, что файл содержит колонки "Поставщик" и "Количество".'
    );
  }

  const totalQuantity = suppliers.reduce((s, sup) => s + sup.totalQuantity, 0);
  const totalVolume   = suppliers.reduce((s, sup) => s + sup.totalVolume,   0);

  return {
    id: generateId(),
    filename: file.name,
    period,
    warehouse,
    suppliers,
    totalQuantity,
    totalVolume,
  };
};