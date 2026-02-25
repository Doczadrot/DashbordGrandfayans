import { describe, it, expect } from 'vitest';
import { classifySupplier, isPersonName, isFurnitureNomenclature } from './supplierClassification';
import { DefectRecord } from '../types/data.types';

describe('supplierClassification', () => {
  describe('isPersonName', () => {
    it('should identify person names (Cyrillic Name Surname)', () => {
      expect(isPersonName('Иванов Иван')).toBe(true);
      expect(isPersonName('Петров Петр')).toBe(true);
      expect(isPersonName('Сидоров С.')).toBe(false); // Currently strict check
    });

    it('should identify IP (Individual Entrepreneur)', () => {
      expect(isPersonName('ИП Иванов')).toBe(true);
      expect(isPersonName('ип петров')).toBe(true);
    });

    it('should not identify company names as persons', () => {
      expect(isPersonName('ООО Ромашка')).toBe(false);
      expect(isPersonName('Завод МК')).toBe(false);
      expect(isPersonName('Геус')).toBe(false);
    });
  });

  describe('isFurnitureNomenclature', () => {
    it('should identify furniture keywords', () => {
      expect(isFurnitureNomenclature('Диван угловой')).toBe(true);
      expect(isFurnitureNomenclature('Стол обеденный')).toBe(true);
      expect(isFurnitureNomenclature('Кресло офисное')).toBe(true);
      expect(isFurnitureNomenclature('Шкаф-купе')).toBe(true);
    });

    it('should return false for non-furniture', () => {
      expect(isFurnitureNomenclature('Болт М6')).toBe(false);
      expect(isFurnitureNomenclature('Ткань обивочная')).toBe(false); // Unless added to keywords
      expect(isFurnitureNomenclature('Механизм трансформации')).toBe(false);
    });
  });

  describe('classifySupplier', () => {
    const mockRecords: DefectRecord[] = [];

    it('should classify China suppliers correctly', () => {
      expect(classifySupplier('SupplieR China Ltd', mockRecords)).toBe('china');
      expect(classifySupplier('ООО Китай-Трейд', mockRecords)).toBe('china');
      expect(classifySupplier('ChinaBest', mockRecords)).toBe('china');
      expect(classifySupplier('Фабрика Китай', mockRecords)).toBe('china');
    });

    it('should classify Furniture suppliers based on name rules', () => {
      expect(classifySupplier('Геус', mockRecords)).toBe('furniture');
      expect(classifySupplier('ИП Мебельщик', mockRecords)).toBe('furniture');
      expect(classifySupplier('Иванов Иван', mockRecords)).toBe('furniture'); // Person name -> Furniture (as per current logic)
    });

    it('should classify Furniture based on nomenclature history', () => {
      const furnitureRecords: DefectRecord[] = [
        { nomenclature: 'Диван Атланта', supplier: 'Unknown Factory', quantity: 1, reason: '', description: '', reportMonth: '', defectType: '', source: '' } as any
      ];
      expect(classifySupplier('Unknown Factory', furnitureRecords)).toBe('furniture');
    });

    it('should default to RF', () => {
      expect(classifySupplier('ООО Ромашка', mockRecords)).toBe('rf');
      expect(classifySupplier('Завод Металлоизделий', mockRecords)).toBe('rf');
    });

    it('should prioritize China over Furniture keywords if name contains China', () => {
      // Even if they supply furniture, if name has China -> China group
      const furnitureRecords: DefectRecord[] = [
        { nomenclature: 'Диван', supplier: 'China Sofa', quantity: 1, reason: '', description: '', reportMonth: '', defectType: '', source: '' } as any
      ];
      expect(classifySupplier('China Sofa', furnitureRecords)).toBe('china');
    });
  });
});
