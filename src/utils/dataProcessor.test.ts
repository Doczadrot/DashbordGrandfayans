import { describe, it, expect } from 'vitest';
import { normalizeData, calculatePareto, calculateKPI } from './dataProcessor';
import { RawDataRow } from '../types/data.types';

describe('dataProcessor', () => {
  const mockRawData: RawDataRow[] = [
    {
      'Номенклатура': 'Item 1',
      'Персональный номер': '123',
      'Причина претензии': 'Reason A',
      'Описание дефекта': 'Defect 1',
      'Поставщик': 'Supplier X',
      'Ответственность за брак': 'Resp 1',
      'Склад обнаружения': 'Warehouse 1',
      'Вид дефекта': 'Type 1'
    },
    {
      'Номенклатура': 'Item 2',
      'Персональный номер': '124',
      'Причина претензии': 'Reason A',
      'Описание дефекта': 'Defect 2',
      'Поставщик': 'Supplier Y',
      'Ответственность за брак': 'Resp 2',
      'Склад обнаружения': 'Warehouse 1',
      'Вид дефекта': 'Type 1'
    },
    {
      'Номенклатура': 'Item 3',
      'Персональный номер': '125',
      'Причина претензии': 'Reason B',
      'Описание дефекта': 'Defect 3',
      'Поставщик': 'Supplier X',
      'Ответственность за брак': 'Resp 1',
      'Склад обнаружения': 'Warehouse 1',
      'Вид дефекта': 'Type 2'
    },
    // Invalid row to test filtering
    {
      'Номенклатура': 'Номенклатура', // Should be filtered out
      'Персональный номер': 'Header',
      'Причина претензии': 'Reason',
      'Описание дефекта': 'Desc',
      'Поставщик': 'Supplier',
      'Ответственность за брак': 'Resp',
      'Склад обнаружения': 'Warehouse',
      'Вид дефекта': 'Type'
    }
  ];

  it('normalizeData should correctly transform raw data and filter invalid rows', () => {
    const result = normalizeData(mockRawData, 'Сентябрь');
    expect(result).toHaveLength(3);
    expect(result[0].nomenclature).toBe('Item 1');
    expect(result[0].claimReason).toBe('Reason A');
    expect(result[0].supplier).toBe('Supplier X');
  });

  it('calculatePareto should correctly calculate counts and percentages', () => {
    const normalized = normalizeData(mockRawData, 'Сентябрь');
    const pareto = calculatePareto(normalized);

    // Reason A: 2, Reason B: 1. Total: 3.
    // Reason A: 66.67%, Reason B: 33.33%
    
    expect(pareto).toHaveLength(2);
    expect(pareto[0].reason).toBe('Reason A');
    expect(pareto[0].count).toBe(2);
    expect(pareto[0].percentage).toBeCloseTo(66.67);
    
    expect(pareto[1].reason).toBe('Reason B');
    expect(pareto[1].count).toBe(1);
    expect(pareto[1].percentage).toBeCloseTo(33.33);
    expect(pareto[1].cumulativePercentage).toBeCloseTo(100);
  });

  it('calculateKPI should correctly calculate supplier statistics', () => {
    const normalized = normalizeData(mockRawData, 'Сентябрь');
    const kpi = calculateKPI(normalized);

    // Supplier X: 2, Supplier Y: 1. Total 3.
    
    expect(kpi).toHaveLength(2);
    expect(kpi[0].supplier).toBe('Supplier X');
    expect(kpi[0].totalDefects).toBe(2);
    expect(kpi[0].defectPercentage).toBeCloseTo(66.67);

    expect(kpi[1].supplier).toBe('Supplier Y');
    expect(kpi[1].totalDefects).toBe(1);
  });
});
