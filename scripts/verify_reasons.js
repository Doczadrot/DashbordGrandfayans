import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_NAME = 'Анализ причин списания - TDSheet.csv';
const FILE_PATH = path.join(__dirname, '..', FILE_NAME);

function parseNum(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Replace non-breaking spaces and regular spaces
    const str = String(val).replace(/\u00A0/g, '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(str) || 0;
}

function cleanStr(val) {
    return String(val || '').trim();
}

function run() {
    console.log(`Reading ${FILE_PATH}...`);
    const fileBuffer = fs.readFileSync(FILE_PATH);
    
    // Decode
    let textUtf8;
    try {
        const utf8Decoder = new TextDecoder('utf-8');
        textUtf8 = utf8Decoder.decode(fileBuffer);
    } catch (e) {
        console.error('UTF-8 decode failed', e);
        return;
    }

    let wb;
    if (textUtf8.includes('Причина') || textUtf8.includes('Период')) {
        wb = XLSX.read(textUtf8, { type: 'string' });
    } else {
        const win1251Decoder = new TextDecoder('windows-1251');
        const text1251 = win1251Decoder.decode(fileBuffer);
        wb = XLSX.read(text1251, { type: 'string' });
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Target reasons to track
    const targets = {
        'заводской брак': { qty: 0, sum: 0, count: 0 },
        'течь': { qty: 0, sum: 0, count: 0 },
        'бой\\скол от поставщика': { qty: 0, sum: 0, count: 0 }
    };

    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < 20; i++) {
        const row = data[i];
        if (!row) continue;
        const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('причина списания') && rowStr.includes('источник дефекта')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.error('Header not found');
        return;
    }

    const mapping = {
        colA: 0,
        colE: 4,
        colF: 5,
        colG: 6,
        colH: 7,
        colI: 8
    };

    // Parse headers to confirm mapping
    const headerRow = data[headerRowIndex];
    headerRow.forEach((val, idx) => {
        const v = String(val).toLowerCase();
        if (v.includes('причина списания')) mapping.colA = idx;
        if (v.includes('источник дефекта')) mapping.colE = idx;
        if (v.includes('причина претензии')) mapping.colF = idx;
        if (v.includes('номенклатура.поставщик')) mapping.colG = idx;
        if (v === 'количество') mapping.colH = idx;
        if (v.includes('себестоимость')) mapping.colI = idx;
    });

    console.log('Column Mapping:', mapping);

    const dataStartIndex = headerRowIndex + 2; // Skip sub-header

    for (let i = dataStartIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const colA = cleanStr(row[mapping.colA]);
        const colF = cleanStr(row[mapping.colF]); // Reason
        
        // Skip totals
        if (colA.toLowerCase().includes('итого') || colA.toLowerCase().includes('total')) continue;

        // In this file, Group Rows (Yellow) have data in Col F (Reason)
        // Item rows (White) have data in Col A (Nomenclature) but empty Col F
        const hasGroupData = colF !== '';

        if (hasGroupData) {
            const reasonLower = colF.toLowerCase();
            const qty = parseNum(row[mapping.colH]);
            const sum = parseNum(row[mapping.colI]);

            // Check against targets
            for (const targetKey in targets) {
                if (reasonLower === targetKey.toLowerCase()) {
                    targets[targetKey].qty += qty;
                    targets[targetKey].sum += sum;
                    targets[targetKey].count++;
                }
            }
        }
    }

    console.log('\n--- Results ---');
    for (const [key, stats] of Object.entries(targets)) {
        console.log(`Reason: "${key}"`);
        console.log(`  Quantity: ${stats.qty}`);
        console.log(`  Sum: ${stats.sum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`);
        console.log(`  Groups found: ${stats.count}`);
    }
}

run();
