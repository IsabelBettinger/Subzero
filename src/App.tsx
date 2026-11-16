import React, { useState, useEffect } from 'react';
import {
  fetchCurrentUser,
  fetchSubscriptions,
  fetchRates,
  updateSubscription,
  createSubscription,
  deleteSubscription,
  fetchTrackingEvents,
  fetchSentReminders,
  trackEvent,
} from './lib/api';
import { Subscription, Profile, RatesData, SentReminder, TrackingEvent } from './types';
import { Sidebar } from './components/Sidebar';
import { OnboardingBanner } from './components/OnboardingBanner';
import { BurnRateHeader } from './components/BurnRateHeader';
import { SubscriptionTable } from './components/SubscriptionTable';
import { EmailIngestModal } from './components/EmailIngestModal';
import { CronModal } from './components/CronModal';
import { CancellationModal } from './components/CancellationModal';
import { NewSubscriptionModal } from './components/NewSubscriptionModal';
import { Loader2, Menu, Plus } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [ratesData, setRatesData] = useState<RatesData | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [reminderHistory, setReminderHistory] = useState<SentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'ingest' | 'cron'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isCronModalOpen, setIsCronModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [cancellationSub, setCancellationSub] = useState<Subscription | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [userData, subs, rates, events, history] = await Promise.all([
          fetchCurrentUser(),
          fetchSubscriptions(),
          fetchRates(),
          fetchTrackingEvents(),
          fetchSentReminders(),
        ]);
        setUser(userData);
        setSubscriptions(subs);
        setRatesData(rates);
        setTrackingEvents(events);
        setReminderHistory(history);
      } catch (err) {
        console.error('Initial load failed', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    try {
      const freshRates = await fetchRates();
      setRatesData(freshRates);
      await trackEvent('rates_refreshed_from_frankfurter', { source: freshRates.source });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingRates(false);
    }
  };

  const handleUpdateSubscription = async (id: string, updates: Partial<Subscription>) => {
    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub))
    );

    try {
      const updated = await updateSubscription(id, updates);
      setSubscriptions((prev) =>
        prev.map((sub) => (sub.id === id ? updated : sub))
      );
      const events = await fetchTrackingEvents();
      setTrackingEvents(events);
    } catch (err) {
      console.error('Update failed, reverting', err);
      const subs = await fetchSubscriptions();
      setSubscriptions(subs);
    }
  };

  const handleCreateSubscription = async (newSubData: Partial<Subscription>) => {
    const created = await createSubscription(newSubData);
    setSubscriptions((prev) => [created, ...prev]);
    const events = await fetchTrackingEvents();
    setTrackingEvents(events);
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!window.confirm('Delete this subscription from the audit ledger?')) return;
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    await deleteSubscription(id);
    await trackEvent('subscription_deleted', { id });
    const events = await fetchTrackingEvents();
    setTrackingEvents(events);
  };

  const handleIngestSuccess = (newSub: Subscription) => {
    setSubscriptions((prev) => {
      const exists = prev.some((s) => s.id === newSub.id);
      return exists ? prev : [newSub, ...prev];
    });
    fetchTrackingEvents().then(setTrackingEvents);
  };

  const handleCronSuccess = (newReminders: SentReminder[]) => {
    setReminderHistory((prev) => [...newReminders, ...prev]);
    fetchTrackingEvents().then(setTrackingEvents);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F7F4] text-[#1B1B18]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#E11D48]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[#1B1B18]/70">
            Initializing SubZero Audit...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F8F7F4] text-[#1B1B18] overflow-hidden font-sans">
      {/* Variation 1 Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-black/10 bg-[#F8F7F4] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-[#1B1B18] hover:bg-black/5 rounded"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-black tracking-[-0.05em] text-lg">SUBZERO</span>
          </div>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1 bg-[#1B1B18] text-white px-3 py-1.5 rounded text-xs font-semibold"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 lg:p-12 space-y-8 max-w-6xl">
          {/* Header matching Variation 1 */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/[0.06] pb-6">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/50">
                {currentTab === 'dashboard'
                  ? 'Overview'
                  : currentTab === 'ingest'
                  ? 'E-Mail Ingest'
                  : 'Retention Engine'}
              </div>
              <h2 className="text-3xl sm:text-4xl font-light tracking-[-0.02em] text-[#1B1B18] mt-1">
                {currentTab === 'dashboard'
                  ? 'Subscription Audit'
                  : currentTab === 'ingest'
                  ? 'Inbound Pipeline'
                  : '14-Day Cron Alerts'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="bg-[#1B1B18] text-white hover:bg-black px-5 py-2 text-xs font-semibold rounded transition-colors shadow-xs whitespace-nowrap"
              >
                + Add Subscription
              </button>
            </div>
          </header>

          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Onboarding Forwarding Banner */}
              <OnboardingBanner
                user={user}
                onOpenSimulator={() => setIsIngestModalOpen(true)}
              />

              {/* Variation 1 Burn Rate Card */}
              <BurnRateHeader
                subscriptions={subscriptions}
                ratesData={ratesData}
                onRefreshRates={handleRefreshRates}
                isRefreshingRates={isRefreshingRates}
                onOpenCron={() => setIsCronModalOpen(true)}
              />

              {/* Variation 1 Table */}
              <SubscriptionTable
                subscriptions={subscriptions}
                ratesData={ratesData}
                onUpdate={handleUpdateSubscription}
                onDelete={handleDeleteSubscription}
                onOpenNewModal={() => setIsNewModalOpen(true)}
                onOpenCancellationModal={(sub) => setCancellationSub(sub)}
              />
            </div>
          )}

          {/* TAB 2: INGEST */}
          {currentTab === 'ingest' && (
            <div className="space-y-6">
              <section className="bg-white border border-black/[0.08] p-6 sm:p-8 rounded shadow-xs space-y-4">
                <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#E11D48]">
                  Zero-Friction Inbound Setup
                </div>
                <h3 className="text-2xl font-light text-[#1B1B18]">
                  Direct Receipt Forwarding & Extraction
                </h3>
                <p className="text-xs text-[#1B1B18]/70 leading-relaxed max-w-2xl">
                  Inbound emails sent to <code className="bg-black/5 px-1.5 py-0.5 rounded font-mono font-bold text-[#1B1B18]">{user?.forwarding_address}</code>{' '}
                  are handled by the Resend webhook endpoint. Attached invoices are parsed via Gemini 3.8 Flash into strict JSON schema and appended to your audit table.
                </p>
                <button
                  onClick={() => setIsIngestModalOpen(true)}
                  className="bg-[#1B1B18] hover:bg-black text-white px-5 py-2.5 rounded text-xs font-mono font-bold"
                >
                  Open Simulator & PDF Upload
                </button>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-black/[0.08] p-6 rounded shadow-xs">
                  <div className="font-bold text-xs">Layout 1: Figma ($15/mo)</div>
                  <div className="text-xs text-[#1B1B18]/60 mt-1">
                    Stripe PDF structure. Triggers 14-day renewal alert rule.
                  </div>
                </div>
                <div className="bg-white border border-black/[0.08] p-6 rounded shadow-xs">
                  <div className="font-bold text-xs">Layout 2: Vercel ($20/mo)</div>
                  <div className="text-xs text-[#1B1B18]/60 mt-1">
                    App Router Serverless hosting invoice layout.
                  </div>
                </div>
                <div className="bg-white border border-black/[0.08] p-6 rounded shadow-xs">
                  <div className="font-bold text-xs">Layout 3: GitHub ($100/yr)</div>
                  <div className="text-xs text-[#1B1B18]/60 mt-1">
                    Annual billing automatically converted to monthly run-rate ($8.33).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CRONJOBS */}
          {currentTab === 'cron' && (
            <div className="space-y-6">
              <section className="bg-white border border-black/[0.08] p-6 sm:p-8 rounded shadow-xs space-y-4">
                <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#E11D48]">
                  Automated Frist-Cronjob
                </div>
                <h3 className="text-2xl font-light text-[#1B1B18]">
                  14-Day Advance Warning Engine
                </h3>
                <p className="text-xs text-[#1B1B18]/70 leading-relaxed max-w-2xl font-sans">
                  The automated cronjob runs daily at 08:00 UTC via Vercel Cron. Exactly 14 days before a renewal deadline, an email warning is dispatched via Resend to prevent unwanted automatic renewals.
                </p>
                <button
                  onClick={() => setIsCronModalOpen(true)}
                  className="bg-[#1B1B18] hover:bg-black text-white px-5 py-2.5 rounded text-xs font-mono font-bold"
                >
                  Execute Cronjob Now & View Sent Mails
                </button>
              </section>

              {/* History */}
              <section className="bg-white border border-black/[0.08] p-6 rounded shadow-xs space-y-3 font-mono text-xs">
                <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60">
                  Reminder Dispatch Log
                </div>
                {reminderHistory.length === 0 ? (
                  <p className="text-[#1B1B18]/40 py-4">No warning emails dispatched yet.</p>
                ) : (
                  <div className="divide-y divide-black/[0.05]">
                    {reminderHistory.map((rem) => (
                      <div key={rem.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <strong className="text-[#1B1B18]">{rem.provider_name}</strong>
                          <span className="text-[#1B1B18]/50 ml-2">to {rem.recipient_email}</span>
                        </div>
                        <div className="text-[11px] text-[#1B1B18]/60">
                          {new Date(rem.sent_at).toLocaleTimeString('de-DE')} · Target: {rem.cancellation_date}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <EmailIngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        user={user}
        onSuccess={handleIngestSuccess}
      />

      <CronModal
        isOpen={isCronModalOpen}
        onClose={() => setIsCronModalOpen(false)}
        subscriptions={subscriptions}
        user={user}
        history={reminderHistory}
        onTriggerSuccess={handleCronSuccess}
      />

      <CancellationModal
        isOpen={!!cancellationSub}
        onClose={() => setCancellationSub(null)}
        subscription={cancellationSub}
        user={user}
      />

      <NewSubscriptionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateSubscription}
      />
    </div>
  );
}
