import React from 'react';
import { Panel } from './Panel';

export type MetricTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

export interface MetricStripItem {
  id: string;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: MetricTone;
}

interface MetricStripProps {
  items: MetricStripItem[];
  label?: string;
}

const TONE_COLORS: Record<MetricTone, string> = {
  default: 'var(--color-strong)',
  info: 'var(--color-primary)',
  success: 'var(--color-success-text)',
  warning: 'var(--color-warning-text)',
  danger: 'var(--color-danger-text)',
};

export const MetricStrip: React.FC<MetricStripProps> = ({ items, label = 'Resumen' }) => (
  <Panel variant="white" padding="md" className="metric-strip-panel">
    <div className="metric-strip" role="group" aria-label={label}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="metric-strip-item"
          style={{ borderLeft: index > 0 ? '1px solid var(--color-divider)' : 'none' }}
        >
          <span className="metric-strip-label">{item.label}</span>
          <strong className="metric-strip-value" style={{ color: TONE_COLORS[item.tone || 'default'] }}>
            {item.value}
          </strong>
          {item.detail && <span className="metric-strip-detail">{item.detail}</span>}
        </div>
      ))}
    </div>
  </Panel>
);
