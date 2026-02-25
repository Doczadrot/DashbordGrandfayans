import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FilePreview } from './FilePreview';
import { DefectRecord } from '../../types/data.types';

describe('FilePreview', () => {
  const mockData: DefectRecord[] = Array.from({ length: 15 }, (_, i) => ({
    id: `id-${i}`,
    nomenclature: `Item ${i}`,
    personalNumber: `PN-${i}`,
    claimReason: `Reason ${i}`,
    defectDescription: `Desc ${i}`,
    supplier: `Supplier ${i}`,
    responsibility: 'Resp',
    warehouse: 'WH',
    defectType: 'Type',
    date: '2023-01-01',
    reportMonth: 'Сентябрь',
    quantity: 1
  }));

  it('renders the table with headers', () => {
    render(<FilePreview data={mockData} />);
    
    expect(screen.getByText('Предпросмотр данных (10 из 15)')).toBeInTheDocument();
    expect(screen.getByText('Номенклатура')).toBeInTheDocument();
    expect(screen.getByText('Причина претензии')).toBeInTheDocument();
    expect(screen.getByText('Поставщик')).toBeInTheDocument();
    expect(screen.getByText('Персональный №')).toBeInTheDocument();
  });

  it('renders only the first 10 rows', () => {
    render(<FilePreview data={mockData} />);
    
    // Check first item exists
    expect(screen.getByText('Item 0')).toBeInTheDocument();
    // Check 10th item (index 9) exists
    expect(screen.getByText('Item 9')).toBeInTheDocument();
    // Check 11th item (index 10) does NOT exist
    expect(screen.queryByText('Item 10')).not.toBeInTheDocument();
    
    expect(screen.getByText('Показано 10 из 15 записей')).toBeInTheDocument();
  });
});
