/**
 * src/pages/NotFound.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
        <ShieldAlert className="w-7 h-7 text-accent-soft" />
      </div>
      <h1 className="display text-3xl text-text-primary">404 | Page Not Found</h1>
      <p className="text-sm text-text-secondary max-w-sm">
        The requested monitoring view does not exist or has been relocated.
      </p>
      <Link to="/" className="btn btn-primary btn-sm flex items-center gap-2">
        <Home className="w-4 h-4" /> Return to Dashboard
      </Link>
    </div>
  );
}
