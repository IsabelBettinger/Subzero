import React from 'react';
import { Subscription, RatesData } from '../types';
import { RefreshCw, ArrowUpRight, AlertCircle, TrendingDown } from 'lucide-react';

interface BurnRateHeaderProps {
  subscriptions: Subscription[];
  ratesData: RatesData | null;
  onRefreshRates: () => void;
  isRefreshingRates: boolean;
  onOpenCron: () => void;
}

export const BurnRateHeader: React.FC<BurnRateHeaderProps> = ({
  subscriptions,
  ratesData,
  onRefreshRates,
  isRefreshingRates,
  onOpenCron,
}) => {
  const usdRate = ratesData?.rates.USD_TO_EUR || 0.8934;
  const gbpRate = ratesData?.rates.GBP_TO_EUR || 1.1986;

  let totalMonthlyEUR = 0;
  let rawUSDMonthly = 0;
  let rawEURMonthly = 0;
  let rawGBPMonthly = 0;
  let imminentDeadlines = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  subscriptions.forEach((sub) => {
    const monthlyAmount = sub.billing_interval === 'yearly' ? sub.amount / 12 : sub.amount;

    if (sub.currency === 'USD') {
      rawUSDMonthly += monthlyAmount;
      totalMonthlyEUR += monthlyAmount * usdRate;
    } else if (sub.currency === 'GBP') {
      rawGBPMonthly += monthlyAmount;
      totalMonthlyEUR += monthlyAmount * gbpRate;
    } else {
      rawEURMonthly += monthlyAmount;
      totalMonthlyEUR += monthlyAmount;
    }

    if (sub.cancellation_date) {
      const cancelDate = new Date(sub.cancellation_date);
      cancelDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((cancelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 14) {
        imminentDeadlines += 1;
      }
    }
  });

  const totalYearlyEUR = totalMonthlyEUR * 12;

  const formatEuro = (val: number) =>
    val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary Card: Burn Rate (Exact Variation 1 Style) */}
      <section className="lg:col-span-2 bg-white border border-black/[0.08] p-6 sm:p-8 rounded flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60">
              Burn Rate
            </div>
            <div className="font-mono text-[11px] text-[#1B1B18]/50 uppercase">
              EUR Aggregation (PRD Feature 4)
            </div>
          </div>

          <div className="mt-3 text-4xl sm:text-5xl font-bold font-mono tracking-[-0.04em] text-[#1B1B18] tabular-nums">
            {formatEuro(totalMonthlyEUR)}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#1B1B18]/70">
          <div>
            PER MONTH <span className="opacity-40">/</span> ANNUAL RUN-RATE:{' '}
            <strong className="text-[#1B1B18]">{formatEuro(totalYearlyEUR)}</strong>
          </div>
          <div className="text-[11px] text-[#1B1B18]/50">
            {subscriptions.length} aktive Verträge
          </div>
        </div>
      </section>

      {/* Secondary Card: Rates & Deadlines */}
      <section className="bg-white border border-black/[0.08] p-6 sm:p-8 rounded flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60">
              ECB Currency Rates
            </div>
            <button
              onClick={onRefreshRates}
              disabled={isRefreshingRates}
              className="text-[#1B1B18]/50 hover:text-[#1B1B18] transition-colors"
              title="Refresh from Frankfurter API"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshingRates ? 'animate-spin text-[#E11D48]' : ''}`} />
            </button>
          </div>

          <div className="mt-4 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-black/[0.04] pb-1.5">
              <span className="text-[#1B1B18]/60">1 USD =</span>
              <span className="font-semibold text-[#1B1B18] tabular-nums">{usdRate.toFixed(4)} EUR</span>
            </div>
            <div className="flex items-center justify-between border-b border-black/[0.04] pb-1.5">
              <span className="text-[#1B1B18]/60">1 GBP =</span>
              <span className="font-semibold text-[#1B1B18] tabular-nums">{gbpRate.toFixed(4)} EUR</span>
            </div>
          </div>
        </div>

        {/* 14-day deadline trigger button */}
        <div className="mt-5 pt-3 border-t border-black/[0.06]">
          <button
            onClick={onOpenCron}
            className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
              imminentDeadlines > 0
                ? 'bg-[#E11D48]/10 text-[#E11D48] hover:bg-[#E11D48]/15'
                : 'hover:bg-black/[0.03] text-[#1B1B18]/80'
            }`}
          >
            <div>
              <div className="text-[9px] uppercase font-bold tracking-[0.12em]">
                Cancellation Deadline
              </div>
              <div className="font-mono text-xs font-semibold">
                {imminentDeadlines > 0 ? `${imminentDeadlines} Abo(s) ≤ 14 Tage` : 'Keine nahen Fristen'}
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </section>
    </div>
  );
};
