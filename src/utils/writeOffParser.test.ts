import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseWriteOffFile } from './writeOffParser';
import * as XLSX from 'xlsx';

// Mock XLSX
vi.mock('xlsx', () => {
  return {
    read: vi.fn(),
    utils: {
      sheet_to_json: vi.fn(),
    },
    // We need to export these as properties of the default export as well if used that way
    default: {
        read: vi.fn(),
        utils: {
            sheet_to_json: vi.fn(),
        }
    }
  };
});

describe('parseWriteOffFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid write-off file correctly', async () => {
    const mockData = [
      ['Some Header Info'],
      ['More Header Info'],
      // Header Row (Index 2)
      ['Причина списания', 'Col B', 'Col C', 'Col D', 'Источник дефекта', 'Причина претензии', 'Поставщик', 'Количество', 'Сумма', 'Col J', 'Персональный номер'],
      // Subheader Row (Index 3)
      ['Subheader A', 'Subheader B', ...Array(9).fill('')],
      // Group Row (Index 4) - Yellow row logic
      ['Group 1 Reason', '', '', '', 'Source A', 'Reason A', 'Supplier A', '', '', '', ''], 
      // Item Row (Index 5) - White row logic
      ['Item 1', '', '', '', '', '', '', 10, 1000, '', '123'], 
      // Item Row (Index 6)
      ['Item 2', '', '', '', '', '', '', 5, 500, '', '124'], 
    ];

    // Setup mocks
    (XLSX.read as any).mockReturnValue({
      Sheets: { 'Sheet1': {} },
      SheetNames: ['Sheet1'],
    });
    (XLSX.utils.sheet_to_json as any).mockReturnValue(mockData);

    // Create a mock File
    const file = new File(['mock content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const result = await parseWriteOffFile(file);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].reason).toBe('Reason A');
    expect(result.groups[0].items[0].supplier).toBe('Supplier A');
    expect(result.groups[0].items).toHaveLength(2);
    expect(result.groups[0].items[0].nomenclature).toBe('Item 1');
    expect(result.groups[0].items[0].quantity).toBe(10);
    expect(result.groups[0].items[0].sum).toBe(1000);
  });

  it('should throw error if headers are missing', async () => {
    const mockData = [
      ['Random Data', 'No Headers Here'],
      ['More Random Data', 'Still No Headers'],
    ];

    (XLSX.read as any).mockReturnValue({
      Sheets: { 'Sheet1': {} },
      SheetNames: ['Sheet1'],
    });
    (XLSX.utils.sheet_to_json as any).mockReturnValue(mockData);

    const file = new File(['mock content'], 'invalid.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Expect it to fail - currently it might not throw, so this test might fail if logic is not updated yet
    // We expect "Не удалось найти заголовки таблицы" after we fix the code
    await expect(parseWriteOffFile(file)).rejects.toThrow();
  });
});
