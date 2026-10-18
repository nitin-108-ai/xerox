import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Upload,
  Image as ImageIcon,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  RotateCcw,
  Trash2,
  Plus,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  ArrowLeft,
  Copy,
  Navigation,
  Compass,
  Settings,
  QrCode,
  Laptop
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface DailySchedule {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SHOP_CATEGORIES = [
  'Xerox & Digital Printing',
  'Commercial Print & Document Hub',
  'University Campus Print Point',
  'Stationery & Photocopy Store',
  'Legal & Architectural Blueprint Studio',
  'Express Quick Copy Center',
  'Other Document Services'
];

const STANDARD_SERVICES = [
  { type: 'PRINTING', name: 'Document Printing', desc: 'B&W & Color Laser printing (A4, A3, Legal, Letter)' },
  { type: 'PHOTOCOPY', name: 'Photocopy / Xerox', desc: 'High-speed single & double-sided document duplication' },
  { type: 'SCANNING', name: 'Digital Scanning', desc: 'High-resolution flatbed PDF and JPEG document scanning' },
  { type: 'SPIRAL_BINDING', name: 'Spiral & Comb Binding', desc: 'Professional report and thesis binding with plastic covers' },
  { type: 'LAMINATION', name: 'Thermal Lamination', desc: 'ID card, certificate, and document protective pouch lamination' },
  { type: 'SOFT_BINDING', name: 'Soft / Hard Book Binding', desc: 'Project reports and thesis hardbound binding with golden embossing' },
];

export const OwnerProfilePage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [copiedShopId, setCopiedShopId] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Original snapshot to compare unsaved changes
  const [initialData, setInitialData] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [ownerDisplayName, setOwnerDisplayName] = useState('');
  const [category, setCategory] = useState('Xerox & Digital Printing');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [pincode, setPincode] = useState('110001');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [isStorefrontVisible, setIsStorefrontVisible] = useState(true);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(5.00);
  const [estCompletionTime, setEstCompletionTime] = useState('15-30 mins');
  const [retentionHours, setRetentionHours] = useState<number>(24);

  // Schedules & Holidays
  const [weeklySchedule, setWeeklySchedule] = useState<DailySchedule[]>(
    DAYS_OF_WEEK.map((day) => ({
      day,
      open: '08:30',
      close: '21:30',
      isClosed: day === 'Sunday',
    }))
  );
  const [weeklyHolidays, setWeeklyHolidays] = useState<string[]>(['Sunday']);

  // Available Services
  const [services, setServices] = useState<any[]>(
    STANDARD_SERVICES.map((s) => ({
      serviceType: s.type,
      name: s.name,
      description: s.desc,
      isEnabled: true,
      rate: s.type === 'PRINTING' ? 2.0 : s.type === 'PHOTOCOPY' ? 1.5 : s.type === 'SCANNING' ? 5.0 : 20.0,
      unit: s.type === 'SPIRAL_BINDING' ? 'per_book' : s.type === 'LAMINATION' ? 'per_sheet' : 'per_page',
    }))
  );

  const [shopRecord, setShopRecord] = useState<any>(null);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Load Shop Profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getOwnerShop();
      const shop = res.shop;
      setShopRecord(shop);

      setName(shop.name || '');
      setOwnerDisplayName(shop.owner_display_name || user?.fullName || '');
      setCategory(shop.category || 'Xerox & Digital Printing');
      setDescription(shop.description || '');
      setAddress(shop.address || '');
      setCity(shop.city || 'New Delhi');
      setState(shop.state || 'Delhi');
      setPincode(shop.pincode || '110001');
      setContactEmail(shop.contact_email || user?.email || '');
      setContactPhone(shop.contact_phone || shop.phone_for_verification || '');
      setLogoUrl(shop.logo_url || '');
      setCoverPhotoUrl(shop.cover_photo_url || '');
      setLatitude(shop.latitude != null ? String(shop.latitude) : '');
      setLongitude(shop.longitude != null ? String(shop.longitude) : '');
      setGalleryUrls(Array.isArray(shop.gallery_urls) ? shop.gallery_urls : []);
      setIsStorefrontVisible(shop.is_storefront_visible !== false);
      setMinOrderAmount(parseFloat(shop.min_order_amount || '5.00'));
      setEstCompletionTime(shop.est_completion_time || '15-30 mins');
      setRetentionHours(shop.retention_hours || 24);

      if (Array.isArray(shop.weekly_schedule) && shop.weekly_schedule.length > 0) {
        setWeeklySchedule(shop.weekly_schedule);
      }
      if (Array.isArray(shop.weekly_holidays)) {
        setWeeklyHolidays(shop.weekly_holidays);
      }

      // Map loaded services
      if (Array.isArray(res.services) && res.services.length > 0) {
        const loadedMap = new Map<string, any>();
        res.services.forEach((s: any) => loadedMap.set(s.service_type, s));

        const merged = STANDARD_SERVICES.map((def) => {
          const found = loadedMap.get(def.type);
          if (found) {
            return {
              serviceType: def.type,
              name: def.name,
              description: found.description || def.desc,
              isEnabled: found.is_enabled !== false,
              rate: parseFloat(found.rate || '0'),
              unit: found.unit || (def.type === 'SPIRAL_BINDING' ? 'per_book' : 'per_page'),
            };
          }
          return {
            serviceType: def.type,
            name: def.name,
            description: def.desc,
            isEnabled: false,
            rate: 0,
            unit: 'per_page',
          };
        });
        setServices(merged);
      }

      // Save initial snapshot
      setInitialData({
        name: shop.name || '',
        ownerDisplayName: shop.owner_display_name || user?.fullName || '',
        category: shop.category || 'Xerox & Digital Printing',
        description: shop.description || '',
        address: shop.address || '',
        city: shop.city || 'New Delhi',
        state: shop.state || 'Delhi',
        pincode: shop.pincode || '110001',
        contactEmail: shop.contact_email || user?.email || '',
        contactPhone: shop.contact_phone || shop.phone_for_verification || '',
        logoUrl: shop.logo_url || '',
        coverPhotoUrl: shop.cover_photo_url || '',
        latitude: shop.latitude != null ? String(shop.latitude) : '',
        longitude: shop.longitude != null ? String(shop.longitude) : '',
        galleryUrls: Array.isArray(shop.gallery_urls) ? shop.gallery_urls : [],
        isStorefrontVisible: shop.is_storefront_visible !== false,
        minOrderAmount: parseFloat(shop.min_order_amount || '5.00'),
        estCompletionTime: shop.est_completion_time || '15-30 mins',
        retentionHours: shop.retention_hours || 24,
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setErrorMessage(err.message || 'Failed to load shop profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Compute Unsaved Changes
  const hasUnsavedChanges = Boolean(
    initialData &&
      (name !== initialData.name ||
        ownerDisplayName !== initialData.ownerDisplayName ||
        category !== initialData.category ||
        description !== initialData.description ||
        address !== initialData.address ||
        city !== initialData.city ||
        state !== initialData.state ||
        pincode !== initialData.pincode ||
        contactEmail !== initialData.contactEmail ||
        contactPhone !== initialData.contactPhone ||
        logoUrl !== initialData.logoUrl ||
        coverPhotoUrl !== initialData.coverPhotoUrl ||
        latitude !== initialData.latitude ||
        longitude !== initialData.longitude ||
        JSON.stringify(galleryUrls) !== JSON.stringify(initialData.galleryUrls) ||
        isStorefrontVisible !== initialData.isStorefrontVisible ||
        minOrderAmount !== initialData.minOrderAmount ||
        estCompletionTime !== initialData.estCompletionTime ||
        retentionHours !== initialData.retentionHours)
  );

  const handleReset = () => {
    if (!initialData) return;
    setName(initialData.name);
    setOwnerDisplayName(initialData.ownerDisplayName);
    setCategory(initialData.category);
    setDescription(initialData.description);
    setAddress(initialData.address);
    setCity(initialData.city);
    setState(initialData.state);
    setPincode(initialData.pincode);
    setContactEmail(initialData.contactEmail);
    setContactPhone(initialData.contactPhone);
    setLogoUrl(initialData.logoUrl);
    setCoverPhotoUrl(initialData.coverPhotoUrl);
    setLatitude(initialData.latitude);
    setLongitude(initialData.longitude);
    setGalleryUrls(initialData.galleryUrls);
    setIsStorefrontVisible(initialData.isStorefrontVisible);
    setMinOrderAmount(initialData.minOrderAmount);
    setEstCompletionTime(initialData.estCompletionTime);
    setRetentionHours(initialData.retentionHours);
    setErrorMessage(null);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
        setSuccessMessage('Map coordinates auto-detected from device GPS! Click "Save Changes" to save.');
      },
      (err) => {
        alert(`Location detection failed: ${err.message}. You can manually type your latitude & longitude.`);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleDayScheduleChange = (dayIndex: number, field: keyof DailySchedule, value: any) => {
    const updated = [...weeklySchedule];
    updated[dayIndex] = {
      ...updated[dayIndex],
      [field]: value,
    };
    setWeeklySchedule(updated);

    // If day is closed, reflect in weeklyHolidays
    const dayName = updated[dayIndex].day;
    if (field === 'isClosed') {
      if (value && !weeklyHolidays.includes(dayName)) {
        setWeeklyHolidays([...weeklyHolidays, dayName]);
      } else if (!value && weeklyHolidays.includes(dayName)) {
        setWeeklyHolidays(weeklyHolidays.filter((d) => d !== dayName));
      }
    }
  };

  const handleHolidayToggle = (day: string) => {
    const isCurrentlyHoliday = weeklyHolidays.includes(day);
    const newHolidays = isCurrentlyHoliday
      ? weeklyHolidays.filter((d) => d !== day)
      : [...weeklyHolidays, day];

    setWeeklyHolidays(newHolidays);

    // Sync into schedule
    const updated = weeklySchedule.map((s) => (s.day === day ? { ...s, isClosed: !isCurrentlyHoliday } : s));
    setWeeklySchedule(updated);
  };

  const handleServiceToggle = (index: number) => {
    const updated = [...services];
    updated[index].isEnabled = !updated[index].isEnabled;
    setServices(updated);
  };

  // Upload Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file must be smaller than 5MB.');
      return;
    }

    try {
      setUploadingLogo(true);
      const res = await api.uploadOwnerImage(file);
      setLogoUrl(res.url);
      setSuccessMessage('Logo uploaded successfully! Click "Save Changes" to apply.');
    } catch (err: any) {
      alert(err.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Cover photo must be smaller than 8MB.');
      return;
    }

    try {
      setUploadingCover(true);
      const res = await api.uploadOwnerImage(file);
      setCoverPhotoUrl(res.url);
      setSuccessMessage('Shop cover photo uploaded! Click "Save Changes" to apply.');
    } catch (err: any) {
      alert(err.message || 'Failed to upload cover photo.');
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Gallery photo must be smaller than 5MB.');
      return;
    }

    try {
      setUploadingGallery(true);
      const res = await api.uploadOwnerImage(file);
      setGalleryUrls([...galleryUrls, res.url]);
      setSuccessMessage('Photo added to gallery! Click "Save Changes" to apply.');
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingGallery(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryUrls(galleryUrls.filter((_, i) => i !== index));
  };

  // Submit Profile Form
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim() || name.length < 3) {
      setErrorMessage('Shop name must be at least 3 characters long.');
      return;
    }

    if (!address.trim() || address.length < 5) {
      setErrorMessage('Complete address is required (at least 5 characters).');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.updateOwnerProfile({
        name: name.trim(),
        ownerDisplayName: ownerDisplayName.trim(),
        category,
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        logoUrl: logoUrl.trim() || null,
        coverPhotoUrl: coverPhotoUrl.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        galleryUrls,
        weeklySchedule,
        weeklyHolidays,
        isStorefrontVisible,
        minOrderAmount: Number(minOrderAmount),
        estCompletionTime,
        retentionHours: Number(retentionHours),
        services: services.map((s) => ({
          serviceType: s.serviceType,
          isEnabled: s.isEnabled,
          description: s.description,
          rate: Number(s.rate || 0),
          unit: s.unit || 'per_page',
        })),
      });

      setSuccessMessage('Shop profile, business hours, and services saved successfully!');
      await loadProfile();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save shop profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <OwnerLayout shop={shopRecord} title="My Shop Profile">
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#bbf451] mb-3" />
          <p className="text-sm font-medium text-slate-400">Loading shop profile configuration...</p>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout
      shop={shopRecord}
      title="My Shop Profile"
      subtitle="Manage your public storefront identity, gallery photos, operating hours, and customer services."
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="sticky top-20 z-20 bg-amber-950/90 border border-amber-500/50 backdrop-blur-md rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-amber-200">You have unsaved profile changes</p>
                <p className="text-[11px] text-amber-300/80">Remember to save before leaving this page.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-[#0c140e] hover:bg-amber-950/50 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Unsaved Changes
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black shadow-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Success / Error Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#bbf451] shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back to Receiving Panel Navigation */}
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
            <Link
              to="/owner/printers"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-300 text-xs font-semibold shadow-md transition"
            >
              <Laptop className="w-3.5 h-3.5 text-[#bbf451]" />
              <span>Devices</span>
            </Link>
          </div>
        </div>

        {/* Permanent Shop ID & Verification Card */}
        <div className="bg-gradient-to-r from-[#142317] via-[#0f1a11] to-[#09110b] text-white rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-[#273d2c]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 px-2.5 py-0.5 rounded-full">
                  Permanent Shop ID
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bbf451] bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#bbf451]" />
                  Verified Counter Ownership
                </span>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <p className="text-xl sm:text-2xl font-mono font-black tracking-tight text-[#bbf451]">
                  {shopRecord?.id || user?.shopId || 'shp-quickcopy-001'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const sid = shopRecord?.id || user?.shopId || 'shp-quickcopy-001';
                    navigator.clipboard.writeText(sid);
                    setCopiedShopId(true);
                    setTimeout(() => setCopiedShopId(false), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#0c140e] hover:bg-[#1b2b1e] text-white transition flex items-center gap-1 text-xs font-semibold border border-[#273d2c]"
                  title="Copy Permanent Shop ID"
                >
                  {copiedShopId ? <Check className="w-3.5 h-3.5 text-[#bbf451]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedShopId ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                This Shop ID is permanent and securely anchors your customer QR code and public storefront URL.
                Updating your shop name, logo, phone, or address will <span className="font-bold text-white underline decoration-[#bbf451]">never change this ID</span> or invalidate your counter posters.
              </p>
            </div>

            <div className="bg-[#0c140e] border border-[#273d2c] rounded-2xl p-4 text-xs space-y-2 shrink-0 md:min-w-[240px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified Recovery Status</p>
              <div className="flex items-center gap-2 text-white font-medium">
                <Phone className="w-3.5 h-3.5 text-[#bbf451] shrink-0" />
                <span className="font-mono">{shopRecord?.phone_for_verification || (user as any)?.phoneNumber || '+91 98111 22334'}</span>
                <span className="text-[10px] bg-emerald-950/60 border border-emerald-500/40 text-[#bbf451] px-1.5 py-0.2 rounded font-bold">Verified</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate max-w-[180px]">{user?.email || 'owner@smartxerox.io'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Header Card & Quick Actions */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0c140e] border border-[#273d2c] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-[#bbf451]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider bg-[#0c140e] border border-[#273d2c] px-2.5 py-0.5 rounded-full font-mono">
                  {category}
                </span>
                {shopRecord?.is_verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#bbf451] bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-[#bbf451]" />
                    Verified Store
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    Verification Pending
                  </span>
                )}
                {isStorefrontVisible ? (
                  <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Public Storefront Active
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
                    Storefront Hidden
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white font-syne tracking-tight mt-1.5">
                {name || 'My Xerox Shop'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Managed by <span className="font-semibold text-slate-200">{ownerDisplayName || user?.fullName}</span> •{' '}
                {city}, {state}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('shopNameInput');
                if (el) el.focus();
                setSuccessMessage('Editing mode active. Make changes to any field below and click "Save Changes".');
              }}
              className="px-4 py-2.5 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-200 text-xs font-semibold shadow-md flex items-center gap-2 transition-colors"
              title="Edit Profile Details"
            >
              <Store className="w-4 h-4 text-[#bbf451]" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-200 text-xs font-semibold shadow-md flex items-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4 text-[#bbf451]" />
              <span>Preview Public Profile</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black shadow-[0_0_20px_rgba(187,244,81,0.25)] flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Main Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: General Information & Brand Identity */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
            <div className="border-b border-[#273d2c]/60 pb-4">
              <h2 className="text-base font-black text-white font-syne flex items-center gap-2">
                <Store className="w-4 h-4 text-[#bbf451]" />
                1. General Information & Identity
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your store name, owner representation, category, and public overview description.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Shop Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="shopNameInput"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. QuickCopy Express Xerox & Digital Print"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Owner's Display Name
                </label>
                <input
                  type="text"
                  value={ownerDisplayName}
                  onChange={(e) => setOwnerDisplayName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Shop Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                >
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Storefront Visibility
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#273d2c] bg-[#0c140e]">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">
                      {isStorefrontVisible ? 'Customer Orders Enabled' : 'Storefront Hidden'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isStorefrontVisible
                        ? 'Customers can scan QR and submit print jobs.'
                        : 'Store is hidden from public customers temporarily.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      checked={isStorefrontVisible}
                      onChange={(e) => setIsStorefrontVisible(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#1b2b1e] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#080d09] after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#bbf451]"></div>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Shop Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers about your machines, print paper types (80 GSM, 100 GSM glossy), thesis binding, or turn-around speed..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Logo & Gallery Photos */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
            <div className="border-b border-[#273d2c]/60 pb-4">
              <h2 className="text-base font-black text-white font-syne flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#bbf451]" />
                2. Shop Logo & Photo Gallery
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Upload your store logo and real shop photos (counter, printing machines, binding samples) to build customer trust.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shop Logo Card */}
              <div className="border border-[#273d2c] rounded-2xl p-5 bg-[#0c140e] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Store Logo / Icon (1:1)
                  </h3>
                  <span className="text-[10px] text-slate-400">Square</span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#273d2c] rounded-2xl bg-[#121c14] text-center">
                  {logoUrl ? (
                    <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-[#273d2c] shadow-sm mb-3">
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-5 h-5 text-rose-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#0c140e] border border-[#273d2c] flex items-center justify-center text-[#bbf451] mb-3">
                      <Store className="w-8 h-8" />
                    </div>
                  )}

                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-3.5 py-2 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
                  >
                    {uploadingLogo ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {logoUrl ? 'Change Logo Image' : 'Upload Shop Logo'}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2">Max 5MB • JPG, PNG, WebP</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Or Enter Image URL:
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#273d2c] bg-[#121c14] text-xs font-mono text-white focus:border-[#bbf451] outline-none"
                  />
                </div>
              </div>

              {/* Shop Cover / Area Photo Card */}
              <div className="border border-[#273d2c] rounded-2xl p-5 bg-[#0c140e] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Shop Cover / Area Photo (16:9)
                  </h3>
                  <span className="text-[10px] text-slate-400">Storefront Banner</span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#273d2c] rounded-2xl bg-[#121c14] text-center">
                  {coverPhotoUrl ? (
                    <div className="relative group w-full h-24 rounded-2xl overflow-hidden border border-[#273d2c] shadow-sm mb-3">
                      <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCoverPhotoUrl('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        title="Remove Cover Photo"
                      >
                        <Trash2 className="w-5 h-5 text-rose-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-2xl bg-[#0c140e] border border-[#273d2c] flex flex-col items-center justify-center text-slate-400 mb-3">
                      <ImageIcon className="w-8 h-8 text-[#bbf451] mb-1" />
                      <span className="text-[10px] text-slate-400 font-semibold">Storefront / Counter Overview</span>
                    </div>
                  )}

                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="px-3.5 py-2 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
                  >
                    {uploadingCover ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {coverPhotoUrl ? 'Change Cover Photo' : 'Upload Cover / Area Photo'}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2">Max 8MB • Wide Storefront Photo</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Or Enter Cover URL:
                  </label>
                  <input
                    type="url"
                    value={coverPhotoUrl}
                    onChange={(e) => setCoverPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[#273d2c] bg-[#121c14] text-xs font-mono text-white focus:border-[#bbf451] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Gallery Photos Card */}
            <div className="border border-[#273d2c] rounded-2xl p-5 bg-[#0c140e] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Storefront & Machinery Gallery Photos ({galleryUrls.length})
                </h3>

                <input
                  ref={galleryFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleGalleryUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  disabled={uploadingGallery}
                  className="px-3 py-1.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
                >
                  {uploadingGallery ? (
                    <div className="w-3.5 h-3.5 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Add Gallery Photo
                </button>
              </div>

              {galleryUrls.length === 0 ? (
                <div className="border-2 border-dashed border-[#273d2c] rounded-2xl p-8 bg-[#121c14] text-center">
                  <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">No gallery photos added yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Photos of your counter, Xerox printers, or sample documents help customers identify your store.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-[#273d2c] bg-[#121c14] aspect-video shadow-xs"
                    >
                      <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(idx)}
                          className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Complete Address & Business Contact */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
            <div className="border-b border-[#273d2c]/60 pb-4">
              <h2 className="text-base font-black text-white font-syne flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#bbf451]" />
                3. Shop Address & Business Contact
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Help customers locate your Xerox shop easily on maps and contact you if needed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Complete Shop Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop 14, Commercial Complex, Near Gate 2 Metro Station"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. New Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 110001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Business Phone (Customer Inquiries)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Business Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@myshop.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Estimated Completion Turnaround
                </label>
                <input
                  type="text"
                  value={estCompletionTime}
                  onChange={(e) => setEstCompletionTime(e.target.value)}
                  placeholder="e.g. 15-30 mins or Same Day"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#273d2c] text-xs focus:border-[#bbf451] outline-none font-medium text-white bg-[#0c140e] shadow-inner"
                />
              </div>

              {/* Map Location & GPS Coordinates */}
              <div className="md:col-span-3 pt-3 border-t border-[#273d2c]/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-[#bbf451]" />
                      Shop Map Location &amp; GPS Coordinates
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Pinpoint your Xerox counter so customers can navigate directly using Google Maps.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="px-3.5 py-1.5 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-[#bbf451] text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 self-start sm:self-auto"
                  >
                    {isLocating ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#bbf451] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Compass className="w-3.5 h-3.5" />
                    )}
                    <span>{isLocating ? 'Detecting Location...' : 'Use Current Device GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 28.613939"
                      className="w-full px-3 py-2 rounded-xl border border-[#273d2c] bg-[#0c140e] text-white text-xs font-mono focus:border-[#bbf451] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 77.209021"
                      className="w-full px-3 py-2 rounded-xl border border-[#273d2c] bg-[#0c140e] text-white text-xs font-mono focus:border-[#bbf451] outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    {latitude && longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-[#bbf451] hover:bg-emerald-900/50 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View on Google Maps</span>
                      </a>
                    ) : (
                      <div className="w-full px-3 py-2 rounded-xl border border-dashed border-[#273d2c] text-slate-500 text-xs flex items-center justify-center text-center">
                        Coordinates not set
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Daily Operating Schedule & Weekly Holidays */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
            <div className="border-b border-[#273d2c]/60 pb-4">
              <h2 className="text-base font-black text-white font-syne flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#bbf451]" />
                4. Operating Hours & Weekly Holidays
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Specify opening and closing hours for every day of the week, plus designated shop holidays.
              </p>
            </div>

            {/* Weekly Holidays Selector Badges */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Weekly Holiday(s)
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isHoliday = weeklyHolidays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleHolidayToggle(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isHoliday
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-md'
                          : 'bg-[#0c140e] border-[#273d2c] text-slate-300 hover:text-white'
                      }`}
                    >
                      {day} {isHoliday ? '• Closed' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Schedule Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#273d2c] text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-[#0c140e]/90">
                    <th className="py-2.5 pr-4 pl-3">Day</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Opening Time</th>
                    <th className="py-2.5 px-4">Closing Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#273d2c]/40 text-xs">
                  {weeklySchedule.map((s, idx) => (
                    <tr key={s.day} className={s.isClosed ? 'bg-[#09110b]/50 opacity-60' : 'hover:bg-[#142317]/50 transition-colors'}>
                      <td className="py-3 pr-4 pl-3 font-bold text-white">{s.day}</td>
                      <td className="py-3 px-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!s.isClosed}
                            onChange={(e) => handleDayScheduleChange(idx, 'isClosed', !e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#1b2b1e] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#080d09] after:border-slate-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#bbf451]"></div>
                          <span className="ml-2 text-[11px] font-medium text-slate-300">
                            {s.isClosed ? 'Closed' : 'Open'}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          disabled={s.isClosed}
                          value={s.open}
                          onChange={(e) => handleDayScheduleChange(idx, 'open', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#273d2c] bg-[#0c140e] text-white text-xs disabled:bg-[#09110b] disabled:text-slate-600 font-mono focus:border-[#bbf451] outline-none"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          disabled={s.isClosed}
                          value={s.close}
                          onChange={(e) => handleDayScheduleChange(idx, 'close', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#273d2c] bg-[#0c140e] text-white text-xs disabled:bg-[#09110b] disabled:text-slate-600 font-mono focus:border-[#bbf451] outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Available Services */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
            <div className="border-b border-[#273d2c]/60 pb-4">
              <h2 className="text-base font-black text-white font-syne flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#bbf451]" />
                5. Available Document Services
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Toggle the Xerox and document services your counter provides to incoming customers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((svc, idx) => (
                <div
                  key={svc.serviceType}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    svc.isEnabled
                      ? 'border-[#273d2c] bg-[#0c140e] shadow-md'
                      : 'border-[#273d2c]/40 bg-[#09110b]/50 opacity-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{svc.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{svc.description}</p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={svc.isEnabled}
                      onChange={() => handleServiceToggle(idx)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#1b2b1e] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#080d09] after:border-slate-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#bbf451]"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('shopNameInput');
                  if (el) el.focus();
                  setSuccessMessage('Editing mode active. Make changes to any field above and click "Save Changes".');
                }}
                className="px-4 py-2.5 rounded-xl border border-[#273d2c] hover:bg-[#121c14] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Edit Details"
              >
                <Store className="w-3.5 h-3.5 text-[#bbf451]" />
                <span>Edit Details</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasUnsavedChanges}
                className="px-4 py-2.5 rounded-xl border border-[#273d2c] hover:bg-[#121c14] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Changes
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-[#bbf451]/30 bg-[#bbf451]/10 hover:bg-[#bbf451]/20 text-[#bbf451] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black shadow-[0_0_20px_rgba(187,244,81,0.25)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Live Public Profile Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#080d09] rounded-3xl max-w-2xl w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#0c140e] border-b border-[#273d2c] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#bbf451]">
                  Customer View Mockup
                </p>
                <h3 className="text-base font-black text-white font-syne">Public Storefront Preview</h3>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#121c14] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Storefront Hero Preview */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="flex items-start gap-4 pb-6 border-b border-[#273d2c]/60">
                <div className="w-20 h-20 rounded-2xl bg-[#0c140e] border border-[#273d2c] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                  {logoUrl ? (
                    <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-10 h-10 text-[#bbf451]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#bbf451]/10 text-[#bbf451] px-2.5 py-0.5 rounded-full border border-[#bbf451]/30">
                      {category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      <ShieldCheck className="w-3 h-3 text-[#bbf451]" />
                      Verified
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-white font-syne mt-1">{name || 'Your Shop Name'}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {address}, {city}, {state} - {pincode}
                  </p>
                </div>
              </div>

              {description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-syne">About Us</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0c140e] p-3.5 rounded-xl border border-[#273d2c]">
                    {description}
                  </p>
                </div>
              )}

              {/* Gallery Preview */}
              {galleryUrls.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-syne">Shop Photos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {galleryUrls.map((url, i) => (
                      <div key={i} className="aspect-video rounded-xl overflow-hidden border border-[#273d2c]">
                        <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services Offered */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-syne">Available Services</h4>
                <div className="grid grid-cols-2 gap-2">
                  {services
                    .filter((s) => s.isEnabled)
                    .map((s) => (
                      <div key={s.serviceType} className="p-2.5 rounded-xl bg-[#0c140e] border border-[#273d2c] text-xs">
                        <p className="font-bold text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.description}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Turnaround & Minimum Order */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#0c140e] border border-[#273d2c] text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Min. Order Amount</span>
                  <span className="font-black text-[#bbf451] text-sm font-mono">₹{Number(minOrderAmount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Est. Completion</span>
                  <span className="font-bold text-white text-sm">{estCompletionTime}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#0c140e] px-6 py-3.5 border-t border-[#273d2c] flex items-center justify-between">
              <span className="text-xs text-slate-400">Live preview generated from current form values</span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#bbf451] text-[#080d09] text-xs font-black shadow-md"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};
