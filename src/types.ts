export type Currency = 'EUR' | 'USD' | 'GBP';
export type BillingInterval = 'monthly' | 'yearly';

export interface Profile {
  id: string;
  email: string;
  forwarding_address: string;
  name?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  provider_name: string;
  amount: number;
  currency: Currency;
  billing_interval: BillingInterval;
  cancellation_date: string | null; // ISO YYYY-MM-DD
  original_pdf_url?: string | null;
  created_at: string;
  notes?: string;
}

export interface RatesData {
  rates: {
    USD_TO_EUR: number;
    GBP_TO_EUR: number;
    EUR_TO_EUR: number;
  };
  source: string;
  fetchedAt: number;
}

export interface SentReminder {
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

export interface TrackingEvent {
  id: string;
  event: string;
  user_id: string;
  properties: Record<string, any>;
  timestamp: string;
}
