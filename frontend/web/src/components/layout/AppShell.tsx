/**
 * src/components/layout/AppShell.tsx
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AlertContainer } from '../alerts/AlertContainer';

export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text-primary">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
      <AlertContainer />
    </div>
  );
}
