import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Printer,
  QrCode,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  Trash2,
  Building2,
  FileText,
  CheckCircle2,
  Mic,
  Layers,
  BookOpen,
  Compass,
  Zap,
  Clock,
  ChevronRight
} from 'lucide-react';

interface HomePageProps {
  onOpenScanner: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenScanner }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'academic' | 'cad' | 'commercial'>('all');

  // Interactive Paper Simulator State
  const [selectedPaper, setSelectedPaper] = useState<'75gsm' | '100gsm' | 'glossy'>('75gsm');
  const [selectedColor, setSelectedColor] = useState<'bw' | 'color'>('bw');
  const [selectedDuplex, setSelectedDuplex] = useState<boolean>(true);
  const [selectedBinding, setSelectedBinding] = useState<'none' | 'spiral' | 'staple'>('none');
  const [pageCount, setPageCount] = useState<number>(20);

  // Calculate live estimate in simulator
  const calculateSimulatedPrice = () => {
    let ratePerPage = selectedColor === 'color' ? 8 : 2;
    if (selectedPaper === '100gsm') ratePerPage += 1.5;
    if (selectedPaper === 'glossy') ratePerPage += 4;
    let total = ratePerPage * pageCount;
    if (selectedDuplex && selectedColor === 'bw') total *= 0.85; // discount for duplex
    if (selectedBinding === 'spiral') total += 40;
    if (selectedBinding === 'staple') total += 5;
    return Math.round(total);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/shop/quickcopy-express');
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    navigate('/shop/quickcopy-express');
  };

  return (
    <div className="bg-[#080d09] min-h-screen text-slate-100 selection:bg-[#bbf451] selection:text-[#0b120c] font-outfit pb-24">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#1b3420]/40 via-[#102315]/20 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-[800px] -left-48 w-[600px] h-[600px] bg-[#142918]/20 blur-3xl rounded-full" />
        <div className="absolute top-[1400px] -right-48 w-[600px] h-[600px] bg-[#1e3a24]/20 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-20 sm:space-y-28">

        {/* ═══════════════════════════════════════════════════════════
            HERO CONTAINER (Modeled exactly after Reference Screenshot)
        ═══════════════════════════════════════════════════════════ */}
        <div className="relative rounded-[28px] sm:rounded-[36px] lg:rounded-[44px] bg-gradient-to-b from-[#18261b] via-[#121c14] to-[#0c140e] border border-[#273d2c]/80 shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden pt-8 pb-12 sm:pb-16 px-6 sm:px-10 lg:px-14">

          {/* Top Pill Inner Sub-Nav / Status inside Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1e3022]/90 border border-[#304b36] shadow-inner text-xs font-semibold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#bbf451] animate-pulse" />
              <span>Next-Gen High-Speed Digital Press Cloud</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#bbf451]" />
              <span>100% Private • Zero WhatsApp Data Leak</span>
            </div>
          </div>

          {/* GIANT 3D BACKGROUND TYPOGRAPHY: SMART XEROX */}
          <div className="absolute top-16 sm:top-20 left-4 sm:left-10 select-none pointer-events-none font-syne font-black text-6xl sm:text-8xl md:text-[130px] lg:text-[170px] xl:text-[200px] tracking-tight leading-none text-[#233527]/50 mix-blend-screen overflow-hidden whitespace-nowrap">
            SMARTXEROX
          </div>

          {/* MAIN HERO GRID: Left Text + Floating Search | Right 3D Model */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* LEFT COLUMN: Headings + Search + Recent Tags */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              
              {/* Main Headline */}
              <div className="space-y-3">
                <h1 className="font-syne text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[1.08]">
                  Raising Standards,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#bbf451]">
                    One Print At A Time
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed">
                  Direct commercial laser printing & binding straight from your phone.
                  Scan shop QR, configure double-sided duplex or spiral thesis, and collect in 2 minutes without sharing your phone number.
                </p>
              </div>

              {/* Floating Pill Search Bar */}
              <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
                <div className="relative flex items-center bg-[#1d2d20]/90 backdrop-blur-md border border-[#324b36] rounded-full p-2 pl-5 shadow-2xl focus-within:border-[#bbf451] transition-all group">
                  <Search className="w-5 h-5 text-slate-400 group-focus-within:text-[#bbf451] transition-colors shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Xerox shops, spiral reports, blueprints..."
                    className="w-full bg-transparent px-3 py-1.5 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none"
                  />
                  
                  <div className="flex items-center gap-1.5 shrink-0 pr-1">
                    <button
                      type="button"
                      onClick={onOpenScanner}
                      title="Scan Counter QR with Camera"
                      className="p-2 text-slate-300 hover:text-white hover:bg-[#283e2c] rounded-full transition-colors"
                    >
                      <QrCode className="w-4 h-4 text-[#bbf451]" />
                    </button>
                    <button
                      type="submit"
                      className="w-10 h-10 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0c140e] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      <Search className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Recent Search Chips */}
              <div className="space-y-2.5 max-w-xl">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Recent Print Searches:
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'A4 B&W ₹2/Page',
                    'Color Glossy Print',
                    'Spiral Thesis Binding',
                    'A3 CAD Blueprint',
                    'Instant 2-Min Pickup'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-[#18271b] hover:bg-[#233827] border border-[#2b4130] text-slate-300 hover:text-white transition-all shadow-sm hover:border-[#bbf451]/50"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-6 py-3 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-bold text-xs sm:text-sm shadow-xl shadow-[#bbf451]/20 transition-all hover:scale-105 flex items-center gap-2 group"
                >
                  <QrCode className="w-4 h-4 text-[#0a120c]" />
                  <span>Scan Counter QR</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  to="/shop/quickcopy-express"
                  className="px-6 py-3 rounded-full bg-[#18261c] hover:bg-[#243829] border border-[#2d4231] text-white font-semibold text-xs sm:text-sm transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-[#bbf451]" />
                  <span>Launch Live Storefront</span>
                </Link>
              </div>

            </div>

            {/* RIGHT COLUMN: 3D Isometric Xerox Machine Model */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              
              {/* Outer soft glow ring */}
              <div className="absolute inset-0 bg-[#bbf451]/10 filter blur-3xl rounded-full scale-90 pointer-events-none" />

              {/* 3D Model Floating Frame */}
              <div className="relative w-full max-w-[460px] lg:max-w-none group">
                
                {/* Floating 3D Image */}
                <div className="relative z-10 rounded-3xl overflow-hidden border border-[#3b593f]/80 shadow-[0_25px_60px_rgba(0,0,0,0.85)] bg-[#0d1610] transform transition-transform duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1">
                  <img
                    src="/images/xerox_machine_3d.jpg"
                    alt="High-End 3D Xerox Multifunction Commercial Laser Press Machine"
                    className="w-full h-auto object-cover object-center aspect-square"
                  />
                  
                  {/* Glass overlay gradient at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09110a] via-transparent to-transparent opacity-60" />

                  {/* Top Floating Badge */}
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a130c]/90 border border-[#2b4431] backdrop-blur-md text-[11px] font-bold text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Commercial Production Press
                  </div>

                  {/* Bottom Stats Floating Glass Pill */}
                  <div className="absolute bottom-4 inset-x-4 z-20 p-3 rounded-2xl bg-[#0c160f]/90 border border-[#28402d] backdrop-blur-md flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <div className="font-bold text-white text-sm">120 PPM Fast Laser</div>
                      <div className="text-[10px] text-slate-400">4800 x 2400 DPI Ultra HD</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#bbf451]/20 text-[#bbf451] px-2 py-0.5 rounded-md border border-[#bbf451]/30">
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtle base shadow */}
                <div className="w-3/4 h-6 bg-black/60 filter blur-xl mx-auto -mt-3 rounded-full" />
              </div>

            </div>

          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: DISCOVER PRINT SAMPLES & FINISHING
            (Modeled after "DISCOVER THE MOST RECENT PROPERTIES" + curved arrow)
        ═══════════════════════════════════════════════════════════ */}
        <div id="samples" className="space-y-10">

          {/* Section Header Row with curved decorative indicator */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-[#1c2c1f]">
            
            {/* Left side: Heading + Curved Arrow */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#bbf451]">
                <Layers className="w-4 h-4" />
                Live Catalog & Finishing Styles
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <h2 className="font-syne text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-none">
                  Discover 3D Print<br />Samples & Styles
                </h2>
                
                {/* Hand-drawn SVG Curved Arrow pointing right */}
                <div className="hidden md:block self-end text-slate-400 pl-4 mb-2">
                  <svg width="70" height="40" viewBox="0 0 70 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M5 5 C 25 35, 45 35, 62 18"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="4 2"
                    />
                    <path
                      d="M55 12 L 64 18 L 56 25"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right side: Subtitle text + Filter / Action pill */}
            <div className="lg:max-w-md space-y-4">
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Explore our commercial sample catalog featuring frosted spiral-bound reports, large-scale CAD blueprints, and ultra-crisp monochrome laser documents.
              </p>
              
              <div className="flex items-center gap-3">
                <Link
                  to="/shop/quickcopy-express"
                  className="px-5 py-2.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-bold text-xs shadow-lg transition-transform hover:scale-105 flex items-center gap-1.5"
                >
                  <span>Order Print Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1 bg-[#121c14] border border-[#223525] p-1 rounded-full text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 rounded-full font-medium transition-all ${
                      activeTab === 'all' ? 'bg-[#243929] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('academic')}
                    className={`px-3 py-1 rounded-full font-medium transition-all ${
                      activeTab === 'academic' ? 'bg-[#243929] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Spiral
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cad')}
                    className={`px-3 py-1 rounded-full font-medium transition-all ${
                      activeTab === 'cad' ? 'bg-[#243929] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    CAD
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 3D Showcase Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

            {/* CARD 1: 3D Spiral-Bound Project Report */}
            {(activeTab === 'all' || activeTab === 'academic') && (
              <div className="group rounded-3xl bg-gradient-to-b from-[#162319] to-[#0e1710] border border-[#273d2c] hover:border-[#bbf451]/60 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
                <div className="space-y-4">
                  
                  {/* Card Image Box */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#09110a] border border-[#253929]">
                    <img
                      src="/images/sample_spiral_report.jpg"
                      alt="3D Spiral-Bound Project Report with Frosted Cover"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#0a130b]/80 backdrop-blur-md border border-[#253929] px-2.5 py-1 rounded-full text-[10px] font-bold text-[#bbf451]">
                      Student & Corporate
                    </div>
                    <div className="absolute bottom-3 right-3 bg-[#0a130b]/90 backdrop-blur-md border border-[#253929] px-3 py-1 rounded-lg text-xs font-bold text-white">
                      From ₹45 / book
                    </div>
                  </div>

                  {/* Card Content */}
                  <div>
                    <h3 className="font-syne text-lg font-bold text-white group-hover:text-[#bbf451] transition-colors">
                      Executive Spiral Thesis & Reports
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Frosted 300μm scratch-proof acetate cover with high-tensile black metal wire-O coil. Best for college final-year submissions & corporate dossiers.
                    </p>
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">100gsm Super White</span>
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">Frosted Front Sheet</span>
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">Duplex Two-Sided</span>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#1d2d20] flex items-center justify-between">
                  <span className="text-xs text-slate-400">Ready in: <strong className="text-white">10 mins</strong></span>
                  <Link
                    to="/shop/quickcopy-express"
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[#1d2d20] group-hover:bg-[#bbf451] text-white group-hover:text-[#0b120c] transition-all flex items-center gap-1.5"
                  >
                    <span>Order Spiral</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* CARD 2: 3D Architectural Blueprint Plans */}
            {(activeTab === 'all' || activeTab === 'cad') && (
              <div className="group rounded-3xl bg-gradient-to-b from-[#162319] to-[#0e1710] border border-[#273d2c] hover:border-[#bbf451]/60 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
                <div className="space-y-4">
                  
                  {/* Card Image Box */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#09110a] border border-[#253929]">
                    <img
                      src="/images/sample_blueprint.jpg"
                      alt="3D Architectural Blueprint Large-Format Plotting"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#0a130b]/80 backdrop-blur-md border border-[#253929] px-2.5 py-1 rounded-full text-[10px] font-bold text-cyan-400">
                      AutoCAD & Revit
                    </div>
                    <div className="absolute bottom-3 right-3 bg-[#0a130b]/90 backdrop-blur-md border border-[#253929] px-3 py-1 rounded-lg text-xs font-bold text-white">
                      From ₹15 / sheet
                    </div>
                  </div>

                  {/* Card Content */}
                  <div>
                    <h3 className="font-syne text-lg font-bold text-white group-hover:text-[#bbf451] transition-colors">
                      A3 / A2 Architectural CAD Plots
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Micro-fine vector reproduction for engineering elevations, structural drawings, and civil layout prints with zero raster distortion.
                    </p>
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">A3 / A2 / A1 Sizing</span>
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">Cyan & Monochrome</span>
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">Folded or Rolled</span>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#1d2d20] flex items-center justify-between">
                  <span className="text-xs text-slate-400">Scale: <strong className="text-white">1:1 Exact</strong></span>
                  <Link
                    to="/shop/quickcopy-express"
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[#1d2d20] group-hover:bg-[#bbf451] text-white group-hover:text-[#0b120c] transition-all flex items-center gap-1.5"
                  >
                    <span>Order Blueprint</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* CARD 3: 3D High-Speed Commercial Xerox Machine */}
            {(activeTab === 'all' || activeTab === 'commercial') && (
              <div className="group rounded-3xl bg-gradient-to-b from-[#162319] to-[#0e1710] border border-[#273d2c] hover:border-[#bbf451]/60 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
                <div className="space-y-4">
                  
                  {/* Card Image Box */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#09110a] border border-[#253929]">
                    <img
                      src="/images/xerox_machine_3d.jpg"
                      alt="3D Digital Laser Xerox Press Machine"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#0a130b]/80 backdrop-blur-md border border-[#253929] px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-400">
                      Standard & Bulk
                    </div>
                    <div className="absolute bottom-3 right-3 bg-[#0a130b]/90 backdrop-blur-md border border-[#253929] px-3 py-1 rounded-lg text-xs font-bold text-white">
                      ₹1.50 - ₹2.00 / pg
                    </div>
                  </div>

                  {/* Card Content */}
                  <div>
                    <h3 className="font-syne text-lg font-bold text-white group-hover:text-[#bbf451] transition-colors">
                      High-Volume B&W & Color Laser Xerox
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Instant walk-in queue bypass. Send 500 pages of study notes, court legal petitions, or government stamp paper prints with automated duplexing.
                    </p>
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">A4 & Legal Formats</span>
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">Stapled Bundles</span>
                    <span className="text-[10px] bg-[#111c13] border border-[#223525] px-2 py-0.5 rounded text-slate-300">Zero Line Jam</span>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#1d2d20] flex items-center justify-between">
                  <span className="text-xs text-slate-400">Queue: <strong className="text-emerald-400">Instant Dispatch</strong></span>
                  <Link
                    to="/shop/quickcopy-express"
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[#1d2d20] group-hover:bg-[#bbf451] text-white group-hover:text-[#0b120c] transition-all flex items-center gap-1.5"
                  >
                    <span>Print Documents</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: INTERACTIVE 3D PAPER & FINISH SIMULATOR
        ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-[32px] bg-gradient-to-br from-[#152317] via-[#101b12] to-[#0b120c] border border-[#243a29] p-6 sm:p-10 shadow-2xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#bbf451] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Live 3D Print Calculator
              </div>
              <h3 className="font-syne text-2xl sm:text-3xl font-extrabold text-white">
                Customize Your Print Job Instantly
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Select paper grammage, ink mode, and finishing to see real-time price quotes.
              </p>
            </div>

            <div className="text-left md:text-right bg-[#1c2e20]/80 border border-[#314c36] p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Estimated Order Total
              </span>
              <span className="text-3xl font-black text-[#bbf451] font-syne">
                ₹{calculateSimulatedPrice()}
              </span>
              <span className="text-[11px] text-slate-400 block">
                ({pageCount} pages • {selectedColor.toUpperCase()} • {selectedPaper})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Paper Selection */}
            <div className="space-y-2 bg-[#121c13] p-4 rounded-2xl border border-[#213424]">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                1. Paper Stock
              </label>
              <div className="space-y-1.5">
                {[
                  { id: '75gsm', label: '75 GSM Standard', desc: 'Standard Office Copy' },
                  { id: '100gsm', label: '100 GSM Executive', desc: 'Crisp Thesis Paper (+₹1.5)' },
                  { id: 'glossy', label: '250 GSM Glossy', desc: 'Heavy Photo Card (+₹4)' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPaper(item.id as any)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                      selectedPaper === item.id
                        ? 'bg-[#213825] border-[#bbf451] text-white font-semibold'
                        : 'bg-[#162317] border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ink Mode */}
            <div className="space-y-2 bg-[#121c13] p-4 rounded-2xl border border-[#213424]">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                2. Color Palette
              </label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedColor('bw')}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                    selectedColor === 'bw'
                      ? 'bg-[#213825] border-[#bbf451] text-white font-semibold'
                      : 'bg-[#162317] border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <div>Monochrome B&W Laser</div>
                  <div className="text-[10px] text-slate-400 font-normal">₹2.00 / A4 side</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedColor('color')}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                    selectedColor === 'color'
                      ? 'bg-[#213825] border-[#bbf451] text-white font-semibold'
                      : 'bg-[#162317] border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <div>Pantone Full Color HD</div>
                  <div className="text-[10px] text-slate-400 font-normal">₹8.00 - ₹10.00 / side</div>
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between cursor-pointer">
                  <span>Double-Sided Duplex:</span>
                  <input
                    type="checkbox"
                    checked={selectedDuplex}
                    onChange={(e) => setSelectedDuplex(e.target.checked)}
                    className="accent-[#bbf451] w-4 h-4 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Binding & Finishing */}
            <div className="space-y-2 bg-[#121c13] p-4 rounded-2xl border border-[#213424]">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                3. Post-Print Finish
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'none', label: 'Loose Sheets', desc: 'Sorted in sealed poly pouch' },
                  { id: 'staple', label: 'Corner Staple', desc: 'Heavy-duty steel staple (+₹5)' },
                  { id: 'spiral', label: 'Spiral Wire-O', desc: 'Frosted cover & coil (+₹40)' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedBinding(item.id as any)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                      selectedBinding === item.id
                        ? 'bg-[#213825] border-[#bbf451] text-white font-semibold'
                        : 'bg-[#162317] border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Dispatch Action */}
            <div className="space-y-3 bg-[#121c13] p-4 rounded-2xl border border-[#213424] flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  4. Page Count: <span className="text-[#bbf451] font-bold">{pageCount}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="200"
                  step="2"
                  value={pageCount}
                  onChange={(e) => setPageCount(Number(e.target.value))}
                  className="w-full accent-[#bbf451] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>2 pgs</span>
                  <span>100 pgs</span>
                  <span>200 pgs</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/shop/quickcopy-express"
                  className="w-full py-3 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#0b120c] font-bold text-xs shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-1.5"
                >
                  <span>Dispatch With These Settings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4: VERIFIED LOCAL XEROX SHOPS (READY FOR ORDERS)
        ═══════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#bbf451]">
                <Building2 className="w-4 h-4" />
                Verified Xerox Partners
              </div>
              <h3 className="font-syne text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Select Your Nearest Print Hub
              </h3>
            </div>
            <Link
              to="/owner/register"
              className="text-xs font-semibold text-[#bbf451] hover:underline flex items-center gap-1"
            >
              Are you a Xerox center owner? Register shop here <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shop 1 */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#142117] to-[#0d160f] border border-[#253d2b] hover:border-[#bbf451]/60 transition-all flex flex-col justify-between group shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/15 px-3 py-1 rounded-full border border-[#bbf451]/30">
                    🟢 Active & Ready for Orders
                  </span>
                  <span className="text-xs text-slate-300 font-mono">₹2.00 / B&W pg</span>
                </div>
                <h4 className="font-syne text-xl font-bold text-white group-hover:text-[#bbf451] transition-colors">
                  QuickCopy Express Xerox & Print Hub
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  124 Commercial Plaza, Near City Metro Gate 2, Sector 18
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-xs bg-[#192b1d] border border-[#28422e] px-2.5 py-1 rounded-lg text-slate-300">A4 & A3 High-Speed</span>
                  <span className="text-xs bg-[#192b1d] border border-[#28422e] px-2.5 py-1 rounded-lg text-slate-300">Color Xerox Press</span>
                  <span className="text-xs bg-[#192b1d] border border-[#28422e] px-2.5 py-1 rounded-lg text-slate-300">Spiral & Hard Binding</span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-[#1f3323] flex items-center justify-between">
                <span className="text-xs text-slate-400">Timings: <strong>8:00 AM - 10:00 PM</strong></span>
                <Link
                  to="/shop/quickcopy-express"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>Open Storefront</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Shop 2 */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#142117] to-[#0d160f] border border-[#253d2b] hover:border-[#bbf451]/60 transition-all flex flex-col justify-between group shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/15 px-3 py-1 rounded-full border border-[#bbf451]/30">
                    🟢 Active & Ready for Orders
                  </span>
                  <span className="text-xs text-slate-300 font-mono">₹2.50 / B&W pg</span>
                </div>
                <h4 className="font-syne text-xl font-bold text-white group-hover:text-[#bbf451] transition-colors">
                  Metro Document Hub & CAD Plotting
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  45 North Avenue, IT Tech Park Complex, Ground Floor
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-xs bg-[#192b1d] border border-[#28422e] px-2.5 py-1 rounded-lg text-slate-300">CAD Blueprint Plotting</span>
                  <span className="text-xs bg-[#192b1d] border border-[#28422e] px-2.5 py-1 rounded-lg text-slate-300">High-Resolution Scanning</span>
                  <span className="text-xs bg-[#192b1d] border border-[#28422e] px-2.5 py-1 rounded-lg text-slate-300">Thermal Lamination</span>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-[#1f3323] flex items-center justify-between">
                <span className="text-xs text-slate-400">Timings: <strong>9:00 AM - 9:00 PM</strong></span>
                <Link
                  to="/shop/metro-doc-hub"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>Open Storefront</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 5: PRIVACY & SECURITY PILLARS
        ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-[32px] bg-[#0d160f] border border-[#213524] p-8 sm:p-12 space-y-10">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#bbf451] bg-[#1a2d1d] border border-[#2a462f] px-3.5 py-1 rounded-full">
              Engineered For Complete Document Privacy
            </span>
            <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-white">
              Why WhatsApp & Bluetooth Printing Are Obsolete
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Stop exposing personal phone numbers, DP images, and sensitive financial documents to store clerks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#121e14] p-6 rounded-2xl border border-[#233827] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-syne text-base font-bold text-white">Zero Phone Number Leak</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guest orders require zero personal credentials. Shop owners only see an anonymous order token (e.g. SX-7K9M) and your technical print preferences.
              </p>
            </div>

            <div className="bg-[#121e14] p-6 rounded-2xl border border-[#233827] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#bbf451]/10 text-[#bbf451] flex items-center justify-center border border-[#bbf451]/20">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-syne text-base font-bold text-white">Isolated Stream Sandboxing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Documents are screened with magic-bytes file verification and rendered in a sandboxed PDF viewer. Owners cannot save copies to their local computer drives.
              </p>
            </div>

            <div className="bg-[#121e14] p-6 rounded-2xl border border-[#233827] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-syne text-base font-bold text-white">Automated Document Purging</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Background cleanup jobs physically delete document files post-printing and purge records after the configured retention period.
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 6: FOR SHOP OWNERS CALL TO ACTION
        ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-[36px] bg-gradient-to-r from-[#172719] via-[#101c12] to-[#172719] border border-[#29432e] p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#bbf451] bg-[#1a2d1d] border border-[#2a462f] px-3 py-1 rounded-full">
              For Commercial Xerox & Photocopy Centers
            </span>
            <h2 className="font-syne text-2xl sm:text-3xl font-black tracking-tight">
              Modernize Your Xerox Shop Counter
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Stop answering 100 WhatsApp messages while customers crowd your counter. Print a Smart Xerox QR poster, receive clean PDF print orders straight to your screen, and eliminate queue chaos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              to="/owner/register"
              className="px-6 py-3.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-bold text-xs sm:text-sm shadow-xl transition-transform hover:scale-105 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Register Your Xerox Shop</span>
            </Link>
            <Link
              to="/owner/login"
              className="px-6 py-3.5 rounded-full bg-[#18261c] hover:bg-[#253929] border border-[#2e4732] text-white font-semibold text-xs sm:text-sm transition-all"
            >
              Owner Login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
