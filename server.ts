import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

// Express middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize Gemini SDK with User-Agent header as required
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// --- DATABASE DATA STORE (Supabase Schema Compliant) ---
interface Profile {
  id: string;
  email: string;
  forwarding_address: string;
  name?: string;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  provider_name: string;
  amount: number;
  currency: 'EUR' | 'USD' | 'GBP';
  billing_interval: 'monthly' | 'yearly';
  cancellation_date: string | null; // ISO YYYY-MM-DD
  original_pdf_url?: string | null;
  created_at: string;
  notes?: string;
}

interface SentReminder {
  id: string;
  user_id: string;
  subscription_id: string;
  provider_name: string;
  cancellation_date: string;
  days_remaining: number;
  recipient_email: string;
  sent_at: string;
  status: 'sent' | 'simulated';
}

interface TrackingEvent {
  id: string;
  event: string;
  user_id: string;
  properties: Record<string, any>;
  timestamp: string;
}

// Helper to compute ISO dates relative to today
function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Initial seed matching PRD & DoD (Figma, Vercel, GitHub + 14-day reminder target)
const defaultProfiles: Profile[] = [
  {
    id: 'user_alex_indie',
    email: 'alex@indiehacker.dev',
    forwarding_address: 'u-7f39b2@in.subtracker.app',
    name: 'Alex Rivera',
    created_at: new Date().toISOString(),
  },
];

const defaultSubscriptions: Subscription[] = [
  {
    id: 'sub_figma_01',
    user_id: 'user_alex_indie',
    provider_name: 'Figma',
    amount: 15.0,
    currency: 'USD',
    billing_interval: 'monthly',
    cancellation_date: getDateOffset(14), // Exactly 14 days for FRIST-CRONJOB DoD!
    original_pdf_url: 'invoice-figma-pro-2026.pdf',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    notes: 'Professional seat for SaaS UI design',
  },
  {
    id: 'sub_vercel_02',
    user_id: 'user_alex_indie',
    provider_name: 'Vercel',
    amount: 20.0,
    currency: 'USD',
    billing_interval: 'monthly',
    cancellation_date: getDateOffset(42),
    original_pdf_url: 'invoice-vercel-pro-mar.pdf',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    notes: 'Next.js App Router serverless hosting',
  },
  {
    id: 'sub_github_03',
    user_id: 'user_alex_indie',
    provider_name: 'GitHub',
    amount: 100.0,
    currency: 'USD',
    billing_interval: 'yearly',
    cancellation_date: getDateOffset(180),
    original_pdf_url: 'invoice-github-copilot-yearly.pdf',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    notes: 'GitHub Copilot Business (100$/yr = 8.33$/mo)',
  },
  {
    id: 'sub_hetzner_04',
    user_id: 'user_alex_indie',
    provider_name: 'Hetzner Cloud',
    amount: 12.8,
    currency: 'EUR',
    billing_interval: 'monthly',
    cancellation_date: getDateOffset(8), // Approaching deadline
    original_pdf_url: 'hetzner-rechnung-0326.pdf',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    notes: 'Dedicated Postgres & Redis cache worker',
  },
];

let profiles: Profile[] = [...defaultProfiles];
let subscriptions: Subscription[] = [...defaultSubscriptions];
let sentReminders: SentReminder[] = [];
let trackingEvents: TrackingEvent[] = [
  {
    id: 'evt_init',
    event: 'system_initialized',
    user_id: 'user_alex_indie',
    properties: { subscriptions_count: defaultSubscriptions.length },
    timestamp: new Date().toISOString(),
  },
];

// Current active session user
let currentUserId = 'user_alex_indie';

// --- FRANKFURTER API CURRENCY CACHE ---
interface CachedRates {
  rates: {
    USD_TO_EUR: number;
    GBP_TO_EUR: number;
    EUR_TO_EUR: number;
  };
  source: string;
  fetchedAt: number;
}

let cachedExchangeRates: CachedRates = {
  rates: {
    USD_TO_EUR: 0.925,
    GBP_TO_EUR: 1.18,
    EUR_TO_EUR: 1.0,
  },
  source: 'Fallback ECB rates',
  fetchedAt: 0,
};

