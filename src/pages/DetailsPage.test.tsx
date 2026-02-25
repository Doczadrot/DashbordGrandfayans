import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetailsPage } from './DetailsPage';
import { useStore } from '../store/useStore';
import React from 'react';

// Mock the store
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));

// Mock Chart.js to avoid rendering issues in JSDOM
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />,
  Line: () => <div data-testid="mock-line-chart" />,
  Pie: () => <div data-testid="mock-pie-chart" />,
  PolarArea: () => <div data-testid="mock-polar-chart" />,
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock react-grid-layout
vi.mock('react-grid-layout/legacy', () => ({
  Responsive: ({ children }: any) => <div data-testid="mock-responsive-grid">{children}</div>,
  WidthProvider: (component: any) => component,
}));

describe('DetailsPage Filter Logic', () => {
  const mockData = [
    {
      id: '1',
      nomenclature: 'Item 1',
      claimReason: 'Заводской брак',
      defectDescription: 'Broken part',
      supplier: 'Supplier A',
      quantity: 1,
      reportMonth: 'Январь',
      fileName: 'Весь брак январь - TDSheet.csv'
    },
    {
      id: '2',
      nomenclature: 'Item 2',
      claimReason: 'Broken glass',
      defectDescription: 'Scratches',
      supplier: 'Supplier B',
      quantity: 2,
      reportMonth: 'Февраль',
      fileName: 'February_Defects.xlsx'
    }
  ];

  const mockStore = {
    data: mockData,
    salesData: [],
    supplierGroups: { china: [], rf: [], furniture: [] },
    meta: { fileName: '', reportMonth: '' },
    addData: vi.fn(),
    addSalesData: vi.fn(),
    updateMeta: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  it('correctly filters data with encoded Cyrillic filename in URL', () => {
    // URL: /details?type=reason&value=Заводской+брак&files=Весь+брак+январь+-+TDSheet.csv
    const encodedFiles = encodeURIComponent('Весь брак январь - TDSheet.csv');
    const encodedValue = encodeURIComponent('Заводской брак');
    
    render(
      <MemoryRouter initialEntries={[`/details?type=reason&value=${encodedValue}&files=${encodedFiles}`]}>
        <Routes>
          <Route path="/details" element={<DetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check if the table shows the correct filtered item
    // In DetailsPage, the table shows reportMonth, nomenclature, supplier, description, quantity
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    expect(screen.getByText('Broken part')).toBeInTheDocument();
  });

  it('correctly filters data when multiple files are provided', () => {
    const files = 'Весь брак январь - TDSheet.csv,February_Defects.xlsx';
    
    render(
      <MemoryRouter initialEntries={[`/details?type=total&value=total&files=${encodeURIComponent(files)}`]}>
        <Routes>
          <Route path="/details" element={<DetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('handles case-insensitive and partial filename matching', () => {
    // Item 1 fileName: 'Весь брак январь - TDSheet.csv'
    // Search for: 'ВЕСЬ БРАК' (uppercase)
    const partialFile = encodeURIComponent('ВЕСЬ БРАК');
    
    render(
      <MemoryRouter initialEntries={[`/details?type=total&value=total&files=${partialFile}`]}>
        <Routes>
          <Route path="/details" element={<DetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('shows empty state when no files match', () => {
    render(
      <MemoryRouter initialEntries={[`/details?type=total&value=total&files=NonExistentFile.csv`]}>
        <Routes>
          <Route path="/details" element={<DetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    expect(screen.getByText(/Нет записей/i)).toBeInTheDocument();
  });

  it('correctly filters sales data based on filenames', () => {
    const mockSalesData = [
      {
        id: 's1',
        supplier: 'Озон',
        nomenclature: 'Item 1',
        quantity: 100,
        month: 'Январь',
        fileName: 'Sales_Jan.csv'
      },
      {
        id: 's2',
        supplier: 'Озон',
        nomenclature: 'Item 1',
        quantity: 200,
        month: 'Февраль',
        fileName: 'Sales_Feb.csv'
      }
    ];

    (useStore as any).mockReturnValue({
      ...mockStore,
      salesData: mockSalesData,
    });

    const { debug } = render(
      <MemoryRouter initialEntries={[`/details?type=supplier&value=${encodeURIComponent('Озон')}&files=Sales_Jan.csv`]}>
        <Routes>
          <Route path="/details" element={<DetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // debug();

    // Check if sales data is filtered - only 100 should be visible
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.queryByText(/200/)).not.toBeInTheDocument();
  });
});
