/**
 * src/components/layout/Sidebar.tsx
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Radio,
  FileAudio,
  UserCheck,
  Bell,
  FileSpreadsheet,
  Settings,
  Activity,
} from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { to: '/', label: 'Overview', icon: Activity },
    { to: '/live-call', label: 'Live Monitoring', icon: Radio },
    { to: '/analyze', label: 'Batch Analysis', icon: FileAudio },
    { to: '/voiceprints', label: 'Voiceprints', icon: UserCheck },
    { to: '/alerts', label: 'Alerts Center', icon: Bell },
    { to: '/audit', label: 'Audit & Evidence', icon: FileSpreadsheet },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-bg-surface border-r border-bg-border flex flex-col h-screen shrink-0">
      {/* Brand */}
      <div className="p-5 border-b border-bg-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white shadow-md">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-none text-text-primary tracking-tight">VoxDetect</h1>
          <span className="text-[10px] text-text-secondary uppercase tracking-wider">Voice Authenticity Guard</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Threat Monitoring
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/20 font-semibold'
                    : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Privacy Notice Footer */}
      <div className="p-4 border-t border-bg-border bg-bg-surface/50 text-[11px] text-text-muted">
        <p className="font-medium text-text-secondary mb-1">🔒 Privacy-First</p>
        <p className="leading-tight text-[10px]">
          Audio processed in-memory only. No raw recordings persisted.
        </p>
      </div>
    </aside>
  );
}
