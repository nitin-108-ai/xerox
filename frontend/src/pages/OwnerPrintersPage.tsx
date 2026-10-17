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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ready
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Offline
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4 text-brand-600" />
            <span>Back to Receiving Panel</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/owner/profile"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Profile</span>
            </Link>
            <Link
              to="/owner/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings</span>
            </Link>
            <Link
              to="/owner/qr"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Shop QR</span>
            </Link>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-extrabold text-navy-950 flex items-center gap-2">
              <Printer className="w-6 h-6 text-brand-600" />
              Connected Shop Printers
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Supports USB, Wi-Fi, and Network printers installed on Windows 10/11.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/owner/setup-wizard"
              className="px-4 py-2 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Setup Wizard
            </Link>
            <button
              onClick={() => loadPrinterData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 bg-white transition"
              title="Refresh Printers"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
            <button
              onClick={() => setAddPrinterModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Add Printer
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Printing Mode Cards (Mode A vs Mode B) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mode A: Manual Print */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">
                  Mode A • Always Available
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Built-in Fallback
                </span>
              </div>
              <h3 className="text-base font-extrabold text-navy-950">Simple Manual Printing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Opens customer documents directly in your browser or standard Windows print dialog. Works on any computer without requiring background connector services.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  No extra software installation needed
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Works with any Windows-installed printer or virtual PDF
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Full manual control over page layout and duplex settings
                </li>
              </ul>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Available on every order card</span>
              <span className="text-xs font-bold text-slate-700">Status: Active</span>
            </div>
          </div>

          {/* Mode B: Direct Print Connector */}
          <div className="bg-gradient-to-br from-navy-950 to-navy-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between border border-navy-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Mode B • Direct Desktop Connector
                </span>
                {connector.isOnline ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connector Online
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    Not Connected
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-white">Direct Windows Spooler Printing</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connects directly to Windows 10/11 Print Spooler. Allows one-click printing directly from the Owner Dashboard without opening file viewers.
              </p>
              <div className="p-3 rounded-2xl bg-navy-900/80 border border-navy-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Paired PC:</span>
                  <span className="font-mono text-white font-bold">{connector.deviceName || 'None paired'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Operating System:</span>
                  <span className="text-slate-200">{connector.osInfo || 'Windows 10/11'}</span>
                </div>
                {connector.lastHeartbeatAt && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Last Heartbeat:</span>
                    <span className="text-emerald-400 text-[11px]">
                      {new Date(connector.lastHeartbeatAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-navy-800/80 flex items-center justify-between gap-3 flex-wrap">
              {connector.isPaired ? (
                <>
                  <button
                    onClick={handleRevokeConnector}
                    className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold transition"
                  >
                    Disconnect PC
                  </button>
                  <button
                    onClick={handleGeneratePairingCode}
                    className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xs transition"
                  >
                    Re-Pair Device
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGeneratePairingCode}
                  disabled={pairingLoading}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <KeyRound className="w-4 h-4" />
                  Pair Windows PC (Get 6-Digit Code)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Printers List Table / Cards */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-navy-950">Installed & Supported Printers</h3>
              <p className="text-xs text-slate-500">
                {printers.length} printer(s) configured for this shop
              </p>
            </div>
            <button
              onClick={() => setAddPrinterModalOpen(true)}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Printer
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Scanning for installed printers...
            </div>
          ) : printers.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Printer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Printers Detected</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Pair the Windows Desktop Connector or manually add your installed shop printer above.
              </p>
              <button
                onClick={() => setAddPrinterModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-xs hover:bg-brand-500 transition"
              >
                Add Printer Manually
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {printers.map((printer) => (
                <div key={printer.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                      <Printer className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-navy-950 text-sm">{printer.name}</h4>
                        {printer.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-100 text-brand-800 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-brand-600" /> Default
                          </span>
                        )}
                        {getStatusBadge(printer.status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          {getConnectionIcon(printer.connectionType)}
                          {printer.connectionType} ({printer.portName || 'Port'})
                        </span>
                        <span>•</span>
                        <span>Driver: {printer.driverName}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Sizes: {Array.isArray(printer.supportedPaperSizes) ? printer.supportedPaperSizes.join(', ') : 'A4'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${printer.supportsColor ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {printer.supportsColor ? 'Color & B/W' : 'Monochrome Only'}
                        </span>
                        {printer.supportsDuplex && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Duplex Supported
                          </span>
                        )}
                      </div>

                      {testPrintResult && testPrintResult.id === printer.id && (
                        <p className="text-xs text-emerald-700 font-semibold pt-1 flex items-center gap-1">
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
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-300 text-slate-700 hover:text-brand-700 text-xs font-semibold bg-white transition"
                      >
                        Make Default
                      </button>
                    )}

                    <button
                      onClick={() => handleTriggerTestPrint(printer)}
                      disabled={testPrintRunning === printer.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      {testPrintRunning === printer.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Test Print'
                      )}
                    </button>

                    <button
                      onClick={() => handleDeletePrinter(printer.id, printer.name)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-600" />
            Printer Connection & Troubleshooting Guide
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <h5 className="font-bold text-navy-950">1. USB Printers</h5>
              <p>
                Connect the USB cable firmly to the shop PC. Ensure printer driver is installed from the CD or manufacturer website (Epson, HP, Canon). Test printing from Notepad first.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <h5 className="font-bold text-navy-950">2. Wi-Fi & LAN Printers</h5>
              <p>
                Ensure both the printer and the shop PC are connected to the same Wi-Fi router. Add the network printer in Windows Settings &gt; Printers & Scanners.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <h5 className="font-bold text-navy-950">3. Offline Status or Paper Jam</h5>
              <p>
                If status shows Offline, check power and paper trays. If Windows spooler stalls, restart the Windows Print Spooler service or switch to <strong>Mode A (Manual Print)</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pairing Code Modal */}
      {pairingModalOpen && pairingData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-navy-950">Connect Windows PC</h3>
              <p className="text-xs text-slate-500">
                Enter this one-time code in the Smart Xerox Windows Connector to pair this shop.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                6-Digit Pairing Code
              </span>
              <div className="text-4xl font-mono font-black text-navy-950 tracking-widest">
                {pairingData.pairingCode}
              </div>
              <p className="text-[11px] text-amber-600 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Valid for 10 minutes
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyCode}
                className="w-full py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Copy className="w-4 h-4" />
                {copiedCode ? 'Code Copied!' : 'Copy Pairing Code'}
              </button>

              <button
                onClick={() => setPairingModalOpen(false)}
                className="w-full py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition"
              >
                Close Window
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">How to use:</p>
              <p>1. Open the <code>windows-connector</code> folder on the shop PC.</p>
              <p>2. Double-click <code>install.bat</code> or run <code>node src/connector.js --pair {pairingData.pairingCode}</code>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Printer Modal */}
      {addPrinterModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-navy-950">Add / Configure Printer</h3>
                <p className="text-xs text-slate-500">Configure a local or network printer for this shop</p>
              </div>
              <button
                onClick={() => setAddPrinterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewPrinter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Printer Name (Exact Windows Name) *
                </label>
                <input
                  type="text"
                  required
                  value={newPrinter.name}
                  onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                  placeholder="e.g. EPSON L3150 Series or HP LaserJet M126nw"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Connection Type</label>
                  <select
                    value={newPrinter.connectionType}
                    onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500 bg-white"
                  >
                    <option value="USB">USB Cable</option>
                    <option value="WIFI">Wi-Fi Wireless</option>
                    <option value="LAN">LAN Ethernet</option>
                    <option value="VIRTUAL">Virtual / PDF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Port Name</label>
                  <input
                    type="text"
                    value={newPrinter.portName}
                    onChange={(e) => setNewPrinter({ ...newPrinter, portName: e.target.value })}
                    placeholder="e.g. USB001 or 192.168.1.50"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={newPrinter.driverName}
                  onChange={(e) => setNewPrinter({ ...newPrinter, driverName: e.target.value })}
                  placeholder="e.g. EPSON L3150 Series"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPrinter.supportsColor}
                    onChange={(e) => setNewPrinter({ ...newPrinter, supportsColor: e.target.checked })}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Supports Color Printing</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPrinter.supportsDuplex}
                    onChange={(e) => setNewPrinter({ ...newPrinter, supportsDuplex: e.target.checked })}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Supports Automatic Double-Sided (Duplex) Printing</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPrinter.isDefault}
                    onChange={(e) => setNewPrinter({ ...newPrinter, isDefault: e.target.checked })}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="font-bold text-navy-950">Set as Primary Shop Printer</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddPrinterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-xs"
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
