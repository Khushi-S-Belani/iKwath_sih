import React from 'react';
import { NavSection, MachineMode, MachineStatus } from '../types';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  modes: MachineMode[];
  badge?: string;
}

interface DeviceRailProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  machineStatus: MachineStatus;
  mode: MachineMode;
  onModeChange: (mode: MachineMode) => void;
  brewInProgress: boolean;
}

const Icon = ({ d, viewBox = '0 0 24 24' }: { d: string; viewBox?: string }) => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d={d} />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <Icon d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />,
    modes: ['user', 'technician', 'research'],
  },
  {
    id: 'pod',
    label: 'Brew',
    icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 12l2 2 4-4" />,
    modes: ['user', 'technician', 'research'],
  },
  {
    id: 'history',
    label: 'History',
    icon: <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    modes: ['user', 'technician', 'research'],
  },
  {
    id: 'formulations',
    label: 'Formulations',
    icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" />,
    modes: ['user', 'technician', 'research'],
  },
  {
    id: 'validation',
    label: 'Validation',
    icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    modes: ['research', 'technician'],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    icon: <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    modes: ['user', 'technician', 'research'],
  },
  {
    id: 'technician',
    label: 'Technician',
    icon: <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
    modes: ['technician'],
  },
  {
    id: 'research',
    label: 'Research',
    icon: <Icon d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
    modes: ['research'],
  },
];

const STATUS_DOT: Record<MachineStatus, string> = {
  READY: '#34C759',
  BUSY: '#0A84FF',
  CLEANING: '#FF9F0A',
  ATTENTION: '#FF9F0A',
  OFFLINE: '#8E8E93',
  FAULT: '#FF3B30',
};

const MODE_LABELS: Record<MachineMode, string> = {
  user: 'User Mode',
  technician: 'Technician',
  research: 'Research',
};

export const DeviceRail: React.FC<DeviceRailProps> = ({
  currentSection,
  onSelectSection,
  machineStatus,
  mode,
  onModeChange,
  brewInProgress,
}) => {
  const visibleItems = NAV_ITEMS.filter((item) => item.modes.includes(mode));

  return (
    <aside className="rail">
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark">
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, zIndex: 1 }}>i</span>
        </div>
        <div>
          <div className="brand-name">iKwath</div>
          <div className="brand-tagline">SIH26048</div>
        </div>
      </div>

      {/* Machine Status */}
      <div className="rail-status">
        <div className="rail-status-dot" style={{ background: STATUS_DOT[machineStatus] }} />
        <span className="rail-status-label">{machineStatus}</span>
      </div>

      {/* Nav */}
      <nav className="rail-nav">
        {visibleItems.map((item) => {
          const isActive = currentSection === item.id;
          const isDisabled = brewInProgress && !['water-fill', 'live-brew', 'reduction', 'filtration'].includes(item.id);
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`rail-nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && onSelectSection(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
            >
              <span className="rail-nav-icon">{item.icon}</span>
              <span className="rail-nav-label">{item.label}</span>
              {item.badge && <span className="rail-nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Mode Switcher */}
      <div className="rail-mode-switcher">
        <div className="rail-mode-label">UX Mode</div>
        <div className="rail-mode-btns">
          {(['user', 'technician', 'research'] as MachineMode[]).map((m) => (
            <button
              key={m}
              id={`mode-${m}`}
              className={`rail-mode-btn ${mode === m ? 'active' : ''}`}
              onClick={() => onModeChange(m)}
              title={MODE_LABELS[m]}
            >
              {m === 'user' ? '👤' : m === 'technician' ? '🔧' : '🔬'}
            </button>
          ))}
        </div>
        <div className="rail-mode-current">{MODE_LABELS[mode]}</div>
      </div>
    </aside>
  );
};
