import React from 'react';
import { AlertSeverity } from '../types';

interface AlertBannerProps {
  severity: AlertSeverity;
  message: string;
  action?: string;
  onDismiss?: () => void;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { bg: string; border: string; color: string; icon: string; label: string }> = {
  INFO: {
    bg: 'rgba(10,132,255,0.08)',
    border: 'rgba(10,132,255,0.3)',
    color: '#0A84FF',
    icon: 'ℹ',
    label: 'INFO',
  },
  WARNING: {
    bg: 'rgba(255,159,10,0.10)',
    border: 'rgba(255,159,10,0.35)',
    color: '#FF9F0A',
    icon: '⚠',
    label: 'WARNING',
  },
  STOP: {
    bg: 'rgba(255,59,48,0.10)',
    border: 'rgba(255,59,48,0.35)',
    color: '#FF3B30',
    icon: '⬛',
    label: 'STOP',
  },
  SERVICE: {
    bg: 'rgba(191,90,242,0.10)',
    border: 'rgba(191,90,242,0.35)',
    color: '#BF5AF2',
    icon: '🔧',
    label: 'SERVICE',
  },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ severity, message, action, onDismiss }) => {
  const cfg = SEVERITY_CONFIG[severity];

  return (
    <div
      className="alert-banner"
      role="alert"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <span style={{ color: cfg.color, fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <div style={{ flex: 1 }}>
        <span style={{ color: cfg.color, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', marginRight: 8 }}>
          {cfg.label}
        </span>
        <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{message}</span>
        {action && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Action: {action}</div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
            flexShrink: 0,
          }}
          aria-label="Dismiss alert"
        >
          ×
        </button>
      )}
    </div>
  );
};
