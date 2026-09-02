/**
 * src/components/layout/AppShell.tsx — Google Colab layout
 *
 * Structure:
 *   Viewport (full screen, bg-frame-bg)
 *     ├─ TopBar (full width, flush to top/left/right window edges)
 *     └─ Body row
 *          ├─ Sidebar (flush to left/bottom window edges)
 *          └─ Main content well (recessed with rounded corners, only area that scrolls)
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AlertContainer } from '../alerts/AlertContainer';

export function AppShell() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[rgb(var(--frame-bg))]">
      {/* Topbar — flush to top window edge */}
      <TopBar />

      {/* Body: sidebar (flush left) + recessed content well */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — flush to left and bottom window edges */}
        <Sidebar />

        {/* Content well — inset with rounded corners, this is the only scrolling area */}
        <main className="flex-1 min-w-0 min-h-0 pr-3 pb-3 pt-0 pl-1">
          <div className="h-full w-full overflow-y-auto rounded-2xl bg-[rgb(var(--bg-surface))] border border-black/5 dark:border-white/[0.08] shadow-sm">
            <div className="page-enter p-6 sm:p-7">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <AlertContainer />
    </div>
  );
}
