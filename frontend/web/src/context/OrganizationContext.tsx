/**
 * src/context/OrganizationContext.tsx
 * Global organization selection state.
 */
import React, { createContext, useContext, useState } from 'react';
import type { OrgType } from '@/types';

interface OrgContextValue {
  org: OrgType;
  setOrg: (org: OrgType) => void;
}

const OrganizationContext = createContext<OrgContextValue>({
  org: 'enterprise',
  setOrg: () => {},
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<OrgType>(() => {
    const saved = localStorage.getItem('voxdetect_org');
    return (saved as OrgType) || 'enterprise';
  });

  const handleSetOrg = (newOrg: OrgType) => {
    setOrg(newOrg);
    localStorage.setItem('voxdetect_org', newOrg);
  };

  return (
    <OrganizationContext.Provider value={{ org, setOrg: handleSetOrg }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