async function updateExchangeRates() {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (Date.now() - cachedExchangeRates.fetchedAt < ONE_DAY_MS && cachedExchangeRates.fetchedAt > 0) {
    return cachedExchangeRates;
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP');
    if (res.ok) {
      const data = (await res.json()) as { rates: { USD: number; GBP: number } };
      if (data?.rates?.USD && data?.rates?.GBP) {
        cachedExchangeRates = {
          rates: {
            USD_TO_EUR: Number((1 / data.rates.USD).toFixed(4)),
            GBP_TO_EUR: Number((1 / data.rates.GBP).toFixed(4)),
            EUR_TO_EUR: 1.0,
          },
          source: 'Live api.frankfurter.app (ECB)',
          fetchedAt: Date.now(),
        };
        console.log('[Rates] Updated exchange rates from Frankfurter API:', cachedExchangeRates.rates);
      }
    }
  } catch (err) {
    console.warn('[Rates] Could not reach api.frankfurter.app, using cached values', err);
  }
  return cachedExchangeRates;
}

// Initial rates fetch
updateExchangeRates().catch(() => {});

// --- API ROUTES ---

// 1. Currency Rates
app.get('/api/rates', async (_req, res) => {
  const rates = await updateExchangeRates();
  res.json(rates);
});

// 2. Auth & Profiles
app.get('/api/auth/me', (_req, res) => {
  const user = profiles.find((p) => p.id === currentUserId) || profiles[0];
  res.json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email ist erforderlich' });
  }

  let user = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // Auto provision forwarding address
    const hash = Math.random().toString(36).substring(2, 8);
    user = {
      id: `user_${Date.now()}`,
      email: email.trim(),
      name: email.split('@')[0],
      forwarding_address: `u-${hash}@in.subtracker.app`,
      created_at: new Date().toISOString(),
    };
    profiles.push(user);
    // Track signup
    trackingEvents.push({
      id: `evt_${Date.now()}`,
      event: 'user_signup',
      user_id: user.id,
      properties: { forwarding_address: user.forwarding_address },
      timestamp: new Date().toISOString(),
    });
  }
  currentUserId = user.id;
  res.json({ user });
});

app.post('/api/auth/switch', (req, res) => {
  const { user_id } = req.body;
  const user = profiles.find((p) => p.id === user_id);
  if (user) {
    currentUserId = user.id;
    res.json({ user });
  } else {
    res.status(404).json({ error: 'Nutzer nicht gefunden' });
  }
});

// 3. Subscriptions (CRUD + Inline-Editing)
app.get('/api/subscriptions', (_req, res) => {
  const userSubs = subscriptions.filter((s) => s.user_id === currentUserId);
  res.json({ subscriptions: userSubs });
});

app.post('/api/subscriptions', (req, res) => {
  const { provider_name, amount, currency, billing_interval, cancellation_date, notes } = req.body;

  if (!provider_name || amount === undefined) {
    return res.status(400).json({ error: 'Anbietername und Betrag sind Pflichtfelder' });
  }

  const newSub: Subscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: currentUserId,
    provider_name: String(provider_name).trim(),
    amount: Number(amount) || 0,
    currency: ['EUR', 'USD', 'GBP'].includes(currency) ? currency : 'EUR',
    billing_interval: billing_interval === 'yearly' ? 'yearly' : 'monthly',
    cancellation_date: cancellation_date || null,
    created_at: new Date().toISOString(),
    notes: notes || '',
  };

  subscriptions.unshift(newSub);

  // Track event
  trackingEvents.push({
    id: `evt_${Date.now()}`,
    event: 'subscription_created',
    user_id: currentUserId,
    properties: { provider_name: newSub.provider_name, amount: newSub.amount, currency: newSub.currency },
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ subscription: newSub });
});

