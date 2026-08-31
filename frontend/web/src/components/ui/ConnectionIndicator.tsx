/**
 * src/components/ui/ConnectionIndicator.tsx
 */
import React from 'react';
import type { WSStatus } from '@/types';

interface Props {
  status: WSStatus;
  apiOnline?: boolean;
}

export function ConnectionIndicator({ status, apiOnline }: Props) {
  if (status === 'monitoring' || status === 'connected') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs text-green-400 font-medium">LIVE</span>
      </div>
    );
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
        </span>
        <span className="text-xs text-yellow-400 font-medium">
          {status === 'reconnecting' ? 'RECONNECTING' : 'CONNECTING'}
        </span>
      </div>
    );
  }

  if (apiOnline === false) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex rounded-full h-2 w-2 bg-red-500" />
        <span className="text-xs text-red-400 font-medium">API OFFLINE</span>
      </div>
    );
  }

  if (apiOnline === true) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex rounded-full h-2 w-2 bg-green-500" />
        <span className="text-xs text-green-400 font-medium">API ONLINE</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex rounded-full h-2 w-2 bg-gray-500" />
      <span className="text-xs text-gray-400 font-medium">IDLE</span>
    </div>
  );
}
