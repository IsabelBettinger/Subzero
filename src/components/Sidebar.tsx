import React from 'react';
import { Profile } from '../types';
import {
  Copy,
  Check,
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'ingest' | 'cron';
  onSelectTab: (tab: 'dashboard' | 'ingest' | 'cron') => void;
  user: Profile | null;
  onOpenNewModal: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenNewModal,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [copied, setCopied] = React.useState(false);
  const forwardAddress = user?.forwarding_address || 'u-7f39b2@in.subtracker.app';

  const handleCopy = () => {
    navigator.clipboard.writeText(forwardAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems: { id: 'dashboard' | 'ingest' | 'cron'; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'ingest', label: 'Ingest & Simulator' },
    { id: 'cron', label: 'Cronjobs (14d)' },
  ];

  const content = (
    <aside className="w-60 h-full flex flex-col justify-between p-6 sm:p-8 bg-[#F8F7F4] border-r border-black/10 select-none">
      <div>
        {/* Brand */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-[-0.05em] text-[#1B1B18]">
              SUBZERO
            </h1>
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#E11D48] bg-[#E11D48]/10 px-1.5 py-0.5 rounded">
              MVP
            </span>
          </div>
          <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/50 mt-1">
            Subscription Audit
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-6">
          <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/50">
            Navigation
          </div>

          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded transition-colors text-sm flex items-center justify-between ${
                    isActive
                      ? 'font-semibold text-[#1B1B18] bg-black/5'
                      : 'font-normal text-[#1B1B18]/70 hover:text-[#1B1B18] hover:bg-black/[0.02]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

      </div>

      {/* Footer Profile & Ingest Address */}
      <div className="pt-6 border-t border-black/10 space-y-3">
        <div>
          <div className="text-[9px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/50">
            Current Account
          </div>
          <div className="text-xs font-medium text-[#1B1B18] truncate mt-0.5 font-mono">
            {user?.email || 'alex@indiehacker.dev'}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/50">
            Ingest Mailbox
          </div>
          <div className="flex items-center justify-between gap-1 mt-1 font-mono text-[11px] text-[#1B1B18] bg-white border border-black/10 px-2 py-1 rounded">
            <span className="truncate">{forwardAddress}</span>
            <button
              onClick={handleCopy}
              className="text-[#1B1B18]/60 hover:text-[#1B1B18] shrink-0"
              title="Copy Ingest Email"
            >
              {copied ? (
                <Check className="h-3 w-3 text-[#E11D48]" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
        {content}
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
