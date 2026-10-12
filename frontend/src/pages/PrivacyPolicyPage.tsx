import React from 'react';
import { ShieldCheck, Lock, Trash2, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          Trust & Document Security
        </span>
        <h1 className="text-3xl font-extrabold text-navy-950 tracking-tight">
          Privacy Policy & Document Retention Lifecycle
        </h1>
        <p className="text-xs text-slate-500">
          Last revised: October 2026 • Effective platform-wide
        </p>
      </div>

      <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-6 text-slate-700">
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-brand-600" />
            1. Zero Phone Number Exposure Guarantee
          </h2>
          <p>
            Traditional document printing at local photocopy centers forces customers to share their personal WhatsApp or phone numbers with shop counter staff, exposing profile photos, status updates, and personal contact info.
          </p>
          <p>
            <strong>Smart Xerox eliminates this completely:</strong> Walk-in guest customers are never required to supply an email address, phone number, or account password to print documents. All orders are indexed using high-entropy random order references and cryptographic client tokens.
          </p>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-600" />
            2. Private Storage Isolation & Sandboxing
          </h2>
          <p>
            Uploaded document bytes (PDF, JPG, PNG) are stored in an isolated private directory completely inaccessible to public HTTP requests. Files are indexed using opaque UUID keys rather than customer identities.
          </p>
          <p>
            Shop owners can only access authorized print previews through a sandboxed, token-verified stream (`sandbox`, `no-store`, `nosniff`). Platform administrators never receive unrestricted file browsing capabilities.
          </p>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            3. Automated Document Deletion Lifecycle
          </h2>
          <p>
            Every uploaded document has an immutable `auto_delete_at` timestamp based on the shop's configured retention window (typically 12 to 24 hours, and expedited to 2 hours once marked Completed).
          </p>
          <p>
            A background retention worker executes periodically to physically unlink file bytes from private storage and register a completed entry in `file_deletion_jobs`. Once purged, documents cannot be recovered.
          </p>
        </section>

        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            4. Malware & Magic-Byte Validation
          </h2>
          <p>
            Uploaded files undergo deep binary inspection (magic bytes verification) rather than relying on declared filenames. Suspicious executables, macros, and embedded script payloads are quarantined and blocked from reaching shop printing queues.
          </p>
        </section>
      </div>
    </div>
  );
};
