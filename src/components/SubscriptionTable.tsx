import React, { useState } from 'react';
import { Subscription, Currency, BillingInterval, RatesData } from '../types';
import {
  Search,
  Trash2,
  FileCheck2,
  AlertCircle,
  Check,
  Plus,
} from 'lucide-react';

interface SubscriptionTableProps {
  subscriptions: Subscription[];
  ratesData: RatesData | null;
  onUpdate: (id: string, updates: Partial<Subscription>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenNewModal: () => void;
  onOpenCancellationModal: (sub: Subscription) => void;
}

export const SubscriptionTable: React.FC<SubscriptionTableProps> = ({
  subscriptions,
  ratesData,
  onUpdate,
  onDelete,
  onOpenNewModal,
  onOpenCancellationModal,
}) => {
  const [search, setSearch] = useState('');
  const [filterInterval, setFilterInterval] = useState<'all' | 'monthly' | 'yearly' | 'imminent'>('all');
  const [savedRowId, setSavedRowId] = useState<string | null>(null);

  const usdRate = ratesData?.rates.USD_TO_EUR || 0.8934;
  const gbpRate = ratesData?.rates.GBP_TO_EUR || 1.1986;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysRemaining = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getMonthlyEUR = (sub: Subscription): number => {
    const monthly = sub.billing_interval === 'yearly' ? sub.amount / 12 : sub.amount;
    if (sub.currency === 'USD') return monthly * usdRate;
    if (sub.currency === 'GBP') return monthly * gbpRate;
    return monthly;
  };

  const handleFieldBlur = async (id: string, field: keyof Subscription, val: any) => {
    try {
      await onUpdate(id, { [field]: val });
      setSavedRowId(id);
      setTimeout(() => setSavedRowId((prev) => (prev === id ? null : prev)), 1800);
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const filtered = subscriptions.filter((sub) => {
    const matchesSearch = sub.provider_name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterInterval === 'monthly') return sub.billing_interval === 'monthly';
    if (filterInterval === 'yearly') return sub.billing_interval === 'yearly';
    if (filterInterval === 'imminent') {
      const days = getDaysRemaining(sub.cancellation_date);
      return days !== null && days >= 0 && days <= 14;
    }
    return true;
  });

  return (
    <section className="bg-white border border-black/[0.08] p-6 sm:p-8 rounded shadow-xs space-y-6">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60">
            Active Subscriptions
          </div>
          <div className="text-xs text-[#1B1B18]/50 mt-0.5">
            Inline-editing onBlur directly writes to database (Trust-Feature)
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#1B1B18]/40" />
            <input
              type="text"
              placeholder="Filter vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-black/10 bg-transparent pl-8 pr-3 py-1 text-xs text-[#1B1B18] placeholder-[#1B1B18]/40 rounded font-mono focus:outline-none focus:border-black"
            />
          </div>

          {/* Segmented Filter */}
          <div className="flex items-center gap-1 border border-black/10 p-0.5 rounded text-[11px] font-mono">
            <button
              onClick={() => setFilterInterval('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterInterval === 'all'
                  ? 'bg-[#1B1B18] text-white font-bold'
                  : 'text-[#1B1B18]/70 hover:text-[#1B1B18]'
              }`}
            >
              All ({subscriptions.length})
            </button>
            <button
              onClick={() => setFilterInterval('monthly')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterInterval === 'monthly'
                  ? 'bg-[#1B1B18] text-white font-bold'
                  : 'text-[#1B1B18]/70 hover:text-[#1B1B18]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setFilterInterval('yearly')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterInterval === 'yearly'
                  ? 'bg-[#1B1B18] text-white font-bold'
                  : 'text-[#1B1B18]/70 hover:text-[#1B1B18]'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setFilterInterval('imminent')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterInterval === 'imminent'
                  ? 'bg-[#E11D48] text-white font-bold'
                  : 'text-[#E11D48] hover:bg-[#E11D48]/10'
              }`}
            >
              ≤ 14d Deadline
            </button>
          </div>
        </div>
      </div>

      {/* Variation 1 Styled Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 pr-4">
                Vendor
              </th>
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 px-3">
                Amount
              </th>
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 px-3">
                Currency
              </th>
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 px-3">
                Interval
              </th>
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 px-3 text-right">
                EUR / Month
              </th>
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 px-3">
                Renewal
              </th>
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 px-3">
                Status
              </th>
              <th className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 py-3 pl-3 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#1B1B18]/50">
                  <p className="font-medium text-sm text-[#1B1B18]">No subscriptions found</p>
                  <p className="text-xs mt-1">Forward an invoice or click "+ Add Subscription".</p>
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const daysRemaining = getDaysRemaining(sub.cancellation_date);
                const isImminent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 14;
                const isExpired = daysRemaining !== null && daysRemaining < 0;
                const isSaved = savedRowId === sub.id;

                return (
                  <tr
                    key={sub.id}
                    className="border-b border-black/[0.05] hover:bg-black/[0.015] transition-colors group"
                  >
                    {/* Vendor Name */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={sub.provider_name}
                          onBlur={(e) => handleFieldBlur(sub.id, 'provider_name', e.target.value)}
                          className="font-semibold text-sm text-[#1B1B18] bg-transparent border-0 border-b border-transparent hover:border-black/20 focus:border-black focus:outline-none px-0.5 py-0.5 transition-colors w-full max-w-[180px]"
                          title="Click to inline edit vendor name"
                        />
                        {isSaved && (
                          <span className="font-mono text-[9px] text-[#E11D48] shrink-0 font-bold">
                            SAVED
                          </span>
                        )}
                      </div>
                      {sub.original_pdf_url && (
                        <div className="text-[10px] font-mono text-[#1B1B18]/40 truncate max-w-[160px]">
                          {sub.original_pdf_url}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={sub.amount}
                        onBlur={(e) => handleFieldBlur(sub.id, 'amount', parseFloat(e.target.value))}
                        className="w-20 border border-black/10 bg-transparent font-mono text-sm font-bold text-[#1B1B18] p-1 rounded tabular-nums text-right focus:outline-none focus:border-black"
                        title="Click to overwrite amount (PRD Trust-Feature)"
                      />
                    </td>

                    {/* Currency */}
                    <td className="py-3 px-3">
                      <select
                        defaultValue={sub.currency}
                        onChange={(e) => handleFieldBlur(sub.id, 'currency', e.target.value as Currency)}
                        className="border border-black/10 bg-transparent p-1 font-mono text-xs rounded text-[#1B1B18] focus:outline-none focus:border-black cursor-pointer"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </td>

                    {/* Interval */}
                    <td className="py-3 px-3">
                      <select
                        defaultValue={sub.billing_interval}
                        onChange={(e) =>
                          handleFieldBlur(sub.id, 'billing_interval', e.target.value as BillingInterval)
                        }
                        className="border border-black/10 bg-transparent p-1 text-xs rounded text-[#1B1B18] focus:outline-none focus:border-black cursor-pointer"
                      >
                        <option value="monthly">monthly</option>
                        <option value="yearly">yearly (/12)</option>
                      </select>
                    </td>

                    {/* Calculated EUR / Month */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-mono text-sm font-bold text-[#1B1B18] tabular-nums">
                        {getMonthlyEUR(sub).toLocaleString('de-DE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        €
                      </div>
                      {sub.currency !== 'EUR' && (
                        <div className="text-[10px] font-mono text-[#1B1B18]/40 tabular-nums">
                          via ECB rate
                        </div>
                      )}
                    </td>

                    {/* Renewal / Cancellation Date */}
                    <td className="py-3 px-3">
                      <input
                        type="date"
                        defaultValue={sub.cancellation_date || ''}
                        onBlur={(e) => handleFieldBlur(sub.id, 'cancellation_date', e.target.value || null)}
                        className="border border-black/10 bg-transparent p-1 font-mono text-xs rounded text-[#1B1B18] focus:outline-none focus:border-black cursor-pointer"
                        title="Change cancellation date"
                      />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {isImminent ? (
                        <span className="font-mono text-xs font-bold text-[#E11D48] flex items-center gap-1">
                          <span>≤ {daysRemaining} DAYS</span>
                        </span>
                      ) : isExpired ? (
                        <span className="font-mono text-xs text-[#1B1B18]/40">EXPIRED</span>
                      ) : daysRemaining !== null ? (
                        <span className="font-mono text-xs text-[#1B1B18]/70">{daysRemaining}d</span>
                      ) : (
                        <span className="font-mono text-xs text-[#1B1B18]/30">—</span>
                      )}
                    </td>

                    {/* Action buttons (Clean Variation 1 Button Styling) */}
                    <td className="py-3 pl-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenCancellationModal(sub)}
                          className="border border-[#1B1B18] bg-transparent text-[#1B1B18] hover:bg-[#1B1B18] hover:text-white px-2 py-0.5 text-[11px] font-mono rounded transition-colors"
                          title="Generate cancellation email"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => onDelete(sub.id)}
                          className="border border-transparent hover:border-black/20 text-[#1B1B18]/40 hover:text-[#E11D48] p-1 rounded transition-colors"
                          title="Delete subscription"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Editorial Footer Note */}
      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-[#1B1B18]/50 gap-2 border-t border-black/[0.04]">
        <div>
          TRUST SPEC: 100% manual control · All fields editable onBlur without page reload.
        </div>
        <div>
          ANNUAL NORMALIZATION: Yearly fees divided by 12 for EUR burn rate.
        </div>
      </div>
    </section>
  );
};
