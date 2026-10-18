import React from 'react';
import { ShieldCheck, Lock, Trash2, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-slate-100">
      <div className="space-y-2 border-b border-[#233827] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/10 px-3 py-1 rounded-full border border-[#bbf451]/30">
          Trust &amp; Document Security
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-syne">
          Privacy Policy &amp; Document Retention Lifecycle
        </h1>
        <p className="text-xs text-slate-400">
          Last revised: October 2026 • Effective platform-wide
        </p>
      </div>

      <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-6 text-slate-300">
        <section className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-6 sm:p-7 rounded-3xl border border-[#273d2c] shadow-[0_12px_36px_rgba(0,0,0,0.5)] space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-syne">
            <EyeOff className="w-5 h-5 text-[#bbf451]" />
            1. Zero Phone Number Exposure Guarantee
          </h2>
          <p>
            Traditional document printing at local photocopy centers forces customers to share their personal WhatsApp or phone numbers with shop counter staff, exposing profile photos, status updates, and personal contact info.
          </p>
          <p>
            <strong className="text-white">Smart Xerox eliminates this completely:</strong> Walk-in guest customers are never required to supply an email address, phone number, or account password to print documents. All orders are indexed using high-entropy random order references and cryptographic client tokens.
          </p>
        </section>

        <section className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-6 sm:p-7 rounded-3xl border border-[#273d2c] shadow-[0_12px_36px_rgba(0,0,0,0.5)] space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-syne">
            <Lock className="w-5 h-5 text-[#bbf451]" />
            2. Private Storage Isolation &amp; Sandboxing
          </h2>
          <p>
            Uploaded document bytes (PDF, JPG, PNG) are stored in an isolated private directory completely inaccessible to public HTTP requests. Files are indexed using opaque UUID keys rather than customer identities.
          </p>
          <p>
            Shop owners can only access authorized print previews through a sandboxed, token-verified stream (<code className="text-[#bbf451] bg-[#0c140e] px-1.5 py-0.5 rounded border border-[#233827]">sandbox</code>, <code className="text-[#bbf451] bg-[#0c140e] px-1.5 py-0.5 rounded border border-[#233827]">no-store</code>, <code className="text-[#bbf451] bg-[#0c140e] px-1.5 py-0.5 rounded border border-[#233827]">nosniff</code>). Platform administrators never receive unrestricted file browsing capabilities.
          </p>
        </section>

        <section className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-6 sm:p-7 rounded-3xl border border-[#273d2c] shadow-[0_12px_36px_rgba(0,0,0,0.5)] space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-syne">
            <Trash2 className="w-5 h-5 text-rose-400" />
            3. Automated Document Deletion Lifecycle
          </h2>
          <p>
            Every uploaded document has an immutable <code className="text-rose-300 bg-[#0c140e] px-1.5 py-0.5 rounded border border-[#233827]">auto_delete_at</code> timestamp based on the shop's configured retention window (typically 12 to 24 hours, and expedited to 2 hours once marked Completed).
          </p>
          <p>
            A background retention worker executes periodically to physically unlink file bytes from private storage and register a completed entry in <code className="text-slate-300 bg-[#0c140e] px-1.5 py-0.5 rounded border border-[#233827]">file_deletion_jobs</code>. Once purged, documents cannot be recovered.
          </p>
        </section>

        <section className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-6 sm:p-7 rounded-3xl border border-[#273d2c] shadow-[0_12px_36px_rgba(0,0,0,0.5)] space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-syne">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            4. Malware &amp; Magic-Byte Validation
          </h2>
          <p>
            Uploaded files undergo deep binary inspection (magic bytes verification) rather than relying on declared filenames. Suspicious executables, macros, and embedded script payloads are quarantined and blocked from reaching shop printing queues.
          </p>
        </section>
      </div>
    </div>
  );
};
