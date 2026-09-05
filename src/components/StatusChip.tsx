import React from 'react';

type ChipVariant = 'active' | 'off' | 'fault' | 'open' | 'closed' | 'connected' | 'lost' | 'warning' | 'info' | 'success';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

const VARIANT_STYLES: Record<ChipVariant, { bg: string; color: string; dot: string }> = {
  active: { bg: 'rgba(52,199,89,0.12)', color: '#34C759', dot: '#34C759' },
  off: { bg: 'rgba(142,142,147,0.12)', color: '#8E8E93', dot: '#8E8E93' },
  fault: { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30', dot: '#FF3B30' },
  open: { bg: 'rgba(52,199,89,0.12)', color: '#34C759', dot: '#34C759' },
  closed: { bg: 'rgba(142,142,147,0.12)', color: '#8E8E93', dot: '#8E8E93' },
  connected: { bg: 'rgba(52,199,89,0.12)', color: '#34C759', dot: '#34C759' },
  lost: { bg: 'rgba(255,59,48,0.12)', color: '#FF3B30', dot: '#FF3B30' },
  warning: { bg: 'rgba(255,159,10,0.12)', color: '#FF9F0A', dot: '#FF9F0A' },
  info: { bg: 'rgba(10,132,255,0.12)', color: '#0A84FF', dot: '#0A84FF' },
  success: { bg: 'rgba(52,199,89,0.12)', color: '#34C759', dot: '#34C759' },
};

export const StatusChip: React.FC<StatusChipProps> = ({ label, variant = 'off', icon, size = 'md' }) => {
  const style = VARIANT_STYLES[variant] ?? VARIANT_STYLES.off;
  const isSmall = size === 'sm';

  return (
    <div
      className="status-chip"
      style={{
        background: style.bg,
        color: style.color,
        padding: isSmall ? '3px 8px' : '5px 12px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'inherit',
      }}
    >
      {icon ? icon : (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: style.dot,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
      )}
      {label}
    </div>
  );
};