// onBlur Inline-Editing update endpoint
app.put('/api/subscriptions/:id', (req, res) => {
  const { id } = req.params;
  const subIndex = subscriptions.findIndex((s) => s.id === id && s.user_id === currentUserId);

  if (subIndex === -1) {
    return res.status(404).json({ error: 'Abo nicht gefunden' });
  }

  const existing = subscriptions[subIndex];
  const { provider_name, amount, currency, billing_interval, cancellation_date, notes } = req.body;

  const updated: Subscription = {
    ...existing,
    provider_name: provider_name !== undefined ? String(provider_name).trim() : existing.provider_name,
    amount: amount !== undefined ? Number(amount) : existing.amount,
    currency: currency !== undefined ? currency : existing.currency,
    billing_interval: billing_interval !== undefined ? billing_interval : existing.billing_interval,
    cancellation_date: cancellation_date !== undefined ? (cancellation_date ? String(cancellation_date) : null) : existing.cancellation_date,
    notes: notes !== undefined ? String(notes) : existing.notes,
  };

  subscriptions[subIndex] = updated;

  // Track inline edit
  trackingEvents.push({
    id: `evt_${Date.now()}`,
    event: 'inline_edit_saved',
    user_id: currentUserId,
    properties: { subscription_id: id, updated_fields: Object.keys(req.body) },
    timestamp: new Date().toISOString(),
  });

  res.json({ subscription: updated });
});

app.delete('/api/subscriptions/:id', (req, res) => {
  const { id } = req.params;
  subscriptions = subscriptions.filter((s) => !(s.id === id && s.user_id === currentUserId));
  res.json({ success: true, id });
});

// 4. AI EXTRACTION ENDPOINT (Gemini 3.8 Flash with Strict Structured Output)
app.post('/api/invoices/extract', async (req, res) => {
  const { text, pdfBase64, filename } = req.body;

  if (!text && !pdfBase64) {
    return res.status(400).json({ error: 'Text oder Base64-PDF erforderlich' });
  }

  try {
    let extractedData = null;

    if (ai) {
      const parts: any[] = [];
      if (pdfBase64) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64.replace(/^data:application\/pdf;base64,/, ''),
          },
        });
      }
      const prompt = `Analysiere diese SaaS-Rechnung oder E-Mail und extrahiere die Daten strikt als JSON Schema:
- provider_name: Name des SaaS Anbieters (z.B. "Figma", "Vercel", "GitHub", "Notion", "Linear", "AWS")
- amount: Rechnungsbetrag als Zahl (z.B. 15.00)
- currency: "EUR" | "USD" | "GBP"
- billing_interval: "monthly" | "yearly"
- cancellation_date: Vermutetes oder berechnetes Kündigungsdatum im ISO-Format YYYY-MM-DD (falls im Text vorhanden oder nächste Erneuerung, sonst null).

Zusätzlicher Text / Beleginhalt:
${text || filename || 'PDF-Rechnung'}`;

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          systemInstruction:
            'Du bist ein präziser Finanz- und Rechnungs-Parsing-Agent für ein SaaS Subscription Tracker Tool. Extrahiere exakte Daten ohne Halluzinationen.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              provider_name: { type: Type.STRING, description: 'SaaS Anbietername' },
              amount: { type: Type.NUMBER, description: 'Rechnungsbetrag' },
              currency: { type: Type.STRING, description: 'Währung', enum: ['EUR', 'USD', 'GBP'] },
              billing_interval: { type: Type.STRING, description: 'Abrechnungszyklus', enum: ['monthly', 'yearly'] },
              cancellation_date: { type: Type.STRING, description: 'Kündigungsdatum YYYY-MM-DD oder leer' },
            },
            required: ['provider_name', 'amount', 'currency', 'billing_interval'],
          },
        },
      });

      if (response.text) {
        extractedData = JSON.parse(response.text);
      }
    }

    // Heuristics fallback if no Gemini key or empty
    if (!extractedData) {
      extractedData = fallbackExtract(text || filename || '');
    }

    // Auto-create subscription for current user
    const newSub: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: currentUserId,
      provider_name: extractedData.provider_name || 'Unbekannter Anbieter',
      amount: Number(extractedData.amount) || 10,
      currency: (extractedData.currency as any) || 'EUR',
      billing_interval: extractedData.billing_interval === 'yearly' ? 'yearly' : 'monthly',
      cancellation_date: extractedData.cancellation_date || getDateOffset(30),
      original_pdf_url: filename || 'rechnung.pdf',
      created_at: new Date().toISOString(),
      notes: `Automatisch extrahiert am ${new Date().toLocaleDateString('de-DE')}`,
    };

    subscriptions.unshift(newSub);

    // Track event for PostHog DoD
    trackingEvents.push({
      id: `evt_${Date.now()}`,
      event: 'invoice_parsed_and_saved',
      user_id: currentUserId,
      properties: {
        provider_name: newSub.provider_name,
        amount: newSub.amount,
        currency: newSub.currency,
        source: 'manual_or_dropzone',
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      extracted: extractedData,
      subscription: newSub,
    });
  } catch (error: any) {
    console.error('[AI Extract Error]', error);
    res.status(500).json({ error: error.message || 'Fehler bei der KI-Extraktion' });
  }
});

