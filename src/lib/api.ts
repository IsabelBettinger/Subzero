import { Subscription, Profile, RatesData, SentReminder, TrackingEvent } from '../types';

export async function fetchCurrentUser(): Promise<Profile> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) throw new Error('Fehler beim Laden des Profils');
  const data = await res.json();
  return data.user;
}

export async function loginUser(email: string): Promise<Profile> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Login fehlgeschlagen');
  const data = await res.json();
  return data.user;
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const res = await fetch('/api/subscriptions');
  if (!res.ok) throw new Error('Fehler beim Laden der Abonnements');
  const data = await res.json();
  return data.subscriptions;
}

export async function updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription> {
  const res = await fetch(`/api/subscriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Fehler beim Aktualisieren des Abonnements');
  const data = await res.json();
  return data.subscription;
}

export async function createSubscription(sub: Partial<Subscription>): Promise<Subscription> {
  const res = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
  if (!res.ok) throw new Error('Fehler beim Anlegen des Abonnements');
  const data = await res.json();
  return data.subscription;
}

export async function deleteSubscription(id: string): Promise<void> {
  const res = await fetch(`/api/subscriptions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Fehler beim Löschen des Abonnements');
}

export async function fetchRates(): Promise<RatesData> {
  const res = await fetch('/api/rates');
  if (!res.ok) throw new Error('Fehler beim Abrufen der Wechselkurse');
  return res.json();
}

export async function extractInvoiceAI(params: { text?: string; pdfBase64?: string; filename?: string }): Promise<{
  extracted: any;
  subscription: Subscription;
}> {
  const res = await fetch('/api/invoices/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Extraktion fehlgeschlagen' }));
    throw new Error(err.error || 'Extraktion fehlgeschlagen');
  }
  return res.json();
}

export async function triggerInboundWebhook(payload: any): Promise<any> {
  const res = await fetch('/api/webhooks/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Webhook Simulation fehlgeschlagen');
  return res.json();
}

export async function triggerCronReminders(): Promise<{
  checked_subscriptions: number;
  reminders_sent_count: number;
  reminders: SentReminder[];
}> {
  const res = await fetch('/api/cron/reminders', { method: 'POST' });
  if (!res.ok) throw new Error('Cronjob Ausführung fehlgeschlagen');
  return res.json();
}

export async function fetchSentReminders(): Promise<SentReminder[]> {
  const res = await fetch('/api/cron/history');
  if (!res.ok) return [];
  const data = await res.json();
  return data.reminders || [];
}

export async function fetchTrackingEvents(): Promise<TrackingEvent[]> {
  const res = await fetch('/api/tracking/events');
  if (!res.ok) return [];
  const data = await res.json();
  return data.events || [];
}

export async function trackEvent(event: string, properties?: Record<string, any>): Promise<void> {
  try {
    await fetch('/api/tracking/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties }),
    });
  } catch (err) {
    console.warn('Tracking error', err);
  }
}
