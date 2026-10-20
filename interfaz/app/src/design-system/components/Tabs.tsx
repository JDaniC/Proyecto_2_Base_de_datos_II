import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div
      role="tablist"
      className={`tabs-nav ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--color-divider)',
        backgroundColor: 'var(--color-background)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            style={{
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '15px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'color var(--transition-fast)',
              opacity: tab.disabled ? 0.5 : 1,
            }}
          >
            <span>{tab.label}</span>
            {tab.badge}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: 0,
                  right: 0,
                  height: '3px', // 3px exacto
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: '2px 2px 0 0',
                }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
