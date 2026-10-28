import React from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Database } from 'lucide-react';

export const PrototypeBanner: React.FC = () => {
  if (isSupabaseConfigured) {
    return (
      <div
        role="status"
        className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 text-xs text-emerald-900 flex items-center justify-center gap-2 font-medium"
      >
        <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>
          <strong>Live Database Connected:</strong> Connected to Supabase PostgreSQL (<code>pjympjuyyunyyfuydpdl</code>).
        </span>
      </div>
    );
  }

  return null;
};
