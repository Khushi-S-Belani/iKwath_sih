import React, { useMemo } from 'react';

interface DataPoint {
  time: number;
  value: number;
}

interface Series {
  data: DataPoint[];
  color: string;
  label: string;
}

interface MiniChartProps {
  series: Series[];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  tooltip?: boolean;
}

function normalize(val: number, min: number, max: number, range: number) {
  if (max === min) return range / 2;
  return ((val - min) / (max - min)) * range;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  series,
  width = 480,
  height = 180,
  xLabel,
  yLabel,
  showGrid = true,
}) => {
  const padLeft = yLabel ? 44 : 28;
  const padBottom = xLabel ? 36 : 22;
  const padRight = 12;
  const padTop = 16;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allX = series.flatMap((s) => s.data.map((d) => d.time));
  const allY = series.flatMap((s) => s.data.map((d) => d.value));
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMin = Math.min(...allY) * 0.97;
  const yMax = Math.max(...allY) * 1.02;

  const toSvgX = (x: number) => padLeft + normalize(x, xMin, xMax, chartW);
  const toSvgY = (y: number) => padTop + chartH - normalize(y, yMin, yMax, chartH);

  const paths = useMemo(() =>
    series.map((s) => {
      if (s.data.length === 0) return '';
      const points = s.data.map((d) => `${toSvgX(d.time)},${toSvgY(d.value)}`);
      return `M ${points.join(' L ')}`;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, width, height]
  );

  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => Math.round(v));
  const xTicks = [xMin, (xMin + xMax) / 2, xMax].map((v) => Math.round(v * 10) / 10);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ overflow: 'visible', display: 'block' }}
    >
      {/* Grid */}
      {showGrid && yTicks.map((y, i) => (
        <line
          key={i}
          x1={padLeft}
          x2={padLeft + chartW}
          y1={toSvgY(y)}
          y2={toSvgY(y)}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      ))}

      {/* Axes */}
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1={padLeft} y1={padTop + chartH} x2={padLeft + chartW} y2={padTop + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* Y labels */}
      {yTicks.map((y, i) => (
        <text key={i} x={padLeft - 5} y={toSvgY(y) + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="inherit">
          {y}
        </text>
      ))}

      {/* X labels */}
      {xTicks.map((x, i) => (
        <text key={i} x={toSvgX(x)} y={padTop + chartH + 14} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="inherit">
          {x}
        </text>
      ))}

      {/* Axis labels */}
      {yLabel && (
        <text
          x={10}
          y={padTop + chartH / 2}
          transform={`rotate(-90 10 ${padTop + chartH / 2})`}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="10"
          fontFamily="inherit"
        >
          {yLabel}
        </text>
      )}
      {xLabel && (
        <text
          x={padLeft + chartW / 2}
          y={height - 4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="10"
          fontFamily="inherit"
        >
          {xLabel}
        </text>
      )}

      {/* Area fills */}
      {series.map((s, si) => {
        if (s.data.length < 2) return null;
        const points = s.data.map((d) => `${toSvgX(d.time)},${toSvgY(d.value)}`);
        const closePath = `L${toSvgX(s.data[s.data.length - 1].time)},${padTop + chartH} L${toSvgX(s.data[0].time)},${padTop + chartH} Z`;
        return (
          <path
            key={`area-${si}`}
            d={`M ${points.join(' L ')} ${closePath}`}
            fill={s.color}
            fillOpacity="0.08"
          />
        );
      })}

      {/* Lines */}
      {paths.map((d, si) => (
        <path
          key={`line-${si}`}
          d={d}
          fill="none"
          stroke={series[si].color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Legend */}
      {series.map((s, si) => (
        <g key={`legend-${si}`} transform={`translate(${padLeft + si * 130}, ${padTop - 8})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
          <text x="25" y="4" fill="rgba(255,255,255,0.55)" fontSize="10" fontFamily="inherit">{s.label}</text>
        </g>
      ))}
    </svg>
  );
};
