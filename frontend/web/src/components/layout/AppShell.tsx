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
    <div className="relative h-screen w-screen overflow-hidden text-text-primary">
      {/* Ambient background */}
      <div className="ambient" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="page-enter h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <AlertContainer />
    </div>
  );
}
