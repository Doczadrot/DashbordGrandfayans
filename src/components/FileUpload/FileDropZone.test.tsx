import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileDropZone } from './FileDropZone';
import * as dataProcessor from '../../utils/dataProcessor';
import { ReportData } from '../../types/data.types';

// Mock the dataProcessor module
vi.mock('../../utils/dataProcessor', () => ({
  parseFile: vi.fn()
}));

describe('FileDropZone', () => {
  it('renders upload instructions', () => {
    render(<FileDropZone onDataLoaded={() => {}} />);
    expect(screen.getByText('Перетащите файл отчета сюда')).toBeInTheDocument();
    // expect(screen.getByText('Поддержка XLSX, CSV')).toBeInTheDocument(); // Removed exact match
    expect(screen.getByText(/Поддержка XLSX, CSV/i)).toBeInTheDocument();
  });

  it('calls onDataLoaded when file is selected and parsed successfully', async () => {
    const mockOnDataLoaded = vi.fn();
    const mockRecords = [{ id: '1', nomenclature: 'Test' }];
    const mockMeta = { fileName: 'test.csv', reportMonth: 'Сентябрь' };

    vi.mocked(dataProcessor.parseFile).mockResolvedValue({
      records: mockRecords,
      fileName: mockMeta.fileName,
      reportMonth: mockMeta.reportMonth
    } as ReportData);

    render(<FileDropZone onDataLoaded={mockOnDataLoaded} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    // const input = screen.getByTestId('file-input'); // Unused variable removed

    // Since input is hidden, we can get it by container selector or add data-testid
    // Or just use fireEvent on the input found by type="file"
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Обработка данных...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnDataLoaded).toHaveBeenCalledWith(mockRecords, mockMeta);
    });
  });

  it('displays error message when parsing fails', async () => {
    vi.mocked(dataProcessor.parseFile).mockRejectedValue(new Error('Invalid format'));

    render(<FileDropZone onDataLoaded={() => {}} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });
  });
});