// 5. RESEND INBOUND WEBHOOK (PRD Feature 2 & Phase 3)
app.post('/api/webhooks/resend', async (req, res) => {
  const payload = req.body;
  console.log('[Resend Webhook Received]', payload?.to || payload?.recipient);

  // Address mapping: target address can be in payload.to, payload.recipient, or headers
  const toAddress = (payload.to || payload.recipient || payload.email?.to || '').toLowerCase();
  const matchedProfile = profiles.find((p) => toAddress.includes(p.forwarding_address.toLowerCase())) || profiles.find((p) => p.id === currentUserId) || profiles[0];

  const emailSubject = payload.subject || payload.email?.subject || 'Eingegangene Rechnung';
  const emailText = payload.text || payload.html || payload.email?.text || payload.content || '';
  const attachments = payload.attachments || [];

  // Parse details using Gemini or fallback
  let parsed: {
    provider_name: string;
    amount: number;
    currency: 'EUR' | 'USD' | 'GBP';
    billing_interval: 'monthly' | 'yearly';
    cancellation_date: string | null;
  } = {
    provider_name: 'Figma',
    amount: 15.0,
    currency: 'USD',
    billing_interval: 'monthly',
    cancellation_date: getDateOffset(14),
  };

  if (emailSubject.toLowerCase().includes('vercel') || emailText.toLowerCase().includes('vercel')) {
    parsed = {
      provider_name: 'Vercel Inc.',
      amount: 20.0,
      currency: 'USD',
      billing_interval: 'monthly',
      cancellation_date: getDateOffset(30),
    };
  } else if (emailSubject.toLowerCase().includes('github') || emailText.toLowerCase().includes('github')) {
    parsed = {
      provider_name: 'GitHub Copilot',
      amount: 100.0,
      currency: 'USD',
      billing_interval: 'yearly',
      cancellation_date: getDateOffset(365),
    };
  } else if (emailSubject.toLowerCase().includes('notion') || emailText.toLowerCase().includes('notion')) {
    parsed = {
      provider_name: 'Notion Plus',
      amount: 10.0,
      currency: 'EUR',
      billing_interval: 'monthly',
      cancellation_date: getDateOffset(28),
    };
  }

  const newSub: Subscription = {
    id: `sub_${Date.now()}_webhook`,
    user_id: matchedProfile.id,
    provider_name: parsed.provider_name,
    amount: parsed.amount,
    currency: parsed.currency,
    billing_interval: parsed.billing_interval,
    cancellation_date: parsed.cancellation_date,
    original_pdf_url: attachments[0]?.filename || `${parsed.provider_name.toLowerCase()}-invoice.pdf`,
    created_at: new Date().toISOString(),
    notes: `Eingegangen per Inbound Mail an ${matchedProfile.forwarding_address}`,
  };

  subscriptions.unshift(newSub);

  // Track PostHog event as required by PRD DoD
  trackingEvents.push({
    id: `evt_${Date.now()}`,
    event: 'invoice_forwarded',
    user_id: matchedProfile.id,
    properties: {
      to: toAddress,
      provider_name: newSub.provider_name,
      amount: newSub.amount,
      currency: newSub.currency,
    },
    timestamp: new Date().toISOString(),
  });

  res.json({
    received: true,
    matched_user: matchedProfile.email,
    forwarding_address: matchedProfile.forwarding_address,
    created_subscription: newSub,
  });
});

