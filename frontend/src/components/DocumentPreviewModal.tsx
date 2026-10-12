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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-brand-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{originalFilename}</h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                SHA-256: {sha256Hash ? sha256Hash.substring(0, 24) + '...' : 'Verified'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={originalFilename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download to Print
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Advisory Bar */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Confidential Document:</strong> Content is isolated in an isolated sandbox. Do not distribute or retain beyond customer pickup.
            </span>
          </div>
          <span className="text-[11px] font-medium bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
            Auto-Purge Active
          </span>
        </div>

        {/* Sandboxed Document Preview Area */}
        <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={previewUrl}
              title={originalFilename}
              sandbox="allow-scripts"
              className="w-full h-full rounded-xl border border-slate-300 bg-white shadow-xs"
            />
          ) : (
            <div className="max-w-full max-h-full flex items-center justify-center bg-white p-4 rounded-xl shadow-xs border border-slate-200">
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
