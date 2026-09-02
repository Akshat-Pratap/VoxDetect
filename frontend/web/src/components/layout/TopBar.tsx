/**
 * src/components/layout/TopBar.tsx — Two-row security operations top bar
 *
 * Row 1: Logo + wordmark | Org selector | Status + Theme + Bell + Avatar
 * Row 2: Action buttons (centered, prominent size) | Model status pill
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { useTheme } from '@/context/ThemeContext';
import { useAlertContext } from '@/context/AlertContext';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import { ExportReportModal } from './ExportReportModal';
import { ShieldCheck, Plus, UserPlus } from 'lucide-react';
import { Classic as ThemeToggle } from '@/components/ui/ThemeToggle';
import { Tooltip } from '@/components/ui/Tooltip';
import { NotificationIcon, DownloadDoneIcon } from '@/components/ui/AnimatedIcons';
import type { OrgType } from '@/types';

const orgOptions: SelectOption[] = [
  { value: 'bank', label: 'Bank', sublabel: 'Strict Financial' },
  { value: 'enterprise', label: 'Enterprise', sublabel: 'Standard' },
  { value: 'government', label: 'Government', sublabel: 'Maximum Security' },
];

export function TopBar() {

  const { org, setOrg } = useOrganization();
  const { theme, toggleTheme } = useTheme();
  const { toasts } = useAlertContext();
  // Persistent "unread" marker: lights when a toast arrives and stays until
  // the user opens the Alerts page (bell click acknowledges the notification).
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    if (toasts.length > 0) setUnread(true);
  }, [toasts.length]);

  const { health } = useHealthCheck(30000);
  const isOnline = health?.status === 'ok';
  const navigate = useNavigate();

  const [exportOpen, setExportOpen] = useState(false);

  const handleExportReport = () => setExportOpen(true);
  return (
    <header className="shrink-0 overflow-x-hidden select-none">
      {/* Row 1: Logo, Org selector, Status */}
      <div className="h-12 px-4 flex items-center justify-between">
        {/* Left: Logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[rgb(var(--accent))] flex items-center justify-center shadow-md">
            <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[rgb(var(--text-primary))]">
            VoxDetect
          </span>
        </div>

        {/* Center: Org selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--text-muted))]">
            Profile
          </span>
          <Select
            value={org}
            onChange={(v) => setOrg(v as OrgType)}
            options={orgOptions}
            ariaLabel="Active organization policy"
            pill
          />
        </div>

        {/* Right: Status, Theme toggle, bell, avatar */}
        <div className="flex items-center gap-2.5">
          {/* Status indicator */}
          <span className="flex items-center gap-1.5 mr-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-[rgb(var(--status-online))]' : 'bg-[rgb(var(--status-offline))]'
              }`}
            />
            <span className="text-[11px] font-mono text-[rgb(var(--text-muted))]">
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </span>

          {/* Theme toggle */}
          <Tooltip label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} side="bottom">
            <ThemeToggle
              onClick={toggleTheme}
              title=""
              className="p-1.5 rounded-lg text-[18px] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg)] transition-colors"
            />
          </Tooltip>

          {/* Notifications */}
          <Tooltip label="Notifications" side="bottom">
            <button
              className="relative p-2 rounded-lg text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg)] transition-colors"
              onClick={() => {
                setUnread(false);
                navigate('/alerts');
              }}
            >
              <NotificationIcon size={16} className="text-[rgb(var(--text-muted))]" active={unread} pulse={toasts.length} />
            </button>
          </Tooltip>

          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-[rgb(var(--bg-elevated))] flex items-center justify-center border border-[rgb(var(--border-subtle))]">
            <span className="text-[11px] font-semibold text-[rgb(var(--text-secondary))]">AD</span>
          </div>
        </div>
      </div>

      {/* Row 2: Centered action buttons with Model pill on the right */}
      <div className="h-11 px-4 flex items-center relative pb-1">
        {/* Left spacer for symmetry */}
        <div className="flex-1 hidden md:block" />

        {/* Center: Action buttons with standard, comfortable dimensions */}
        <div className="flex items-center justify-center gap-2.5 mx-auto">
          <Link
            to="/analyze"
            className="btn btn-primary btn-sm font-medium shadow-md"
          >
            <Plus className="w-4 h-4" /> New Analysis
          </Link>
          <Link
            to="/voiceprints"
            className="btn btn-ghost btn-sm font-medium"
          >
            <UserPlus className="w-4 h-4" /> Enroll Speaker
          </Link>
          <button
            onClick={handleExportReport}
            className="btn btn-ghost btn-sm font-medium"
          >
            <DownloadDoneIcon size={16} /> Export Report
          </button>
        </div>

        {/* Right: Model status pill */}
        <div className="flex-1 flex justify-end">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--hover-bg)] text-xs">
            <span className="font-mono text-[rgb(var(--text-muted))]">
              wav2vec2-XLSR
            </span>
            <span className="font-mono text-[rgb(var(--accent-soft))] font-medium">
              base
            </span>
            <span className="w-px h-3 bg-[rgb(var(--border-subtle))]" />
            <span className="font-mono text-[rgb(var(--text-muted))]">
              0.7s
            </span>
          </div>
        </div>
      </div>

      <ExportReportModal
        open={exportOpen}
        org={org}
        systemInfo={{
          system_status: isOnline ? 'online' : 'offline',
          ml_service: health?.ml_service || 'wav2vec2',
          version: health?.version || 'unknown',
        }}
        onClose={() => setExportOpen(false)}
      />
    </header>
  );
}
