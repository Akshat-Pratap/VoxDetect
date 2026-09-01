/**
 * src/components/layout/Sidebar.tsx — collapsible navigation rail
 */
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Radio,
  FileAudio,
  UserCheck,
  Bell,
  FileSpreadsheet,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/live-call', label: 'Live Monitoring', icon: Radio },
      { to: '/analyze', label: 'Analyze Audio', icon: FileAudio },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/voiceprints', label: 'Voiceprints', icon: UserCheck },
      { to: '/alerts', label: 'Alerts', icon: Bell },
      { to: '/audit', label: 'Audit Log', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/settings', label: 'Settings', icon: Settings }],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`edge-r flex h-full shrink-0 flex-col bg-glass/[0.03] backdrop-blur-2xl border-r border-glass/[0.08] transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Brand + collapse toggle */}
      <div
        className={`flex items-center pt-5 pb-4 ${collapsed ? 'px-3 flex-col gap-3' : 'px-4 justify-between'}`}
      >
        <div className={`flex items-center gap-2 ${collapsed ? '' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <h1 className="display text-[15px] text-text-primary truncate">VoxDetect</h1>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-glass/[0.07] transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group, gi) => (
          <div
            key={group.label}
            className={`${gi > 0 ? 'mt-4 border-t border-glass/[0.06] pt-2.5' : ''}`}
          >
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}>
                    {({ isActive }) => (
                      <span
                        className={`group flex items-center rounded-md text-sm transition-colors duration-150 ${
                          collapsed
                            ? 'justify-center mx-auto w-10 h-10'
                            : 'gap-3 pl-3 pr-3 h-9'
                        } ${
                          isActive
                            ? 'bg-accent/15 text-accent font-medium'
                            : 'text-text-secondary hover:text-text-primary hover:bg-glass/[0.05]'
                        }`}
                      >
                        <span className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`}>
                          <Icon className="w-full h-full" strokeWidth={1.8} />
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={`flex items-center gap-2 px-2 py-4 border-t border-glass/[0.07] mt-2 ${
          collapsed ? 'flex-col' : 'px-4'
        }`}
      >
        {collapsed ? (
          <span title="Privacy-First" className="flex items-center justify-center w-10 h-10 text-accent-soft">
            <ShieldCheck className="w-5 h-5" />
          </span>
        ) : (
          <>
            <div className="w-7 h-7 rounded-md bg-glass/[0.06] border border-glass/[0.08] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-soft" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-secondary leading-tight">Privacy-First</p>
              <p className="text-[10px] text-text-muted leading-snug">No raw audio persisted</p>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
