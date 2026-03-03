// Нормализация имён поставщиков (слияние синонимов и ФИО к юр.лицу)

// На сегодня у нас одно правило:
// "Асланова Ангелина Владимировна" -> "ГЭОС"

export function normalizeSupplierName(raw: string): string {
  const name = (raw || '').trim();
  if (!name) return name;

  const lower = name.toLowerCase();

  if (lower === 'асланова ангелина владимировна') {
    return 'ГЭОС';
  }

  return name;
}

