import React, { useState } from 'react';
import {
  X,
  Clock,
  Send,
  CheckCircle2,
  Calendar,
  Loader2,
  BellRing,
} from 'lucide-react';
import { Subscription, SentReminder, Profile } from '../types';
import { triggerCronReminders } from '../lib/api';

interface CronModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  user: Profile | null;
  history: SentReminder[];
  onTriggerSuccess: (newReminders: SentReminder[]) => void;
}

export const CronModal: React.FC<CronModalProps> = ({
  isOpen,
  onClose,
  subscriptions,
  user,
  history,
  onTriggerSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    reminders: SentReminder[];
  } | null>(null);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const imminent = subscriptions
    .map((sub) => {
      if (!sub.cancellation_date) return null;
      const target = new Date(sub.cancellation_date);
      target.setHours(0, 0, 0, 0);
      const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { sub, days };
    })
    .filter((item): item is { sub: Subscription; days: number } => item !== null && item.days >= 0 && item.days <= 14);

  const handleRunCron = async () => {
    setLoading(true);
    try {
      const res = await triggerCronReminders();
      setResult({
        count: res.reminders_sent_count,
        reminders: res.reminders,
      });
      onTriggerSuccess(res.reminders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white border border-black/10 rounded p-6 sm:p-8 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.08] pb-4">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#E11D48]">
              Automated Retention & Alerts
            </div>
            <h3 className="text-xl font-light tracking-[-0.02em] text-[#1B1B18]">
              14-Day Cancellation Cronjob
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#1B1B18]/60 hover:text-[#1B1B18] rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Schedule Spec */}
        <div className="border border-black/10 bg-[#F8F7F4] p-5 rounded space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[#1B1B18]">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#E11D48]" />
              <span className="font-bold">SCHEDULE: Daily at 08:00 UTC</span>
            </div>
            <span className="text-[10px] border border-black/15 bg-white px-2 py-0.5 rounded">
              vercel.json
            </span>
          </div>

          <p className="font-sans text-xs text-[#1B1B18]/70 leading-relaxed">
            Per PRD Feature 5: The background route <code className="bg-black/5 px-1 py-0.5 rounded font-mono font-bold">/api/cron/reminders</code>{' '}
            evaluates all active subscriptions. Exactly 14 days before the computed cancellation date, an alert is dispatched via Resend to{' '}
            <strong className="text-[#1B1B18]">{user?.email || 'alex@indiehacker.dev'}</strong>.
          </p>

          <button
            disabled={loading}
            onClick={handleRunCron}
            className="w-full flex items-center justify-center gap-2 bg-[#1B1B18] hover:bg-black text-white py-2.5 text-xs font-bold rounded transition-colors disabled:opacity-50 font-mono"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking deadlines & dispatching emails...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Execute Cronjob Now (14d Rule Test)</span>
              </>
            )}
          </button>
        </div>

        {/* Success feedback */}
        {result && (
          <div className="border border-emerald-500/30 bg-emerald-50 p-4 rounded text-xs text-emerald-900 space-y-2 font-mono">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>Cron executed: {result.count} warning(s) sent</span>
            </div>
            {result.reminders.map((rem) => (
              <div
                key={rem.id}
                className="border border-emerald-500/20 bg-white p-2.5 rounded flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[#1B1B18]">
                    {rem.provider_name} · Due: {rem.cancellation_date}
                  </div>
                  <div className="text-[11px] text-[#1B1B18]/60">
                    Recipient: {rem.recipient_email} · Remaining: {rem.days_remaining}d
                  </div>
                </div>
                <span className="font-bold text-[#E11D48] text-[10px]">DISPATCHED</span>
              </div>
            ))}
          </div>
        )}

        {/* Imminent Subscriptions */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 flex items-center justify-between">
            <span>Subscriptions with deadline ≤ 14 days</span>
            <span className="font-mono">{imminent.length} MATCHING</span>
          </div>

          {imminent.length === 0 ? (
            <p className="font-mono text-xs text-[#1B1B18]/40 p-4 border border-black/10 bg-[#F8F7F4] rounded">
              No subscriptions with upcoming cancellation deadline within 14 days.
            </p>
          ) : (
            <div className="space-y-2">
              {imminent.map(({ sub, days }) => (
                <div
                  key={sub.id}
                  className="border border-black/10 bg-white p-3.5 rounded flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#1B1B18] flex items-center gap-2">
                      <span>{sub.provider_name}</span>
                      <span className="font-mono text-[11px] text-[#1B1B18]/60">
                        ({sub.amount} {sub.currency})
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[#1B1B18]/50 mt-0.5">
                      Target cancellation date: {sub.cancellation_date}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#E11D48]">
                      {days === 0 ? 'DUE TODAY' : `${days} DAYS LEFT`}
                    </span>
                    <div className="text-[10px] font-mono text-[#1B1B18]/40">Alert triggered</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Preview */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60">
            Resend Email Notification Template
          </div>

          <div className="border border-black/10 bg-[#F8F7F4] p-4 rounded text-xs space-y-2 font-mono text-[11px] text-[#1B1B18]">
            <div className="border-b border-black/10 pb-2 text-[#1B1B18]/70">
              FROM: reminders@in.subtracker.app<br />
              TO: {user?.email || 'alex@indiehacker.dev'}<br />
              SUBJECT: ⚠️ Cancellation notice: {imminent[0]?.sub.provider_name || 'Figma'} in 14 days
            </div>
            <div className="pt-1 font-sans text-xs text-[#1B1B18]/80 space-y-2">
              <p>Hi {user?.name || 'Alex'},</p>
              <p>
                Your subscription for <strong>{imminent[0]?.sub.provider_name || 'Figma'}</strong> renews on{' '}
                <span className="font-mono underline">{imminent[0]?.sub.cancellation_date || '2026-11-24'}</span>.
              </p>
              <p>
                If you no longer use this tool, cancel before the deadline to prevent unexpected renewal charges.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-black/[0.08] pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="border border-[#1B1B18] bg-transparent hover:bg-[#1B1B18] hover:text-white px-4 py-1.5 text-xs font-mono font-bold rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
