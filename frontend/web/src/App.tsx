/**
 * src/App.tsx
 * Top-level application routing and context providers.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { AlertProvider } from '@/context/AlertContext';
import { AppShell } from '@/components/layout/AppShell';

import { Dashboard } from '@/pages/Dashboard';
import { LiveCall } from '@/pages/LiveCall';
import { Analyze } from '@/pages/Analyze';
import { Voiceprints } from '@/pages/Voiceprints';
import { Alerts } from '@/pages/Alerts';
import { Audit } from '@/pages/Audit';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <OrganizationProvider>
        <AlertProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live-call" element={<LiveCall />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/voiceprints" element={<Voiceprints />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AlertProvider>
      </OrganizationProvider>
    </BrowserRouter>
  );
}

export default App;
