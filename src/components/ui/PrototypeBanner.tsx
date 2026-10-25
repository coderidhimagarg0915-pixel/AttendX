import React from 'react';
import { AlertCircle } from 'lucide-react';

export const PrototypeBanner: React.FC = () => {
  return (
    <div
      role="status"
      className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-900 flex items-center justify-center gap-2 font-medium"
    >
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
      <span>
        <strong>Prototype Preview Mode:</strong> Displaying simulated mock data for Milestone 1 frontend design review. No real attendance records are verified or committed to PostgreSQL.
      </span>
    </div>
  );
};
