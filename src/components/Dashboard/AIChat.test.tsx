import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIChat } from './AIChat';
import { DefectRecord } from '../../types/data.types';

describe('AIChat', () => {
  const mockData: DefectRecord[] = [];

  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
    // Mock environment variable
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-api-key');
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('renders initial message', () => {
    render(<AIChat data={mockData} />);
    expect(screen.getByText(/Здравствуйте! Я ваш Защитник Качества/i)).toBeInTheDocument();
  });

  it('handles user input and API call', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        choices: [{ message: { content: 'AI Response' } }]
      })
    } as unknown as Response);

    render(<AIChat data={mockData} />);

    const input = screen.getByPlaceholderText('Спросите о главных дефектах...');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Test Question' } });
    fireEvent.click(button);

    // Check user message appears
    expect(screen.getByText('Test Question')).toBeInTheDocument();

    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText('AI Response')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles missing API key gracefully', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    
    render(<AIChat data={mockData} />);

    const input = screen.getByPlaceholderText('Спросите о главных дефектах...');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    expect(screen.getByText('Ошибка: Ключ OpenAI API отсутствует в переменных окружения.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
