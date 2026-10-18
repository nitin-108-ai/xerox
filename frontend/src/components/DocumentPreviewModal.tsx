import React, { useState } from 'react';
import { X, Download, ShieldCheck, FileText, ExternalLink, AlertTriangle } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  docId: string;
  originalFilename: string;
  mimeType: string;
  sha256Hash?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  orderId,
  docId,
  originalFilename,
  mimeType,
  sha256Hash
}) => {
  if (!isOpen) return null;

  const previewUrl = `/api/orders/owner/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(docId)}/preview`;
  const downloadUrl = `/api/orders/owner/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(docId)}/download`;

  const isPdf = mimeType.includes('pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[90vh] bg-gradient-to-b from-[#142217] via-[#0f1a11] to-[#0a120c] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-[#273d2c] overflow-hidden flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0c140e] text-white shrink-0 border-b border-[#233827]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#bbf451]/15 border border-[#bbf451]/30 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#bbf451]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate font-syne">{originalFilename}</h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                SHA-256: {sha256Hash ? sha256Hash.substring(0, 24) + '...' : 'Verified Platform Sandbox'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={originalFilename}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] shadow-[0_0_15px_rgba(187,244,81,0.25)] transition active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              Download to Print
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Advisory Bar */}
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Confidential Document:</strong> Content is isolated in an encrypted sandbox. Do not distribute or retain beyond customer pickup.
            </span>
          </div>
          <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
            Auto-Purge Active
          </span>
        </div>

        {/* Sandboxed Document Preview Area */}
        <div className="flex-1 bg-[#080d09] p-4 overflow-auto flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={previewUrl}
              title={originalFilename}
              sandbox="allow-scripts"
              className="w-full h-full rounded-xl border border-[#273d2c] bg-white shadow-xl"
            />
          ) : (
            <div className="max-w-full max-h-full flex items-center justify-center bg-white p-4 rounded-xl shadow-xl border border-[#273d2c]">
              <img
                src={previewUrl}
                alt={originalFilename}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
