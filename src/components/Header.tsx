import React from 'react';
import { Profile } from '../types';
import { Mail, ShieldCheck, User } from 'lucide-react';

interface HeaderProps {
  currentTab: 'dashboard' | 'ingest' | 'cron' | 'analytics';
  onSelectTab: (tab: 'dashboard' | 'ingest' | 'cron' | 'analytics') => void;
  user: Profile | null;
  onOpenNewModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenNewModal,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
            SZ
          </div>
          <button
            onClick={() => onSelectTab('dashboard')}
            className="text-left text-lg font-bold tracking-tight text-white hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            SubZero
          </button>
          <span className="hidden lg:inline text-xs text-slate-500 border-l border-slate-800 pl-3">
            Minimalist Subscription Tracker
          </span>
        </div>

        {/* Zone 2: 4-5 clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              currentTab === 'dashboard'
                ? 'text-white border-b-2 border-emerald-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('ingest')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              currentTab === 'ingest'
                ? 'text-white border-b-2 border-emerald-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            E-Mail-Ingest & Simulator
          </button>
          <button
            onClick={() => onSelectTab('cron')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              currentTab === 'cron'
                ? 'text-white border-b-2 border-emerald-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Frist-Cronjob (14 Tage)
          </button>
          <button
            onClick={() => onSelectTab('analytics')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              currentTab === 'analytics'
                ? 'text-white border-b-2 border-emerald-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            PostHog Validierung
          </button>
        </nav>

        {/* Zone 3: 1 primary action + User badge */}
        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <div className="hidden sm:flex items-center gap-2 rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate max-w-[140px]">{user.email}</span>
            </div>
          )}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap shrink-0 shadow-sm"
          >
            + Abo hinzufügen
          </button>
        </div>
      </div>
    </header>
  );
};
