import React from 'react';
import { X, Printer, Download, ShieldCheck, QrCode } from 'lucide-react';
import jsPDF from 'jspdf';

interface PrintablePosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  shopAddress: string;
  storefrontUrl: string;
  qrDataUrl: string;
}

export const PrintablePosterModal: React.FC<PrintablePosterModalProps> = ({
  isOpen,
  onClose,
  shopName,
  shopAddress,
  storefrontUrl,
  qrDataUrl
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Dark header bar
    doc.setFillColor(11, 25, 44); // #0B192C
    doc.rect(0, 0, 210, 45, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SMART XEROX — PRIVATE PRINTING', 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(219, 234, 254);
    doc.text('Scan to Print Directly • No Phone Number Required', 105, 30, { align: 'center' });

    // Shop Info Box
    doc.setTextColor(11, 25, 44);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName, 105, 60, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(shopAddress, 105, 68, { align: 'center' });

    // QR Code Image
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 55, 78, 100, 100);
    }

    // Step instructions
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(25, 188, 160, 48, 4, 4, 'F');

    doc.setTextColor(11, 25, 44);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('HOW TO PRINT PRIVATELY:', 35, 200);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Scan this QR code with any smartphone camera', 35, 208);
    doc.text('2. Upload your PDF or image & select print options', 35, 216);
    doc.text('3. Collect prints at the counter with your Order Reference', 35, 224);

    // Footer privacy guarantee
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('✔ ZERO PHONE NUMBER EXCHANGED   ✔ 100% PRIVATE STORAGE   ✔ AUTO-DELETED', 105, 255, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(storefrontUrl, 105, 265, { align: 'center' });

    doc.save(`${shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-counter-qr-poster.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#142217] via-[#0f1a11] to-[#0a120c] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-[#273d2c] overflow-hidden flex flex-col max-h-[95vh] text-slate-100">
        {/* Top Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0c140e] text-white shrink-0 border-b border-[#233827]">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#bbf451]" />
            <h3 className="text-base font-bold font-syne">Printable Shop Counter Poster</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#162519] hover:bg-[#203323] text-slate-200 border border-[#273d2c] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] shadow-[0_0_15px_rgba(187,244,81,0.25)] transition active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Poster Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-[#080d09] flex justify-center">
          <div className="w-[450px] bg-white rounded-2xl shadow-xl border-4 border-navy-900 p-8 text-center flex flex-col items-center">
            {/* Header Badge */}
            <div className="w-full bg-navy-900 text-white py-3 px-4 rounded-xl mb-4">
              <div className="text-xs font-bold tracking-widest text-brand-400 uppercase">
                Zero-Contact Document Printing
              </div>
              <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
                SMART XEROX DISPATCH
              </h2>
            </div>

            {/* Shop Details */}
            <h3 className="text-xl font-bold text-navy-900">{shopName}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">{shopAddress}</p>

            {/* High Res QR */}
            <div className="my-5 p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
              <img
                src={qrDataUrl}
                alt={`${shopName} QR Code`}
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>

            {/* Instructions Box */}
            <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 text-left mb-4">
              <div className="text-[11px] font-bold text-navy-900 uppercase tracking-wider mb-2">
                Scan with your phone camera:
              </div>
              <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside font-medium">
                <li>Point your camera at the QR code above</li>
                <li>Upload your document & pick copies/color</li>
                <li>Pay & collect at counter with your Order OTP</li>
              </ol>
            </div>

            {/* Security Guarantee */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 px-4 rounded-lg w-full">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>No Phone Number Required • 100% Private</span>
            </div>

            <p className="text-[10px] text-slate-400 font-mono mt-3">
              {storefrontUrl}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