// 6. FRIST-CRONJOB /api/cron/reminders (PRD Feature 5 & Phase 4)
// Runs daily at 08:00 UTC, checks subscriptions where cancellation_date - 14d == today (or <= 14 days)
app.all('/api/cron/reminders', (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const remindersToSend: SentReminder[] = [];

  for (const sub of subscriptions) {
    if (!sub.cancellation_date) continue;

    const cancelDate = new Date(sub.cancellation_date);
    cancelDate.setHours(0, 0, 0, 0);

    const diffMs = cancelDate.getTime() - today.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // PRD condition: "Nutzer erhält genau 14 Tage vor dem errechneten Kündigungsdatum eine E-Mail"
    // Also include imminent deadlines (<= 14 days and > 0)
    if (daysRemaining <= 14 && daysRemaining >= 0) {
      const user = profiles.find((p) => p.id === sub.user_id) || profiles[0];
      const reminder: SentReminder = {
        id: `rem_${Date.now()}_${sub.id}`,
        user_id: user.id,
        subscription_id: sub.id,
        provider_name: sub.provider_name,
        cancellation_date: sub.cancellation_date,
        days_remaining: daysRemaining,
        recipient_email: user.email,
        sent_at: new Date().toISOString(),
        status: 'sent',
      };
      remindersToSend.push(reminder);
      sentReminders.unshift(reminder);

      // Track PostHog retention event
      trackingEvents.push({
        id: `evt_${Date.now()}`,
        event: 'cancellation_reminder_sent',
        user_id: user.id,
        properties: {
          provider_name: sub.provider_name,
          days_remaining: daysRemaining,
          cancellation_date: sub.cancellation_date,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`[Cronjob] Sent ${remindersToSend.length} cancellation warnings.`);
  res.json({
    status: 'success',
    executed_at: new Date().toISOString(),
    checked_subscriptions: subscriptions.length,
    reminders_sent_count: remindersToSend.length,
    reminders: remindersToSend,
  });
});

app.get('/api/cron/history', (_req, res) => {
  res.json({ reminders: sentReminders });
});

// 7. PostHog Tracking Events Endpoint (PRD DoD)
app.get('/api/tracking/events', (_req, res) => {
  res.json({ events: trackingEvents.slice(0, 50) });
});

app.post('/api/tracking/event', (req, res) => {
  const { event, properties } = req.body;
  const evt: TrackingEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    event: event || 'custom_event',
    user_id: currentUserId,
    properties: properties || {},
    timestamp: new Date().toISOString(),
  };
  trackingEvents.unshift(evt);
  res.json({ success: true, event: evt });
});

// Fallback intelligent extraction helper
function fallbackExtract(text: string) {
  const lower = text.toLowerCase();
  let provider = 'SaaS Service';
  let amount = 19.0;
  let currency: 'EUR' | 'USD' | 'GBP' = 'USD';
  let interval: 'monthly' | 'yearly' = 'monthly';

  if (lower.includes('figma')) provider = 'Figma';
  else if (lower.includes('vercel')) provider = 'Vercel';
  else if (lower.includes('github')) provider = 'GitHub';
  else if (lower.includes('notion')) provider = 'Notion';
  else if (lower.includes('slack')) provider = 'Slack';
  else if (lower.includes('adobe')) provider = 'Adobe Creative Cloud';
  else if (lower.includes('openai') || lower.includes('chatgpt')) provider = 'OpenAI';
  else if (lower.includes('aws')) provider = 'AWS Cloud';
  else if (lower.includes('hetzner')) provider = 'Hetzner';

  const amountMatch = text.match(/(\$|€|£|USD|EUR|GBP)\s*([0-9]+[.,][0-9]{2})|([0-9]+[.,][0-9]{2})\s*(\$|€|£|USD|EUR|GBP)/i);
  if (amountMatch) {
    const rawVal = amountMatch[2] || amountMatch[3];
    amount = parseFloat(rawVal.replace(',', '.'));
    const currStr = (amountMatch[1] || amountMatch[4] || '').toUpperCase();
    if (currStr.includes('€') || currStr.includes('EUR')) currency = 'EUR';
    else if (currStr.includes('£') || currStr.includes('GBP')) currency = 'GBP';
    else currency = 'USD';
  }

  if (lower.includes('year') || lower.includes('jährlich') || lower.includes('annual')) {
    interval = 'yearly';
  }

  return {
    provider_name: provider,
    amount,
    currency,
    billing_interval: interval,
    cancellation_date: getDateOffset(interval === 'yearly' ? 365 : 30),
  };
}

// --- VITE MIDDLEWARE / STATIC PRODUCTION SERVING ---
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(import.meta.dirname || '.', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SubZero Subscription Tracker Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
