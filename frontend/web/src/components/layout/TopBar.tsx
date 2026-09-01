/**
 * src/components/layout/TopBar.tsx — frosted glass top bar
 */
import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useTheme } from '@/context/ThemeContext';
import { ConnectionIndicator } from '@/components/ui/ConnectionIndicator';
import { Select } from '@/components/ui/Select';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { RefreshCw, Sun, Moon } from 'lucide-react';
import type { OrgType } from '@/types';

const orgOptions = [
  { value: 'bank', label: 'Bank Profile' },
  { value: 'enterprise', label: 'Enterprise Profile' },
  { value: 'government', label: 'Government Profile' },
];

export function TopBar() {
  const { org, setOrg } = useOrganization();
  const { theme, toggleTheme } = useTheme();
  const { health, loading, refresh } = useHealthCheck(30000);

  const isOnline = health?.status === 'ok';

  return (
    <header className="edge-b h-16 shrink-0 px-6 flex items-center justify-between bg-glass/[0.02] backdrop-blur-2xl border-b border-glass/[0.08]">
      <div className="flex items-center gap-5">
        <span className="eyebrow !text-text-muted hidden sm:block">Policy</span>
        <Select
          value={org}
          onChange={(v) => setOrg(v as OrgType)}
          options={orgOptions}
          pill
          ariaLabel="Active organization policy"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="p-2 hover:bg-glass/[0.07] rounded-full text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <ConnectionIndicator status="idle" apiOnline={isOnline} />

        <div className="flex items-center gap-2 pl-4 border-l border-glass/[0.08]">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-xs text-text-secondary font-mono">
            {health?.version ? `v${health.version}` : 'VoxDetect'}
          </span>
          <button
            onClick={() => refresh()}
            disabled={loading}
            title="Refresh status"
            className="p-1.5 hover:bg-glass/[0.07] rounded-full text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
