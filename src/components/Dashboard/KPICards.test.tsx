import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KPICards } from './KPICards';
import { DashboardStats } from '../../types/data.types';

describe('KPICards', () => {
  const mockStats: DashboardStats = {
    totalDefects: 150,
    topReason: 'Broken Screen',
    topSupplier: 'Supplier ABC'
  };

  it('renders all KPI cards with correct data', () => {
    render(<KPICards stats={mockStats} />);

    expect(screen.getByText('Количество НП')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    expect(screen.getByText('Топ причина')).toBeInTheDocument();
    expect(screen.getByText('Broken Screen')).toBeInTheDocument();

    expect(screen.getByText('Топ поставщик')).toBeInTheDocument();
    expect(screen.getByText('Supplier ABC')).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    const emptyStats: DashboardStats = {
      totalDefects: 0,
      topReason: '',
      topSupplier: ''
    };

    render(<KPICards stats={emptyStats} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('Н/Д')).toHaveLength(2);
  });
});
