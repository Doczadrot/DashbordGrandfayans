
import fs from 'fs';
import * as XLSX from 'xlsx';
import path from 'path';

const files = [
    'Анализ причин списания - TDSheet.csv',
    'БРАК СЕНТЯБРЬ - Лист1.csv'
];

async function run() {
    for (const fileName of files) {
        const filePath = path.resolve(process.cwd(), fileName);
        if (!fs.existsSync(filePath)) {
            console.log(`\nFile not found: ${fileName}`);
            continue;
        }

        console.log(`\nAnalyzing ${fileName}...`);
        
        const buffer = fs.readFileSync(filePath);
        let wb;
        
        try {
            // Replicate app logic for CSV decoding
            if (fileName.toLowerCase().endsWith('.csv')) {
                 const utf8Decoder = new TextDecoder('utf-8');
                 const textUtf8 = utf8Decoder.decode(buffer);

                 if (textUtf8.includes('Причина') || textUtf8.includes('Период') || textUtf8.includes('Количество')) {
                      wb = XLSX.read(textUtf8, { type: 'string' });
                 } else {
                      const win1251Decoder = new TextDecoder('windows-1251');
                      const text1251 = win1251Decoder.decode(buffer);
                      wb = XLSX.read(text1251, { type: 'string' });
                 }
            } else {
                 wb = XLSX.read(buffer, { type: 'buffer' });
            }
        } catch (e) {
            console.log('Error reading file:', e);
            continue;
        }

        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        // Convert to array of arrays
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!data || data.length === 0) {
            console.log('Empty sheet');
            continue;
        }

        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            const row = data[i];
            if (!row) continue;
            const rowStr = row.map(c => String(c).toLowerCase());
            if (rowStr.some(c => c.includes('причина списания') || c.includes('номенклатура'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
             console.log('Could not find headers');
             continue;
        }

        // Identify columns based on parser logic
        const headerRow = data[headerRowIndex].map(c => String(c).toLowerCase().trim());
        const mapping = {
            colA: 0, 
            colE: 4, 
            colF: 5, 
            colG: 6, 
            colH: 7, 
            colI: 8, 
            colK: 10 
        };

        headerRow.forEach((val, idx) => {
            if (val.includes('причина списания')) mapping.colA = idx;
            else if (val.includes('номенклатура') && !val.includes('поставщик')) mapping.colA = idx;

            if (val.includes('источник дефекта')) mapping.colE = idx;
            if (val.includes('причина претензии') || val.includes('причина при проверке отк')) mapping.colF = idx;
            if (val.includes('поставщик')) mapping.colG = idx;
            if (val === 'количество') mapping.colH = idx;
            if (val.includes('себестоимость') || val.includes('сумма')) mapping.colI = idx;
            if (val.includes('персональный номер')) mapping.colK = idx;
        });

        let currentContext = {
            docReason: '',
            defectSource: '',
            reason: '',
            supplier: ''
        };

        let totalUtilizationQty = 0;
        let utilizationItemsCount = 0;
        const utilDetails = [];

        // Helper
        const cleanStr = (val) => String(val || '').trim();
        const parseNum = (val) => {
            if (typeof val === 'number') return val;
            const str = String(val || '').replace(/\s/g, '').replace(/\u00A0/g, '').replace(',', '.');
            return parseFloat(str) || 0;
        };

        // Iterate data rows (start after header)
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const colA = cleanStr(row[mapping.colA]);
            const colE = cleanStr(row[mapping.colE]);
            const colF = cleanStr(row[mapping.colF]);
            const colG = cleanStr(row[mapping.colG]);

            if (colA.toLowerCase().includes('итого') || colA.toLowerCase().includes('total')) continue;

            const hasGroupData = colF !== '' || colG !== '' || colE !== '';

            if (hasGroupData) {
                // Group Row
                currentContext = {
                    docReason: colA || currentContext.docReason,
                    defectSource: colE || currentContext.defectSource,
                    reason: colF || currentContext.reason,
                    supplier: colG || currentContext.supplier
                };
            } else {
                // Item Row
                if (colA !== '') {
                    const quantity = parseNum(row[mapping.colH]);
                    if (quantity > 0) {
                        // Check if docReason contains "утилизация"
                         const isDocUtil = currentContext.docReason.toLowerCase().includes('утилизация');
                         const isReasonUtil = currentContext.reason.toLowerCase().includes('утилизация');
                         const isSourceUtil = currentContext.defectSource.toLowerCase().includes('утилизация');

                         if (isDocUtil || isReasonUtil || isSourceUtil) {
                             totalUtilizationQty += quantity;
                             utilizationItemsCount++;
                             
                             // Add to breakdown
                              const key = `${currentContext.docReason} | ${currentContext.reason} | ${currentContext.supplier} | ${colA}`;
                              const existing = utilDetails.find(d => d.key === key);
                              if (existing) {
                                  existing.qty += quantity;
                                  existing.count++;
                              } else {
                                  utilDetails.push({
                                      key,
                                      qty: quantity,
                                      count: 1
                                  });
                              }
                          }
                      }
                  }
              }
          }
  
          // Sort by quantity desc
          utilDetails.sort((a, b) => b.qty - a.qty);

          console.log(`Found ${utilizationItemsCount} items with "утилизация" in any context.`);
          console.log(`Total Quantity: ${totalUtilizationQty}`);
          console.log('Top 10 items by quantity:', utilDetails.slice(0, 10));
      }
  }

run();
