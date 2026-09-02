/**
 * src/components/layout/Sidebar.tsx — Navigation rail
 *
 * Wider 64px (w-16) icon rail with generous touch targets and spacing.
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from '@/components/ui/Tooltip';
import { ShieldCheck, FileLock2, AudioWaveform, Radio, ShieldAlert, ScrollText, Settings, LayoutDashboard } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: string;
}

const navItems: NavItem[] = [
  { to: '/home', label: 'Home', icon: LayoutDashboard, accent: 'rgb(var(--accent))' },
  { to: '/analyze', label: 'Analyze', icon: AudioWaveform, accent: 'rgb(var(--accent))' },
  { to: '/live-call', label: 'Live Monitor', icon: Radio, accent: 'rgb(var(--risk-high))' },
  { to: '/alerts', label: 'Alerts', icon: ShieldAlert, accent: 'rgb(var(--risk-critical))' },
  { to: '/audit', label: 'Audit Log', icon: ScrollText, accent: 'rgb(var(--risk-medium))' },
  { to: '/settings', label: 'Settings', icon: Settings, accent: 'rgb(var(--accent-soft))' },
];

export function Sidebar() {
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center select-none">
      {/* Nav icons with generous spacing and comfortable targets */}
      <nav className="flex flex-col items-center gap-3 pt-3 flex-1 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
<NavLink
              key={item.to}
              to={item.to}
              className="relative w-full flex justify-center"
            >
              {({ isActive }) => (
                <Tooltip label={item.label} side="right">
                  <span
                    className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors duration-150 ${
                      isActive
                        ? 'text-[rgb(var(--accent))]'
                        : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] hover:bg-[var(--hover-bg)]'
                    }`}
                    style={isActive ? { color: item.accent } : undefined}
                  >
                    {/* Active indicator — left edge bar */}
                    {isActive && (
                      <span
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                        style={{ background: item.accent }}
                      />
                    )}
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>
                </Tooltip>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom: privacy policy link */}
      <div className="pb-3 flex justify-center w-full">
<NavLink
          to="/privacy"
          className="relative w-full flex justify-center"
        >
          {({ isActive }) => (
            <Tooltip label="Privacy Policy & Compliance" side="right">
              <span
                className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors duration-150 ${
                  isActive
                    ? 'bg-[var(--hover-bg-strong)] text-[rgb(var(--accent))]'
                    : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent))] hover:bg-[var(--hover-bg)]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[rgb(var(--accent))]" />
                )}
                <FileLock2 className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
            </Tooltip>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
