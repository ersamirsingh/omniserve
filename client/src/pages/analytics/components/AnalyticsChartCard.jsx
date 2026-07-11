import { useState } from 'react';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

export default function AnalyticsChartCard({ dailyData = [] }) {
  const [activeMetric, setActiveMetric] = useState('revenue');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Sort chronological (oldest to newest)
  const chartData = [...dailyData].sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-2xl p-6 text-center text-zinc-500 py-16">
        No daily records found to generate trend graphs.
      </div>
    );
  }

  const metricsConfig = {
    revenue: {
      label: 'Revenue',
      color: '#10b981', // emerald
      gradientId: 'grad-revenue',
      getValue: (d) => d.totalRevenue || 0,
      format: formatCurrency,
    },
    orders: {
      label: 'Orders',
      color: '#6366f1', // indigo
      gradientId: 'grad-orders',
      getValue: (d) => d.totalOrders || 0,
      format: formatNumber,
    },
    cancellations: {
      label: 'Cancellations',
      color: '#f43f5e', // rose
      gradientId: 'grad-cancellation',
      getValue: (d) => d.cancelledOrders || 0,
      format: formatNumber,
    },
    successRate: {
      label: 'Success Rate',
      color: '#3b82f6', // blue
      gradientId: 'grad-success',
      getValue: (d) => {
        const total = d.totalOrders || 0;
        if (total === 0) return 100;
        const cancelled = d.cancelledOrders || 0;
        return ((total - cancelled) / total) * 100;
      },
      format: formatPercent,
    },
    aov: {
      label: 'Avg Order Value',
      color: '#f59e0b', // amber
      gradientId: 'grad-aov',
      getValue: (d) => d.averageOrderValue || 0,
      format: formatCurrency,
    },
  };

  const currentMetric = metricsConfig[activeMetric];

  // SVG parameters
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const values = chartData.map(currentMetric.getValue);
  const minVal = 0;
  let maxVal = Math.max(...values);
  if (maxVal === minVal) maxVal = 10;
  else maxVal = maxVal * 1.15; // 15% top padding

  const points = chartData.map((d, i) => {
    const val = currentMetric.getValue(d);
    const x = paddingLeft + (i / Math.max(1, chartData.length - 1)) * chartWidth;
    const y = svgHeight - paddingBottom - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, value: val, date: d.reportDate ? new Date(d.reportDate) : null, original: d };
  });

  // Build SVG Path
  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;
  }

  // Handle mouse movement for interactive guide lines and tooltip
  const handleMouseMove = (e) => {
    const svgElement = e.currentTarget;
    const rect = svgElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Calculate nearest data point index
    const relativeX = clientX - paddingLeft;
    let index = Math.round((relativeX / chartWidth) * (chartData.length - 1));
    index = Math.max(0, Math.min(chartData.length - 1, index));

    setHoveredIndex(index);
    // Align tooltip to hover node coordinate
    if (points[index]) {
      setTooltipPos({
        x: points[index].x,
        y: points[index].y - 12
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Y-axis grid tick generation (4 divisions)
  const yTicks = Array.from({ length: 4 }).map((_, i) => {
    const val = minVal + (i / 3) * (maxVal - minVal);
    const y = svgHeight - paddingBottom - (i / 3) * chartHeight;
    return { value: val, y };
  });

  // X-axis date labels (draw 4 labels maximum to avoid clutter)
  const xLabelIndices = [];
  if (chartData.length > 1) {
    const step = Math.max(1, Math.floor(chartData.length / 3));
    for (let i = 0; i < chartData.length; i += step) {
      xLabelIndices.push(i);
    }
    if (xLabelIndices[xLabelIndices.length - 1] !== chartData.length - 1) {
      xLabelIndices.push(chartData.length - 1);
    }
  } else if (chartData.length === 1) {
    xLabelIndices.push(0);
  }

  return (
    <div className="bg-white dark:bg-zinc-950 border border-border-base dark:border-zinc-900 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
      {/* Header and Toggles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-extrabold text-on-surface dark:text-zinc-150 text-sm tracking-wide uppercase">Performance Trends</h3>
          <p className="text-[11px] text-on-surface-variant dark:text-zinc-400 mt-0.5">Visualize daily operations and growth charts.</p>
        </div>
        
        {/* Metric Toggles */}
        <div className="flex items-center gap-1.5 bg-surface-subtle dark:bg-zinc-900/60 p-1 rounded-xl border border-border-base dark:border-zinc-900 overflow-x-auto max-w-full">
          {Object.entries(metricsConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => {
                setActiveMetric(key);
                setHoveredIndex(null);
              }}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeMetric === key
                  ? 'bg-white dark:bg-zinc-950 text-on-surface shadow-xs border border-border-base/50 dark:border-zinc-800'
                  : 'text-on-surface-variant/80 hover:text-on-surface dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[240px] select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={currentMetric.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentMetric.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={currentMetric.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y Gridlines & Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="currentColor"
                className="text-border-base/40 dark:text-zinc-900"
                strokeWidth={1}
                strokeDasharray={i === 0 ? "0" : "4 4"}
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[9px] font-bold fill-zinc-400 dark:fill-zinc-650 font-mono"
              >
                {currentMetric.format(tick.value)}
              </text>
            </g>
          ))}

          {/* X Labels */}
          {xLabelIndices.map((idx) => {
            const pt = points[idx];
            if (!pt) return null;
            return (
              <text
                key={idx}
                x={pt.x}
                y={svgHeight - paddingBottom + 16}
                textAnchor="middle"
                className="text-[9px] font-bold fill-zinc-400 dark:fill-zinc-600"
              >
                {pt.date ? pt.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
              </text>
            );
          })}

          {/* Gradient Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#${currentMetric.gradientId})`}
            />
          )}

          {/* Main Line Stroke */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={currentMetric.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Interactive Guides & Node Pin */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <g>
              {/* Vertical Guide Line */}
              <line
                x1={points[hoveredIndex].x}
                y1={paddingTop}
                x2={points[hoveredIndex].x}
                y2={svgHeight - paddingBottom}
                stroke={currentMetric.color}
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.6}
              />

              {/* Glowing Outer Dot */}
              <circle
                cx={points[hoveredIndex].x}
                cy={points[hoveredIndex].y}
                r={6.5}
                fill={currentMetric.color}
                opacity={0.3}
              />

              {/* Solid Inner Dot */}
              <circle
                cx={points[hoveredIndex].x}
                cy={points[hoveredIndex].y}
                r={3.5}
                fill={currentMetric.color}
                stroke="white"
                strokeWidth={1}
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay (HTML absolute position) */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute z-10 bg-white/90 dark:bg-zinc-950/95 border border-border-base dark:border-zinc-800 rounded-lg p-2.5 shadow-lg text-[10px] font-bold pointer-events-none transition-all duration-75 flex flex-col gap-1 -translate-x-1/2 backdrop-blur-md"
            style={{
              left: `${(points[hoveredIndex].x / svgWidth) * 100}%`,
              top: `${(tooltipPos.y / svgHeight) * 100 - 15}%`,
            }}
          >
            <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-[8px]">
              {points[hoveredIndex].date ? points[hoveredIndex].date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: currentMetric.color }}
              ></span>
              <span className="text-zinc-700 dark:text-zinc-350">
                {currentMetric.label}:
              </span>
              <span className="text-on-background font-mono text-xs">
                {currentMetric.format(points[hoveredIndex].value)}
              </span>
            </div>
            {activeMetric === 'successRate' && (
              <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold block">
                Orders: {points[hoveredIndex].original.totalOrders} • Cancelled: {points[hoveredIndex].original.cancelledOrders}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
