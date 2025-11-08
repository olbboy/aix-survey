/**
 * Trend Chart Component
 * Displays historical benchmark trends over time
 */

'use client';

interface TrendData {
  domainCode: string;
  historicalAverages: Array<{ date: string; average: number }>;
}

interface TrendChartProps {
  trends: TrendData[];
}

export function TrendChart({ trends }: TrendChartProps) {
  if (trends.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No historical trend data available yet
      </div>
    );
  }

  // Get all unique dates across all trends
  const allDates = Array.from(
    new Set(trends.flatMap((t) => t.historicalAverages.map((h) => h.date)))
  ).sort();

  // Prepare data for each domain
  const domainColors: Record<string, string> = {
    data: '#3b82f6',
    infra: '#10b981',
    tech: '#f59e0b',
    org: '#8b5cf6',
    policy: '#ef4444',
  };

  const domainNames: Record<string, string> = {
    data: 'Dữ liệu',
    infra: 'Hạ tầng',
    tech: 'Công nghệ',
    org: 'Tổ chức',
    policy: 'Chính sách',
  };

  // Calculate chart dimensions
  const chartHeight = 300;
  const chartWidth = 800;
  const padding = { top: 20, right: 120, bottom: 40, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Scale functions
  const minScore = 0;
  const maxScore = 5;
  const xScale = (index: number) => (index / (allDates.length - 1)) * plotWidth;
  const yScale = (score: number) => plotHeight - ((score - minScore) / (maxScore - minScore)) * plotHeight;

  return (
    <div className="space-y-4">
      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="border rounded-lg bg-white"
        >
          {/* Y-axis grid lines */}
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <g key={score}>
              <line
                x1={padding.left}
                y1={padding.top + yScale(score)}
                x2={padding.left + plotWidth}
                y2={padding.top + yScale(score)}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={padding.top + yScale(score)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {score}
              </text>
            </g>
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight}
            stroke="#9ca3af"
            strokeWidth="2"
          />

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + plotHeight}
            stroke="#9ca3af"
            strokeWidth="2"
          />

          {/* X-axis labels */}
          {allDates.map((date, index) => {
            const formattedDate = new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
            });
            return (
              <text
                key={date}
                x={padding.left + xScale(index)}
                y={padding.top + plotHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#6b7280"
              >
                {formattedDate}
              </text>
            );
          })}

          {/* Trend lines for each domain */}
          {trends.map((trend) => {
            const color = domainColors[trend.domainCode] || '#6b7280';
            const points = allDates.map((date, index) => {
              const dataPoint = trend.historicalAverages.find((h) => h.date === date);
              const score = dataPoint?.average || 0;
              return `${padding.left + xScale(index)},${padding.top + yScale(score)}`;
            });

            return (
              <g key={trend.domainCode}>
                {/* Line */}
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {allDates.map((date, index) => {
                  const dataPoint = trend.historicalAverages.find((h) => h.date === date);
                  if (!dataPoint) return null;
                  return (
                    <circle
                      key={`${trend.domainCode}-${date}`}
                      cx={padding.left + xScale(index)}
                      cy={padding.top + yScale(dataPoint.average)}
                      r="4"
                      fill={color}
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Legend */}
          {trends.map((trend, index) => {
            const color = domainColors[trend.domainCode] || '#6b7280';
            const name = domainNames[trend.domainCode] || trend.domainCode;
            const yPos = padding.top + 20 + index * 25;

            return (
              <g key={`legend-${trend.domainCode}`}>
                <line
                  x1={padding.left + plotWidth + 15}
                  y1={yPos}
                  x2={padding.left + plotWidth + 35}
                  y2={yPos}
                  stroke={color}
                  strokeWidth="3"
                />
                <text
                  x={padding.left + plotWidth + 40}
                  y={yPos}
                  dominantBaseline="middle"
                  fontSize="13"
                  fill="#374151"
                >
                  {name}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={padding.left + plotWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            fontWeight="500"
          >
            Time
          </text>
          <text
            x={15}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            fontWeight="500"
            transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`}
          >
            Industry Average Score
          </text>
        </svg>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-900">
          <strong>Trend Insight:</strong> This chart shows how industry averages have changed over
          the past {allDates.length} months. Use this to understand whether your industry is
          improving overall and identify emerging trends in AI maturity.
        </div>
      </div>
    </div>
  );
}
