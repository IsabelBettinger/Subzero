import React, { useState } from 'react';
import {
  X,
  Mail,
  Upload,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { Profile, Subscription } from '../types';
import { triggerInboundWebhook, extractInvoiceAI } from '../lib/api';

interface EmailIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Profile | null;
  onSuccess: (sub: Subscription) => void;
}

export const EmailIngestModal: React.FC<EmailIngestModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'webhook'>('presets');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const [invoiceText, setInvoiceText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const forwardAddress = user?.forwarding_address || 'u-7f39b2@in.subtracker.app';

  const runPresetTest = async (preset: 'figma' | 'vercel' | 'github' | 'notion') => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let payload: any = {};

    if (preset === 'figma') {
      payload = {
        to: forwardAddress,
        from: 'billing@figma.com',
        subject: 'Your Figma receipt #INV-849204',
        text: `Thanks for using Figma! Receipt for Alex Rivera. Plan: Figma Professional Seat. Amount: $15.00 USD. Billing interval: Monthly. Renewal date: ${new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10)}. Payment method: Visa ending in 4242.`,
        attachments: [{ filename: 'invoice-figma-pro-15usd.pdf' }],
      };
    } else if (preset === 'vercel') {
      payload = {
        to: forwardAddress,
        from: 'invoices@vercel.com',
        subject: 'Vercel Invoice #VER-2026-992',
        text: `Invoice from Vercel Inc. Team Pro Plan. 1 Team Member. Amount: $20.00 USD. Billing frequency: Monthly. Next cycle renewal: ${new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10)}.`,
        attachments: [{ filename: 'vercel-team-pro-invoice.pdf' }],
      };
    } else if (preset === 'github') {
      payload = {
        to: forwardAddress,
        from: 'billing@github.com',
        subject: 'Your GitHub Invoice #GH-YEARLY-0182',
        text: `Receipt from GitHub Inc. Product: GitHub Copilot Business (Annual Plan). Total Paid: $100.00 USD. Billing Interval: Yearly. Subscription Period: 1 Year. Cancellation/Renewal date: ${new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10)}.`,
        attachments: [{ filename: 'github-copilot-annual.pdf' }],
      };
    } else {
      payload = {
        to: forwardAddress,
        from: 'billing@makenotion.com',
        subject: 'Notion Plus Subscription Receipt',
        text: `Invoice from Notion Labs Inc. Plan: Notion Plus Workspace. Amount: 10.00 EUR. Intervall: Monatlich. Kündigungsfrist / Verlängerung: ${new Date(
          Date.now() + 25 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10)}.`,
        attachments: [{ filename: 'notion-plus-receipt.pdf' }],
      };
    }

    try {
      const res = await triggerInboundWebhook(payload);
      setSuccessMsg(`Extracted successfully: ${res.created_subscription.provider_name} (${res.created_subscription.amount} ${res.created_subscription.currency})`);
      onSuccess(res.created_subscription);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ingest error');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractCustom = async () => {
    if (!invoiceText.trim() && !selectedFile) {
      setErrorMsg('Please enter invoice text or select a PDF invoice.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let pdfBase64: string | undefined = undefined;

      if (selectedFile) {
        const buffer = await selectedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        pdfBase64 = btoa(binary);
      }

      const res = await extractInvoiceAI({
        text: invoiceText,
        pdfBase64,
        filename: selectedFile?.name || 'custom-invoice.pdf',
      });

      setSuccessMsg(`AI Extraction completed: ${res.subscription.provider_name} (${res.subscription.amount} ${res.subscription.currency})`);
      onSuccess(res.subscription);
      setInvoiceText('');
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const curlCommand = `curl -X POST http://localhost:3000/api/webhooks/resend \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "${forwardAddress}",
    "from": "billing@figma.com",
    "subject": "Figma Invoice #4489",
    "text": "Amount: $15.00 USD, Monthly billing, Next renewal: 2026-11-24"
  }'`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white border border-black/10 rounded p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.08] pb-4">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#E11D48]">
              Inbound Pipeline
            </div>
            <h3 className="text-xl font-light tracking-[-0.02em] text-[#1B1B18]">
              E-Mail Ingest & AI Extraction
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#1B1B18]/60 hover:text-[#1B1B18] rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 border border-black/10 p-1 rounded font-mono text-xs">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 px-3 rounded transition-colors ${
              activeTab === 'presets' ? 'bg-[#1B1B18] text-white font-bold' : 'text-[#1B1B18]/70 hover:text-[#1B1B18]'
            }`}
          >
            DoD Layouts (Figma, Vercel, GitHub)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 px-3 rounded transition-colors ${
              activeTab === 'upload' ? 'bg-[#1B1B18] text-white font-bold' : 'text-[#1B1B18]/70 hover:text-[#1B1B18]'
            }`}
          >
            Upload PDF / Paste Text
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex-1 py-1.5 px-3 rounded transition-colors ${
              activeTab === 'webhook' ? 'bg-[#1B1B18] text-white font-bold' : 'text-[#1B1B18]/70 hover:text-[#1B1B18]'
            }`}
          >
            cURL Webhook
          </button>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="border border-emerald-500/30 bg-emerald-50 p-3 rounded text-xs text-emerald-800 font-mono flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="border border-[#E11D48]/30 bg-rose-50 p-3 rounded text-xs text-[#E11D48] font-mono">
            {errorMsg}
          </div>
        )}

        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <p className="text-xs text-[#1B1B18]/70">
              Per PRD Definition of Done, at least 3 invoice formats (Figma, Vercel, GitHub) must be
              tested end-to-end. Click to simulate incoming email forwarding:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={loading}
                onClick={() => runPresetTest('figma')}
                className="p-4 border border-black/10 bg-[#F8F7F4] hover:border-black rounded text-left transition-colors group flex items-start justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-[#1B1B18]">Figma Professional</div>
                  <div className="font-mono text-[11px] text-[#1B1B18]/60 mt-0.5">$15.00 USD / Monthly</div>
                  <div className="text-[10px] font-mono text-[#E11D48] mt-1">Triggers 14d deadline alert</div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1B1B18]/40 group-hover:text-[#1B1B18] group-hover:translate-x-0.5 transition-all mt-0.5" />
              </button>

              <button
                disabled={loading}
                onClick={() => runPresetTest('vercel')}
                className="p-4 border border-black/10 bg-[#F8F7F4] hover:border-black rounded text-left transition-colors group flex items-start justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-[#1B1B18]">Vercel Team Pro</div>
                  <div className="font-mono text-[11px] text-[#1B1B18]/60 mt-0.5">$20.00 USD / Monthly</div>
                  <div className="text-[10px] font-mono text-[#1B1B18]/50 mt-1">Next.js Hosting Structure</div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1B1B18]/40 group-hover:text-[#1B1B18] group-hover:translate-x-0.5 transition-all mt-0.5" />
              </button>

              <button
                disabled={loading}
                onClick={() => runPresetTest('github')}
                className="p-4 border border-black/10 bg-[#F8F7F4] hover:border-black rounded text-left transition-colors group flex items-start justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-[#1B1B18]">GitHub Copilot Business</div>
                  <div className="font-mono text-[11px] text-[#1B1B18]/60 mt-0.5">$100.00 USD / Yearly</div>
                  <div className="text-[10px] font-mono text-[#1B1B18]/50 mt-1">Normalized to $8.33 / Mo</div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1B1B18]/40 group-hover:text-[#1B1B18] group-hover:translate-x-0.5 transition-all mt-0.5" />
              </button>

              <button
                disabled={loading}
                onClick={() => runPresetTest('notion')}
                className="p-4 border border-black/10 bg-[#F8F7F4] hover:border-black rounded text-left transition-colors group flex items-start justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-[#1B1B18]">Notion Plus Workspace</div>
                  <div className="font-mono text-[11px] text-[#1B1B18]/60 mt-0.5">10.00 EUR / Monthly</div>
                  <div className="text-[10px] font-mono text-[#1B1B18]/50 mt-1">Native EUR Invoice</div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#1B1B18]/40 group-hover:text-[#1B1B18] group-hover:translate-x-0.5 transition-all mt-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="border border-dashed border-black/20 bg-[#F8F7F4] p-5 rounded text-center">
              <Upload className="mx-auto h-6 w-6 text-[#1B1B18]/40 mb-2" />
              <label className="cursor-pointer font-mono text-xs font-bold text-[#1B1B18] underline hover:text-[#E11D48]">
                <span>Select PDF invoice file</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <div className="font-mono text-[11px] text-[#1B1B18]/60 mt-1">
                {selectedFile ? selectedFile.name : 'Or drop invoice PDF here'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-[0.15em] text-[#1B1B18]/60 mb-1">
                Or Paste Raw Receipt Text
              </label>
              <textarea
                rows={3}
                placeholder="Stripe Receipt: Slack Pro Team... Amount: $12.50 USD... Next charge: 2026-12-01"
                value={invoiceText}
                onChange={(e) => setInvoiceText(e.target.value)}
                className="w-full border border-black/10 bg-transparent p-2.5 text-xs text-[#1B1B18] font-mono rounded focus:outline-none focus:border-black"
              />
            </div>

            <button
              disabled={loading}
              onClick={handleExtractCustom}
              className="w-full flex items-center justify-center gap-2 bg-[#1B1B18] hover:bg-black text-white py-2.5 text-xs font-mono font-bold rounded transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Parsing with Gemini 3.8 Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-[#E11D48]" />
                  <span>Parse Invoice & Save to Audit</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Webhook cURL Tab */}
        {activeTab === 'webhook' && (
          <div className="space-y-3 font-mono text-xs">
            <p className="text-[#1B1B18]/70">
              Live Resend Inbound endpoint (<code className="bg-black/5 px-1 py-0.5 rounded font-bold">POST /api/webhooks/resend</code>):
            </p>
            <div className="relative border border-black/10 bg-[#F8F7F4] p-3 rounded text-[11px] text-[#1B1B18] overflow-x-auto">
              <pre className="pr-12">{curlCommand}</pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-black/[0.08] pt-4 flex items-center justify-between font-mono text-[11px] text-[#1B1B18]/50">
          <div>SCHEMA: Strict Zod format (PRD Section C)</div>
          <button onClick={onClose} className="hover:text-[#1B1B18] underline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
