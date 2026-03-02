import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { ParetoItem, DefectRecord } from '../../types/data.types';
import { GlassCard } from '../UI/GlassCard';
import { GripVertical } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface ParetoChartProps {
  data: ParetoItem[];
  onDetailClick?: (type: string, value: string) => void;
  rawData?: DefectRecord[];
}

export const ParetoChart: React.FC<ParetoChartProps> = ({ data, onDetailClick }) => {
  const navigate = useNavigate();

  const chartData: ChartData<'bar' | 'line'> = useMemo(() => {
    // Top 15 reasons to keep chart readable
    const topData = data.slice(0, 15);
    const labels = topData.map(item => item.reason.length > 20 ? item.reason.substring(0, 20) + '...' : item.reason);
    const cumulative = topData.map(item => item.cumulativePercentage);

    // Color palette
    const colors = [
      '#FF6384', // Red for Течь (example)
      '#36A2EB', // Blue for Брак арматуры
      '#FFCE56', // Yellow for Брак сиденья
      '#4BC0C0', // Green for Дефект мастера ОТК
      '#9966FF', // Purple
      '#FF9F40', // Orange
      '#E7E9ED', 
      '#71B37C', 
      '#E6A537', 
      '#6F7F8F'
    ];

    // Collect all unique sub-reasons across top items
    const allSubReasons = new Set<string>();
    topData.forEach(item => {
        if (item.breakdown) {
            Object.keys(item.breakdown).forEach(sub => allSubReasons.add(sub));
        } else {
            allSubReasons.add(item.reason);
        }
    });

    // Sort sub-reasons to ensure consistent order (and maybe put "Заводской брак" first or last?)
    // Let's just sort alphabetically or by total count if we wanted
    const sortedSubReasons = Array.from(allSubReasons).sort();

    const datasets: any[] = [];

    // Create stacked bar datasets
    // We want to map specific sub-reasons to specific colors if possible
    const getColor = (subReason: string, index: number) => {
        const lower = subReason.toLowerCase();
        if (lower === 'течь') return '#FF3B30'; // Red
        if (lower === 'брак арматуры') return '#5856D6'; // Purple
        if (lower === 'брак сиденья') return '#FF9500'; // Orange
        if (lower === 'заводской брак') return '#007AFF'; // Blue
        if (lower === 'дефект мастера отк') return '#34C759'; // Green
        return colors[index % colors.length];
    };

    let colorIdx = 0;
    sortedSubReasons.forEach((subReason) => {
        const dataPoints = topData.map(item => {
            if (item.breakdown && item.breakdown[subReason]) {
                return item.breakdown[subReason];
            }
            if (!item.breakdown && item.reason === subReason) {
                return item.count;
            }
            return 0;
        });

        // Only add dataset if it has non-zero data
        if (dataPoints.some(v => v > 0)) {
             datasets.push({
                type: 'bar' as const,
                label: subReason,
                data: dataPoints,
                backgroundColor: getColor(subReason, colorIdx),
                borderColor: getColor(subReason, colorIdx),
                borderWidth: 1,
                borderRadius: 2,
                stack: 'stack0', // Ensure all bars stack together
                order: 2,
                yAxisID: 'y',
             });
             colorIdx++;
        }
    });

    // Add Line dataset
    datasets.push({
      type: 'line' as const,
      label: 'Накопительный %',
      data: cumulative,
      borderColor: 'rgba(255, 69, 58, 1)',
      backgroundColor: 'rgba(255, 69, 58, 0.2)',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.3,
      order: 1,
      yAxisID: 'y1',
    });

    return {
      labels,
      datasets,
    };
  }, [data]);

  const hideTooltip = () => {
    const tooltipEl = document.getElementById('chartjs-tooltip');
    if (tooltipEl) tooltipEl.style.opacity = '0';
  };

  React.useEffect(() => {
    return () => hideTooltip();
  }, []);

  const handleChartClick = (_event: unknown, elements: { index: number }[]) => {
    if (elements.length > 0) {
      hideTooltip();
      const index = elements[0].index;
      // Get the original reason name from the data prop, assuming same order as chartData
      const originalReason = data[index].reason;
      if (onDetailClick) {
        onDetailClick('reason', originalReason);
      } else {
        navigate(`/details?type=reason&value=${encodeURIComponent(originalReason)}`);
      }
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
        position: 'top' as const,
        labels: {
            usePointStyle: true,
            boxWidth: 8,
            color: '#e5e7eb',
            // Filter legend to avoid too many items if necessary, but user wants clarity
        }
      },
      title: {
        display: true,
        text: 'Топ причин дефектов (Парето)',
        font: {
            size: 16,
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            weight: 'bold' as const
        },
        color: '#f3f4f6'
      },
      tooltip: {
        enabled: false, // Disable default tooltip
        external: (context: any) => {
            // Tooltip Element
            let tooltipEl = document.getElementById('chartjs-tooltip');

            // Create element on first render
            if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.id = 'chartjs-tooltip';
                tooltipEl.style.background = 'rgba(255, 255, 255, 1)';
                tooltipEl.style.borderRadius = '12px';
                tooltipEl.style.color = '#000';
                tooltipEl.style.opacity = '1';
                tooltipEl.style.pointerEvents = 'none';
                tooltipEl.style.position = 'absolute';
                tooltipEl.style.transform = 'translate(-50%, 0)';
                tooltipEl.style.transition = 'all .1s ease';
                tooltipEl.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                tooltipEl.style.padding = '12px';
                tooltipEl.style.minWidth = '200px';
                tooltipEl.style.zIndex = '100';
                document.body.appendChild(tooltipEl);
            }

            // Hide if no tooltip
            const tooltipModel = context.tooltip;
            if (tooltipModel.opacity === 0) {
                tooltipEl.style.opacity = '0';
                return;
            }

            // Set Text
            if (tooltipModel.body) {
                const titleLines = tooltipModel.title || [];
                const bodyLines = tooltipModel.body.map((b: any) => b.lines);

                let innerHtml = '';

                // Title (Uppercase bold)
                titleLines.forEach((title: string) => {
                    innerHtml += `<div style="text-transform: uppercase; font-weight: 800; margin-bottom: 8px; font-size: 14px; color: #111;">${title}</div>`;
                });

                innerHtml += '<div style="display: flex; flex-direction: column; gap: 4px;">';

                let total = 0;
                let cumulativeVal = '';

                // Sort items: Line chart last or separate?
                // The bodyLines contain formatted strings like "Label: Value"
                // We need access to raw data to format properly
                const dataPoints = tooltipModel.dataPoints;
                
                // Sort dataPoints: Bars first (descending value?), then Line
                // Actually screenshot shows line info separately at bottom
                const bars = dataPoints.filter((dp: any) => dp.dataset.type === 'bar');
                const lines = dataPoints.filter((dp: any) => dp.dataset.type === 'line');
                
                // Calculate total from bars
                bars.forEach((dp: any) => {
                    total += dp.parsed.y;
                });

                // Render Bars
                bars.forEach((dp: any) => {
                    if (dp.parsed.y > 0) {
                        const color = dp.dataset.backgroundColor;
                        const label = dp.dataset.label;
                        const value = dp.parsed.y;
                        innerHtml += `
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="display: block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}"></span>
                                    <span style="color: #666;">${label}:</span>
                                </div>
                                <span style="font-weight: 600; color: #111;">${value}</span>
                            </div>
                        `;
                    }
                });

                // Render Cumulative
                if (lines.length > 0) {
                    cumulativeVal = lines[0].formattedValue;
                    innerHtml += `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 13px;">
                             <span style="color: #999; font-weight: 600;">кумулятивно:</span>
                             <span style="color: #FF9500; font-weight: 700;">${cumulativeVal}%</span>
                        </div>
                    `;
                }

                // Render Total
                innerHtml += `
                    <div style="margin-top: 4px; display: flex; justify-content: space-between; font-size: 14px;">
                        <span style="color: #007AFF; font-weight: 700;">ИТОГО:</span>
                        <span style="color: #007AFF; font-weight: 700;">${total}</span>
                    </div>
                `;

                innerHtml += '</div>';
                tooltipEl.innerHTML = innerHtml;
            }

            const position = context.chart.canvas.getBoundingClientRect();
            // const bodyFont = ChartJS.defaults.font; // Not used directly

            // Display, position, and set styles for font
            tooltipEl.style.opacity = '1';
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
            // Adjust position to not go off screen? 
            // Simple offset to prevent cursor overlap
            tooltipEl.style.transform = 'translate(10px, 10px)';
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
            display: false,
            color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
            maxRotation: 45,
            minRotation: 45,
            color: '#9ca3af'
        }
      },
      y: {
        stacked: true,
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Количество',
          color: '#9ca3af'
        },
        grid: {
            color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
            color: '#9ca3af'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Накопительный %',
          color: '#9ca3af'
        },
        ticks: {
            color: '#9ca3af'
        }
      },
    },
  };

  return (
    <GlassCard className="h-full min-h-[360px] w-full bg-white/5 border-white/10 relative overflow-hidden">
      <div className="tile-drag-handle absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors">
        <GripVertical size={16} />
      </div>
      <div className="h-full w-full">
        <Chart type='bar' data={chartData} options={options} />
      </div>
    </GlassCard>
  );
};
