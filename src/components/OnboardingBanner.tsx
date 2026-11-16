import React, { useState } from 'react';
import { Copy, Check, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { Profile } from '../types';

interface OnboardingBannerProps {
  user: Profile | null;
  onOpenSimulator: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ user, onOpenSimulator }) => {
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const forwardAddress = user?.forwarding_address || 'u-7f39b2@in.subtracker.app';

  const handleCopy = () => {
    navigator.clipboard.writeText(forwardAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-white border border-black/[0.08] p-6 sm:p-8 rounded shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#E11D48]">
            Zero-Friction Ingest · PRD Feature 1 & 2
          </div>

          <h3 className="text-xl sm:text-2xl font-light tracking-[-0.02em] text-[#1B1B18]">
            Forward SaaS invoices to your dedicated address
          </h3>

          <p className="text-xs text-[#1B1B18]/70 leading-relaxed font-sans">
            Automate invoice tracking without third-party bank connections. Forward receipts (Stripe, Figma,
            Vercel, GitHub) to your personal address and our AI engine normalizes vendors, currencies, and
            cancellation windows instantly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2 border border-black/10 bg-[#F8F7F4] px-3 py-2 rounded">
            <span className="font-mono text-xs text-[#1B1B18] font-bold select-all">
              {forwardAddress}
            </span>
            <button
              onClick={handleCopy}
              className="ml-auto flex items-center gap-1 bg-[#1B1B18] hover:bg-black text-white px-2 py-1 text-[11px] rounded transition-colors font-mono"
              title="Copy address"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#E11D48]" />
                  <span>Kopiert</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Kopieren</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSimulator}
              className="flex-1 flex items-center justify-center gap-1.5 border border-[#1B1B18] bg-transparent text-[#1B1B18] hover:bg-[#1B1B18] hover:text-white px-3 py-2 text-xs font-medium rounded transition-colors font-mono"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#E11D48]" />
              <span>Simulate Ingest (Figma/Vercel)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="p-2 border border-black/10 text-[#1B1B18]/60 hover:text-[#1B1B18] hover:bg-black/[0.03] rounded text-xs flex items-center gap-1 transition-colors"
              title="GMail Filter Anleitung"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showGuide && (
        <div className="mt-5 pt-4 border-t border-black/[0.06] text-xs text-[#1B1B18]/80 space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]">
            GMail Forwarding Rule Setup
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[#1B1B18]/70 text-[11px] font-mono">
            <li>Open GMail Settings &gt; Filters and Blocked Addresses &gt; Create a new filter.</li>
            <li>In "From", enter: <code className="bg-black/5 px-1 rounded">billing, invoice, stripe.com</code>.</li>
            <li>Select action: "Forward to" <code className="bg-black/5 px-1 rounded font-bold text-[#1B1B18]">{forwardAddress}</code>.</li>
            <li>Invoices will be parsed automatically and displayed in the audit table below.</li>
          </ol>
        </div>
      )}
    </section>
  );
};
