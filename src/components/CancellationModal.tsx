import React, { useState } from 'react';
import { X, Mail, Copy, Check, ExternalLink } from 'lucide-react';
import { Subscription, Profile } from '../types';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  user: Profile | null;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  subscription,
  user,
}) => {
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<'de' | 'en'>('en');

  if (!isOpen || !subscription) return null;

  const userEmail = user?.email || 'alex@indiehacker.dev';
  const userName = user?.name || 'Alex Rivera';

  const cancellationTextDe = `Sehr geehrtes Support-Team von ${subscription.provider_name},

hiermit kündige ich mein bestehendes Abonnement (${subscription.provider_name}) zu meiner registrierten E-Mail-Adresse (${userEmail}) fristgerecht zum nächstmöglichen Zeitpunkt bzw. zum ${subscription.cancellation_date || 'Ablauf der aktuellen Periode'}.

Bitte bestätigen Sie mir den Eingang dieser Kündigung sowie das genaue Vertragsende schriftlich.

Mit freundlichen Grüßen,
${userName}`;

  const cancellationTextEn = `Dear ${subscription.provider_name} Support Team,

I hereby cancel my active subscription for account ${userEmail} effective as of the earliest possible date (or by ${subscription.cancellation_date || 'the end of the current billing cycle'}).

Please provide written confirmation of this cancellation and the exact termination date.

Sincerely,
${userName}`;

  const textToUse = language === 'de' ? cancellationTextDe : cancellationTextEn;

  const handleCopy = () => {
    navigator.clipboard.writeText(textToUse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = `mailto:support@${subscription.provider_name.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(
    `Cancellation Subscription: ${subscription.provider_name} (${userEmail})`
  )}&body=${encodeURIComponent(textToUse)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white border border-black/10 rounded p-6 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.08] pb-3">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#E11D48]">
              Cancellation Notice
            </div>
            <h3 className="text-base font-semibold text-[#1B1B18]">
              {subscription.provider_name}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#1B1B18]/50 hover:text-[#1B1B18]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Language switch */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#1B1B18]/60 uppercase text-[10px] tracking-wider font-bold">Template Language:</span>
          <div className="flex items-center gap-1 border border-black/10 p-0.5 rounded">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                language === 'en' ? 'bg-[#1B1B18] text-white font-bold' : 'text-[#1B1B18]/60 hover:text-[#1B1B18]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('de')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                language === 'de' ? 'bg-[#1B1B18] text-white font-bold' : 'text-[#1B1B18]/60 hover:text-[#1B1B18]'
              }`}
            >
              Deutsch
            </button>
          </div>
        </div>

        {/* Text template box */}
        <div className="border border-black/10 bg-[#F8F7F4] p-4 font-mono text-[11px] text-[#1B1B18] leading-relaxed whitespace-pre-wrap select-all max-h-56 overflow-y-auto rounded">
          {textToUse}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 border border-black/15 bg-transparent hover:bg-black/5 py-2 text-xs font-mono font-bold text-[#1B1B18] rounded transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#E11D48]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Letter</span>
              </>
            )}
          </button>

          <a
            href={mailtoUrl}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#1B1B18] hover:bg-black py-2 text-xs font-mono font-bold text-white rounded transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Open in Mail (mailto:)</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
