import { DefectRecord } from '../types/data.types';

export const FURNITURE_KEYWORDS = [
  'диван', 'кресло', 'стул', 'стол', 'шкаф', 'кровать', 'тумба', 
  'полка', 'стеллаж', 'комод', 'пуф', 'банкетка', 'зеркало', 'вешалка',
  'мебель', 'кухня', 'гостиная', 'спальня', 'прихожая', 'фасад', 'корпус'
];

export const isFurnitureNomenclature = (nomenclature: string): boolean => {
  const lowerName = nomenclature.toLowerCase();
  return FURNITURE_KEYWORDS.some(keyword => lowerName.includes(keyword));
};

export const COMPANY_KEYWORDS = [
  'ооо', 'зао', 'пао', 'ип', 'тд', 'компания', 'фирма', 'завод', 'фабрика', 'мк', 'пк', 'нпо'
];

export const isPersonName = (supplier: string): boolean => {
  const upperSupplier = supplier.toUpperCase().trim();
  
  // Check for "ИП" explicitly first
  if (upperSupplier.startsWith('ИП ') || upperSupplier.startsWith('И.П.')) {
      return true;
  }

  // Check for "Name Surname" pattern (Cyrillic)
  // Simple heuristic: Two words, both starting with capital letter
  const parts = supplier.trim().split(/\s+/);
  if (parts.length === 2) {
    // Check if any part is a company keyword
    const hasCompanyKeyword = parts.some(p => COMPANY_KEYWORDS.includes(p.toLowerCase().replace(/[^а-яё]/g, '')));
    if (hasCompanyKeyword) return false;

    // Check if both parts look like names (start with capital, contain letters)
    // Allow hyphenated names (e.g. "Name-Name")
    const nameRegex = /^[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?$/;
    const isName = nameRegex.test(parts[0]) && nameRegex.test(parts[1]);
    
    if (isName) return true;
  }
  
  return false;
};

export const classifySupplier = (supplier: string, records: DefectRecord[]): 'china' | 'furniture' | 'rf' => {
  const lowerSupplier = supplier.toLowerCase();

  // 1. China Check
  if (lowerSupplier.includes('китай') || lowerSupplier.includes('china')) {
    return 'china';
  }

  // 2. Furniture Check
  // Rule: Supplier name is "Геус"
  if (lowerSupplier.includes('геус')) {
    return 'furniture';
  }

  // Rule: Supplier is a person (Name Surname)
  if (isPersonName(supplier)) {
    return 'furniture';
  }

  // Rule: Nomenclature contains furniture words
  // Check if ANY record for this supplier has furniture nomenclature
  const hasFurnitureRecord = records.some(r => isFurnitureNomenclature(r.nomenclature));
  if (hasFurnitureRecord) {
    return 'furniture';
  }

  // 3. Default to RF
  return 'rf';
};
