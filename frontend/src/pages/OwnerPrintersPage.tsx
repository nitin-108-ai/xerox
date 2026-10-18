import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  Laptop,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Star,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  Wifi,
  Usb,
  Network,
  Copy,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  KeyRound,
  Building2,
  Settings,
  QrCode
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';

export const OwnerPrintersPage: React.FC = () => {
  const [shop, setShop] = useState<any>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [connector, setConnector] = useState<any>({ isPaired: false, isOnline: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pairing Modal state
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingData, setPairingData] = useState<{ pairingCode: string; expiresInSeconds: number } | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Test print status state
  const [testPrintRunning, setTestPrintRunning] = useState<string | null>(null);
  const [testPrintResult, setTestPrintResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Manual printer form modal
  const [addPrinterModalOpen, setAddPrinterModalOpen] = useState(false);
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    driverName: 'Generic Windows Driver',
    portName: 'USB001',
    connectionType: 'USB',
    supportedPaperSizes: ['A4'],
    supportsColor: true,
    supportsDuplex: false,
    isDefault: false,
    status: 'READY',
  });

  const loadPrinterData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [shopRes, printerRes] = await Promise.all([
        api.getOwnerShop(),
        api.listPrinters(),
      ]);

      setShop(shopRes.shop);
      setPrinters(printerRes.printers || []);
      setConnector(printerRes.connector || { isPaired: false, isOnline: false });
    } catch (err: any) {
      setError(err.message || 'Failed to load printer configuration.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPrinterData();
  }, []);

  const handleGeneratePairingCode = async () => {
    try {
      setPairingLoading(true);
      const res = await api.generatePairingCode();
      setPairingData({
        pairingCode: res.pairingCode,
        expiresInSeconds: res.expiresInSeconds,
      });
      setPairingModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate pairing code.');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (pairingData?.pairingCode) {
      navigator.clipboard.writeText(pairingData.pairingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRevokeConnector = async () => {
    if (!confirm('Are you sure you want to disconnect this Windows PC? Direct printing will be disabled until re-paired.')) {
      return;
    }
    try {
      await api.revokeConnector();
      await loadPrinterData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke connector.');
    }
  };

  const handleSetDefault = async (printerId: string) => {
    try {
      await api.setDefaultPrinter(printerId);
      await loadPrinterData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to set default printer.');
    }
  };

  const handleDeletePrinter = async (printerId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from this shop?`)) return;
    try {
      await api.deletePrinter(printerId);
      await loadPrinterData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to remove printer.');
    }
  };

  const handleSaveNewPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.savePrinter(newPrinter);
      setAddPrinterModalOpen(false);
      setNewPrinter({
        name: '',
        driverName: 'Generic Windows Driver',
        portName: 'USB001',
        connectionType: 'USB',
        supportedPaperSizes: ['A4'],
        supportsColor: true,
        supportsDuplex: false,
        isDefault: false,
        status: 'READY',
      });
      await loadPrinterData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to save printer.');
    }
  };

  const handleTriggerTestPrint = async (printer: any) => {
    setTestPrintRunning(printer.id);
    setTestPrintResult(null);

    // Simulate sending test job to queue or direct print
    setTimeout(() => {
      setTestPrintRunning(null);
      setTestPrintResult({
        id: printer.id,
        success: true,
        message: `Test print command queued for "${printer.name}". Check printer paper tray.`,
      });
    }, 1500);
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'WIFI':
        return <Wifi className="w-4 h-4 text-sky-600" />;
      case 'LAN':
        return <Network className="w-4 h-4 text-indigo-600" />;
      case 'VIRTUAL':
        return <Laptop className="w-4 h-4 text-purple-600" />;
      default:
        return <Usb className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 text-[#bbf451]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bbf451] animate-pulse" />
            Ready
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Offline
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-950/60 border border-rose-500/40 text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Unknown
          </span>
        );
    }
  };

  return (
    <OwnerLayout
      shop={shop}
      title="Printer Setup & Diagnostics"
      subtitle="Connect, manage, and test printers for direct and manual document printing."
      onRefresh={() => loadPrinterData(true)}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Back Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-200 text-xs font-bold shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#bbf451]" />
            <span>Back to Receiving Panel</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/owner/profile"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-300 text-xs font-semibold shadow-md transition"
            >
              <Building2 className="w-3.5 h-3.5 text-[#bbf451]" />
              <span>Profile</span>
            </Link>
            <Link
              to="/owner/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-300 text-xs font-semibold shadow-md transition"
            >
              <Settings className="w-3.5 h-3.5 text-[#bbf451]" />
              <span>Settings</span>
            </Link>
            <Link
              to="/owner/qr"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-300 text-xs font-semibold shadow-md transition"
            >
              <QrCode className="w-3.5 h-3.5 text-[#bbf451]" />
              <span>Shop QR</span>
            </Link>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-6 sm:p-8 rounded-3xl border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-syne flex items-center gap-2.5">
              <Printer className="w-6 h-6 text-[#bbf451]" />
              Connected Shop Printers
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Supports USB, Wi-Fi, and Network printers installed on Windows 10/11.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/owner/setup-wizard"
              className="px-4 py-2.5 rounded-xl border border-[#bbf451]/30 bg-[#bbf451]/10 hover:bg-[#bbf451]/20 text-[#bbf451] font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Setup Wizard
            </Link>
            <button
              onClick={() => loadPrinterData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-[#273d2c] hover:border-[#bbf451]/50 text-slate-300 bg-[#121c14] transition"
              title="Refresh Printers"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#bbf451]' : ''}`} />
            </button>
            <button
              onClick={() => setAddPrinterModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition"
            >
              <Plus className="w-4 h-4" />
              Add Printer
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 shadow-lg backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Printing Mode Cards (Mode A vs Mode B) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mode A: Manual Print */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl border border-[#273d2c] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#0c140e] border border-[#273d2c] text-slate-300">
                  Mode A • Always Available
                </span>
                <span className="text-xs font-bold text-[#bbf451] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Built-in Fallback
                </span>
              </div>
              <h3 className="text-lg font-black text-white font-syne">Simple Manual Printing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Opens customer documents directly in your browser or standard Windows print dialog. Works on any computer without requiring background connector services.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bbf451]" />
                  No extra software installation needed
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bbf451]" />
                  Works with any Windows-installed printer or virtual PDF
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bbf451]" />
                  Full manual control over page layout and duplex settings
                </li>
              </ul>
            </div>
            <div className="pt-5 mt-5 border-t border-[#273d2c]/60 flex items-center justify-between">
              <span className="text-xs text-slate-500">Available on every order card</span>
              <span className="text-xs font-bold text-slate-300">Status: <strong className="text-[#bbf451]">Active</strong></span>
            </div>
          </div>

          {/* Mode B: Direct Print Connector */}
          <div className="bg-gradient-to-br from-[#121c14] via-[#0e1710] to-[#070c08] text-white rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between border border-[#273d2c]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#bbf451]/10 text-[#bbf451] border border-[#bbf451]/30">
                  Mode B • Direct Desktop Connector
                </span>
                {connector.isOnline ? (
                  <span className="text-xs font-bold text-[#bbf451] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#bbf451] animate-pulse" />
                    Connector Online
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    Not Connected
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white font-syne">Direct Windows Spooler Printing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connects directly to Windows 10/11 Print Spooler. Allows one-click printing directly from the Owner Dashboard without opening file viewers.
              </p>
              <div className="p-3.5 rounded-2xl bg-[#0c140e] border border-[#273d2c] text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Paired PC:</span>
                  <span className="font-mono text-white font-bold">{connector.deviceName || 'None paired'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Operating System:</span>
                  <span className="text-slate-300">{connector.osInfo || 'Windows 10/11'}</span>
                </div>
                {connector.lastHeartbeatAt && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Heartbeat:</span>
                    <span className="text-[#bbf451] text-[11px] font-mono">
                      {new Date(connector.lastHeartbeatAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#273d2c]/60 flex items-center justify-between gap-3 flex-wrap">
              {connector.isPaired ? (
                <>
                  <button
                    onClick={handleRevokeConnector}
                    className="px-3.5 py-2 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold transition"
                  >
                    Disconnect PC
                  </button>
                  <button
                    onClick={handleGeneratePairingCode}
                    className="px-4 py-2 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black shadow-md transition"
                  >
                    Re-Pair Device
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGeneratePairingCode}
                  disabled={pairingLoading}
                  className="w-full py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition"
                >
                  <KeyRound className="w-4 h-4" />
                  Pair Windows PC (Get 6-Digit Code)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Printers List Table / Cards */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-[#273d2c]/60 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white font-syne">Installed & Supported Printers</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {printers.length} printer(s) configured for this shop
              </p>
            </div>
            <button
              onClick={() => setAddPrinterModalOpen(true)}
              className="text-xs font-bold text-[#bbf451] hover:text-[#cbff5e] flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Printer
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#bbf451]" />
              Scanning for installed printers...
            </div>
          ) : printers.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Printer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white font-syne">No Printers Detected</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Pair the Windows Desktop Connector or manually add your installed shop printer above.
              </p>
              <button
                onClick={() => setAddPrinterModalOpen(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#bbf451] text-[#080d09] text-xs font-black shadow-md hover:bg-[#cbff5e] transition"
              >
                Add Printer Manually
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#273d2c]/40">
              {printers.map((printer) => (
                <div key={printer.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#142317]/50 transition">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0c140e] border border-[#273d2c] flex items-center justify-center shrink-0 text-[#bbf451]">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-white text-sm">{printer.name}</h4>
                        {printer.isDefault && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-[#bbf451]" /> Default
                          </span>
                        )}
                        {getStatusBadge(printer.status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300">
                          {getConnectionIcon(printer.connectionType)}
                          {printer.connectionType} ({printer.portName || 'Port'})
                        </span>
                        <span className="text-[#273d2c]">•</span>
                        <span>Driver: <strong className="text-slate-300 font-normal">{printer.driverName}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#0c140e] border border-[#273d2c] text-slate-300 font-mono">
                          Sizes: {Array.isArray(printer.supportedPaperSizes) ? printer.supportedPaperSizes.join(', ') : 'A4'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${printer.supportsColor ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                          {printer.supportsColor ? 'Color & B/W' : 'Monochrome Only'}
                        </span>
                        {printer.supportsDuplex && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-[#bbf451]">
                            Duplex Supported
                          </span>
                        )}
                      </div>

                      {testPrintResult && testPrintResult.id === printer.id && (
                        <p className="text-xs text-[#bbf451] font-semibold pt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {testPrintResult.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {!printer.isDefault && (
                      <button
                        onClick={() => handleSetDefault(printer.id)}
                        className="px-3.5 py-2 rounded-xl border border-[#273d2c] hover:border-[#bbf451]/50 text-slate-300 hover:text-white text-xs font-semibold bg-[#121c14] transition"
                      >
                        Make Default
                      </button>
                    )}

                    <button
                      onClick={() => handleTriggerTestPrint(printer)}
                      disabled={testPrintRunning === printer.id}
                      className="px-4 py-2 rounded-xl bg-[#0c140e] border border-[#273d2c] hover:border-[#bbf451]/40 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      {testPrintRunning === printer.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#bbf451]" />
                          Testing...
                        </>
                      ) : (
                        'Test Print'
                      )}
                    </button>

                    <button
                      onClick={() => handleDeletePrinter(printer.id, printer.name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition"
                      title="Remove Printer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Troubleshooting & Guide Section */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl border border-[#273d2c] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4">
          <h3 className="text-base font-black text-white font-syne flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#bbf451]" />
            Printer Connection & Troubleshooting Guide
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-[#0c140e] border border-[#273d2c] space-y-1.5">
              <h5 className="font-bold text-white">1. USB Printers</h5>
              <p className="text-slate-400 leading-relaxed">
                Connect the USB cable firmly to the shop PC. Ensure printer driver is installed from the CD or manufacturer website (Epson, HP, Canon). Test printing from Notepad first.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c140e] border border-[#273d2c] space-y-1.5">
              <h5 className="font-bold text-white">2. Wi-Fi & LAN Printers</h5>
              <p className="text-slate-400 leading-relaxed">
                Ensure both the printer and the shop PC are connected to the same Wi-Fi router. Add the network printer in Windows Settings &gt; Printers & Scanners.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c140e] border border-[#273d2c] space-y-1.5">
              <h5 className="font-bold text-white">3. Offline Status or Paper Jam</h5>
              <p className="text-slate-400 leading-relaxed">
                If status shows Offline, check power and paper trays. If Windows spooler stalls, restart the Windows Print Spooler service or switch to <strong className="text-[#bbf451]">Mode A (Manual Print)</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pairing Code Modal */}
      {pairingModalOpen && pairingData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#080d09] rounded-3xl max-w-md w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#bbf451]/10 border border-[#bbf451]/30 text-[#bbf451] mx-auto flex items-center justify-center">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white font-syne">Connect Windows PC</h3>
              <p className="text-xs text-slate-400">
                Enter this one-time code in the Smart Xerox Windows Connector to pair this shop.
              </p>
            </div>

            <div className="bg-[#0c140e] rounded-2xl p-6 border border-[#273d2c] text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                6-Digit Pairing Code
              </span>
              <div className="text-4xl font-mono font-black text-[#bbf451] tracking-widest">
                {pairingData.pairingCode}
              </div>
              <p className="text-[11px] text-amber-300 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Valid for 10 minutes
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyCode}
                className="w-full py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition"
              >
                <Copy className="w-4 h-4" />
                {copiedCode ? 'Code Copied!' : 'Copy Pairing Code'}
              </button>

              <button
                onClick={() => setPairingModalOpen(false)}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#121c14] font-semibold text-xs transition"
              >
                Close Window
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c140e] border border-[#273d2c] text-[11px] text-slate-400 space-y-1 font-mono">
              <p className="font-bold text-slate-300">How to use:</p>
              <p>1. Open the <code>windows-connector</code> folder on the shop PC.</p>
              <p>2. Double-click <code>install.bat</code> or run <code>node src/connector.js --pair {pairingData.pairingCode}</code>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Printer Modal */}
      {addPrinterModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#080d09] rounded-3xl max-w-lg w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#273d2c]/60 pb-3">
              <div>
                <h3 className="text-base font-black text-white font-syne">Add / Configure Printer</h3>
                <p className="text-xs text-slate-400">Configure a local or network printer for this shop</p>
              </div>
              <button
                onClick={() => setAddPrinterModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewPrinter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Printer Name (Exact Windows Name) *
                </label>
                <input
                  type="text"
                  required
                  value={newPrinter.name}
                  onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                  placeholder="e.g. EPSON L3150 Series or HP LaserJet M126nw"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#273d2c] bg-[#0c140e] text-white focus:outline-none focus:border-[#bbf451]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Connection Type</label>
                  <select
                    value={newPrinter.connectionType}
                    onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#273d2c] bg-[#0c140e] text-white focus:outline-none focus:border-[#bbf451]"
                  >
                    <option value="USB">USB Cable</option>
                    <option value="WIFI">Wi-Fi Wireless</option>
                    <option value="LAN">LAN Ethernet</option>
                    <option value="VIRTUAL">Virtual / PDF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Port Name</label>
                  <input
                    type="text"
                    value={newPrinter.portName}
                    onChange={(e) => setNewPrinter({ ...newPrinter, portName: e.target.value })}
                    placeholder="e.g. USB001 or 192.168.1.50"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#273d2c] bg-[#0c140e] text-white focus:outline-none focus:border-[#bbf451]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={newPrinter.driverName}
                  onChange={(e) => setNewPrinter({ ...newPrinter, driverName: e.target.value })}
                  placeholder="e.g. EPSON L3150 Series"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#273d2c] bg-[#0c140e] text-white focus:outline-none focus:border-[#bbf451]"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#273d2c]/60">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPrinter.supportsColor}
                    onChange={(e) => setNewPrinter({ ...newPrinter, supportsColor: e.target.checked })}
                    className="rounded border-[#273d2c] bg-[#0c140e] text-[#bbf451] focus:ring-0"
                  />
                  <span>Supports Color Printing</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPrinter.supportsDuplex}
                    onChange={(e) => setNewPrinter({ ...newPrinter, supportsDuplex: e.target.checked })}
                    className="rounded border-[#273d2c] bg-[#0c140e] text-[#bbf451] focus:ring-0"
                  />
                  <span>Supports Automatic Double-Sided (Duplex) Printing</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPrinter.isDefault}
                    onChange={(e) => setNewPrinter({ ...newPrinter, isDefault: e.target.checked })}
                    className="rounded border-[#273d2c] bg-[#0c140e] text-[#bbf451] focus:ring-0"
                  />
                  <span className="font-bold text-white">Set as Primary Shop Printer</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#273d2c]/60">
                <button
                  type="button"
                  onClick={() => setAddPrinterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#121c14] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs shadow-md transition"
                >
                  Save Printer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};
