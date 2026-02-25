const fs = require('fs');

try {
    // Читаем файл. Обычно файлы из 1С/Excel в CSV могут быть в UTF-16LE или Win-1251.
    // Судя по предыдущему чтению, там был UTF-16 (много запятых и специфичный формат).
    const buffer = fs.readFileSync('MP s1.11 po.csv');
    let content;
    
    // Проверяем BOM для UTF-16LE
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        content = buffer.toString('utf16le');
    } else {
        content = buffer.toString('utf8');
    }

    const lines = content.split(/\r?\n/);
    const stats = {};
    let totalRows = 0;

    // Данные начинаются с 9-й строки (заголовок на 8-й)
    for (let i = 8; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // В CSV от 1С разделитель часто ';' или ',', но в превью были ','
        // Но так как внутри названий есть кавычки и запятые, нужно быть аккуратнее.
        // Для даты нам нужна только первая колонка до первой запятой/точки с запятой.
        const firstSeparator = line.match(/[,;]/);
        if (!firstSeparator) continue;
        
        const dateStr = line.split(firstSeparator[0])[0].trim();
        
        if (dateStr && dateStr.includes('.')) {
            const datePart = dateStr.split(' ')[0]; // берем только дату без времени
            const parts = datePart.split('.'); // ['01', '11', '2025']
            if (parts.length === 3) {
                const month = parts[1];
                const year = parts[2];
                const monthYear = `${month}.${year}`;
                stats[monthYear] = (stats[monthYear] || 0) + 1;
                totalRows++;
            }
        }
    }

    console.log('РЕЗУЛЬТАТЫ ПОДСЧЕТА (1 строка = 1 штука):');
    console.log('--------------------------------------');
    
    const sortedMonths = Object.keys(stats).sort((a, b) => {
        const [m1, y1] = a.split('.').map(Number);
        const [m2, y2] = b.split('.').map(Number);
        return y1 !== y2 ? y1 - y2 : m1 - m2;
    });

    const monthNames = {
        '11': 'Ноябрь',
        '12': 'Декабрь',
        '01': 'Январь',
        '02': 'Февраль'
    };

    sortedMonths.forEach(my => {
        const [m, y] = my.split('.');
        console.log(`${monthNames[m] || m} ${y}: ${stats[my]} шт.`);
    });
    
    console.log('--------------------------------------');
    console.log(`ИТОГО ПРОДАЖ: ${totalRows} шт.`);

} catch (err) {
    console.error('Ошибка при чтении файла:', err.message);
}
