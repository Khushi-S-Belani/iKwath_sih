import React from 'react';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  subLabel?: string;
  accent?: 'default' | 'amber' | 'danger' | 'success' | 'muted';
  size?: 'lg' | 'md' | 'sm';
  icon?: React.ReactNode;
}

const ACCENT_COLORS: Record<string, string> = {
  default: 'var(--accent)',
  amber: 'var(--amber)',
  danger: 'var(--danger)',
  success: 'var(--success)',
  muted: 'var(--text-muted)',
};

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  subLabel,
  accent = 'default',
  size = 'lg',
  icon,
}) => {
  const color = ACCENT_COLORS[accent] ?? ACCENT_COLORS.default;

  return (
    <div className={`metric-tile metric-tile--${size}`}>
      {icon && <div className="metric-icon">{icon}</div>}
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>
        <span className="metric-number">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subLabel && <div className="metric-sub">{subLabel}</div>}
    </div>
  );
};
