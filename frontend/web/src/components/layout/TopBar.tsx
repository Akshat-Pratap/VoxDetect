/**
 * src/components/layout/TopBar.tsx
 */
import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { ConnectionIndicator } from '@/components/ui/ConnectionIndicator';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Building2, ShieldCheck, RefreshCw } from 'lucide-react';
import type { OrgType } from '@/types';

export function TopBar() {
  const { org, setOrg } = useOrganization();
  const { health, loading, refresh } = useHealthCheck(30000);

  const orgs: { id: OrgType; label: string }[] = [
    { id: 'bank', label: 'Bank Profile' },
    { id: 'enterprise', label: 'Enterprise Profile' },
    { id: 'government', label: 'Government Profile' },
  ];

  const isOnline = health?.status === 'ok';

  return (
    <header className="h-16 bg-bg-surface border-b border-bg-border px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-text-secondary" />
          <span className="text-xs text-text-muted font-medium">Policy Profile:</span>
          <select
            value={org}
            onChange={(e) => setOrg(e.target.value as OrgType)}
            className="bg-bg-card border border-bg-border rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <ConnectionIndicator status="idle" apiOnline={isOnline} />

        <div className="flex items-center gap-2 border-l border-bg-border pl-4">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-text-secondary font-mono">
            {health?.version ? `v${health.version}` : 'VoxDetect Guard'}
          </span>
          <button
            onClick={() => refresh()}
            disabled={loading}
            title="Refresh System Status"
            className="p-1 hover:bg-bg-card rounded text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
