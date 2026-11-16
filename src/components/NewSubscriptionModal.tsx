import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { Subscription, Currency, BillingInterval } from '../types';

interface NewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (sub: Partial<Subscription>) => Promise<void>;
}

export const NewSubscriptionModal: React.FC<NewSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [providerName, setProviderName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [cancellationDate, setCancellationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim() || !amount) {
      setError('Vendor name and amount are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onCreate({
        provider_name: providerName.trim(),
        amount: parseFloat(amount),
        currency,
        billing_interval: billingInterval,
        cancellation_date: cancellationDate || null,
        notes: notes.trim() || undefined,
      });
      onClose();
      setProviderName('');
      setAmount('');
      setCancellationDate('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white border border-black/10 rounded p-6 sm:p-8 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.08] pb-3">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#E11D48]">
              Manual Ledger Entry
            </div>
            <h3 className="text-xl font-light tracking-[-0.02em] text-[#1B1B18]">
              + Add Subscription
            </h3>
          </div>
          <button onClick={onClose} className="text-[#1B1B18]/50 hover:text-[#1B1B18]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="border border-[#E11D48]/30 bg-rose-50 p-2.5 text-xs text-[#E11D48] font-mono rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/70 mb-1">
              Vendor Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Figma, Vercel, Linear"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full border border-black/10 bg-transparent p-2 text-[#1B1B18] rounded focus:outline-none focus:border-black font-sans font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/70 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="15.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-black/10 bg-transparent p-2 text-[#1B1B18] font-mono font-bold rounded focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/70 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full border border-black/10 bg-transparent p-2 text-[#1B1B18] rounded focus:outline-none focus:border-black"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/70 mb-1">
                Cadence
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
                className="w-full border border-black/10 bg-transparent p-2 text-[#1B1B18] rounded focus:outline-none focus:border-black font-sans"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly (/12)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/70 mb-1">
                Cancellation Date
              </label>
              <input
                type="date"
                value={cancellationDate}
                onChange={(e) => setCancellationDate(e.target.value)}
                className="w-full border border-black/10 bg-transparent p-2 text-[#1B1B18] font-mono rounded focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/70 mb-1">
              Purpose / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Design team seat"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-black/10 bg-transparent p-2 text-[#1B1B18] rounded focus:outline-none focus:border-black font-sans"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-black/15 bg-transparent hover:bg-black/5 px-4 py-2 text-[#1B1B18] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#1B1B18] hover:bg-black px-4 py-2 font-bold text-white rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
