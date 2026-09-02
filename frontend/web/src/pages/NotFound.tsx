/**
 * src/pages/NotFound.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-12 h-12 rounded-md bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.2)] flex items-center justify-center">
        <ShieldAlert className="w-5 h-5 text-[rgb(var(--risk-medium))]" />
      </div>
      <h1 className="text-xl font-semibold text-[rgb(var(--text-primary))]">404 | Page Not Found</h1>
      <p className="text-xs text-[rgb(var(--text-muted))] max-w-sm">
        The requested monitoring view does not exist or has been relocated.
      </p>
      <Link to="/home" className="btn btn-primary btn-sm flex items-center gap-2">
        <Home className="w-4 h-4" /> Return to Dashboard
      </Link>
    </div>
  );
}