'use client';

import * as React from 'react';
import {
  Building2,
  Store,
  Phone,
  MapPin,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Sparkles,
  Printer,
  Users,
  UserPlus,
  Trash2,
  Scissors,
  ShieldCheck,
  Tag,
  Mail,
  Crown,
  AlertTriangle,
  X,
  Search,
  Clock,
  Zap,
  TrendingUp,
  RotateCcw,
  Check,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { shopsDb, staffDb, ratesDb } from '@/lib/db';
import { mockShop } from '@/lib/mock-data';
import type { Shop, ShopMember, ShopMemberRole, GarmentRate, GarmentType } from '@/types/tailor';
import { isValidPakistaniPhone } from '@/lib/whatsapp';
import { getCurrentUser, isSupabaseConfigured } from '@/lib/supabase/client';

const ROLE_METADATA: Record<
  ShopMemberRole,
  {
    label: string;
    urLabel: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }
> = {
  OWNER: {
    label: 'Workshop Owner',
    urLabel: 'مالک / پروپرائیٹر',
    badgeClass: 'border-gold/50 bg-gold/15 text-gold shadow-[0_0_12px_rgba(212,175,55,0.2)]',
    icon: Crown,
    description: 'Full administrative access and shop ownership',
  },
  MANAGER: {
    label: 'Workshop Manager',
    urLabel: 'منیجر / انچارج',
    badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    icon: ShieldCheck,
    description: 'Production oversight and order operations management',
  },
  CUTTING_MASTER: {
    label: 'Cutting Master',
    urLabel: 'ماسٹر کٹر / کٹائی ماسٹر',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    icon: Scissors,
    description: 'Fabric drafting, cloth cutting, and sizing specifications',
  },
  STITCHER: {
    label: 'Stitcher',
    urLabel: 'درزی / سلائی کاریگر',
    badgeClass: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
    icon: Sparkles,
    description: 'Garment assembly, stitching, and finishing',
  },
  PRESSMAN: {
    label: 'Pressman',
    urLabel: 'استری والا / پریس مین',
    badgeClass: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
    icon: Tag,
    description: 'Steam pressing, creasing, and packaging',
  },
  COUNTER_CLERK: {
    label: 'Counter Clerk',
    urLabel: 'کاؤنٹر کلرک / بکنگ انچارج',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    icon: Store,
    description: 'Customer intake, order booking, and payment collections',
  },
  STAFF: {
    label: 'Workshop Staff',
    urLabel: 'ورکشاپ عملہ',
    badgeClass: 'border-gray-500/40 bg-gray-500/15 text-gray-300',
    icon: Users,
    description: 'General workshop assistance and operations',
  },
};

const ASSIGNABLE_ROLES: { role: ShopMemberRole; title: string; urTitle: string }[] = [
  { role: 'CUTTING_MASTER', title: 'Cutting Master', urTitle: 'ماسٹر کٹر' },
  { role: 'STITCHER', title: 'Stitcher', urTitle: 'درزی / سلائی کاریگر' },
  { role: 'PRESSMAN', title: 'Pressman', urTitle: 'استری والا' },
  { role: 'COUNTER_CLERK', title: 'Counter Clerk', urTitle: 'کاؤنٹر کلرک' },
  { role: 'MANAGER', title: 'Manager', urTitle: 'منیجر' },
  { role: 'STAFF', title: 'General Staff', urTitle: 'ورکشاپ عملہ' },
];

const GARMENT_METADATA: Record<
  GarmentType,
  {
    title: string;
    urTitle: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }
> = {
  MEN_SHALWAR_KAMEEZ: {
    title: "Men's Shalwar Kameez",
    urTitle: 'مردانہ شلوار قمیض',
    description: 'Traditional 2-piece South Asian bespoke suit',
    icon: Scissors,
    accentColor: 'border-gold/40 bg-gold/10 text-gold',
  },
  MEN_KURTA: {
    title: "Men's Kurta",
    urTitle: 'مردانہ کرتہ',
    description: 'Straight or round cut festive & casual single top',
    icon: Sparkles,
    accentColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  },
  WAISTCOAT: {
    title: 'Waistcoat',
    urTitle: 'واسکٹ / کوٹی',
    description: 'Bespoke sleeveless vest with ban or v-neck cut',
    icon: ShieldCheck,
    accentColor: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  },
  PRINCE_SUIT: {
    title: 'Prince Suit',
    urTitle: 'پرنس سوٹ / شیروانی',
    description: 'Formal luxury tailored ceremonial coat & trouser',
    icon: Crown,
    accentColor: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
  },
  TROUSER_SHIRT: {
    title: 'Trouser + Shirt',
    urTitle: 'ٹراؤزر شرٹ / پینٹ قمیض',
    description: 'Western cut pant and collared casual/formal shirt',
    icon: Tag,
    accentColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  },
  WOMEN_SUIT: {
    title: "Ladies' Suit",
    urTitle: 'خواتین سوٹ / لیڈیز سوٹ',
    description: '2-piece / 3-piece bespoke ladies traditional suit',
    icon: Store,
    accentColor: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
  },
};

export default function SettingsPage() {
  const [shop, setShop] = React.useState<Shop>(mockShop);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<'profile' | 'staff' | 'catalog' | 'printer'>('profile');
  const [notification, setNotification] = React.useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);

  // Staff Management State
  const [staffMembers, setStaffMembers] = React.useState<ShopMember[]>([]);
  const [staffLoading, setStaffLoading] = React.useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState<boolean>(false);
  const [newStaffEmail, setNewStaffEmail] = React.useState<string>('');
  const [newStaffRole, setNewStaffRole] = React.useState<ShopMemberRole>('CUTTING_MASTER');
  const [addingStaff, setAddingStaff] = React.useState<boolean>(false);
  const [addStaffError, setAddStaffError] = React.useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = React.useState<ShopMember | null>(null);
  const [deletingStaff, setDeletingStaff] = React.useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = React.useState<string>('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');

  // Garment Catalog & Rates State
  const [garmentRates, setGarmentRates] = React.useState<GarmentRate[]>([]);
  const [ratesLoading, setRatesLoading] = React.useState<boolean>(false);
  const [savingRates, setSavingRates] = React.useState<boolean>(false);
  const [resettingRates, setResettingRates] = React.useState<boolean>(false);

  // Auto-dismiss notification after 4 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load shop settings on component mount
  React.useEffect(() => {
    let isMounted = true;

    async function loadShopProfile() {
      setLoading(true);
      try {
        if (isSupabaseConfigured()) {
          const user = await getCurrentUser();
          if (user?.id && isMounted) {
            setCurrentUserId(user.id);
          }
          const fetchedShop = await shopsDb.getCurrentShop(user?.id);
          if (fetchedShop && isMounted) {
            setShop((prev) => ({
              ...prev,
              ...fetchedShop,
              phone: fetchedShop.phone || prev.phone || prev.owner_phone,
              secondary_phone: fetchedShop.secondary_phone || prev.secondary_phone,
              ntn_number: fetchedShop.ntn_number || prev.ntn_number,
              receipt_header: fetchedShop.receipt_header || prev.receipt_header,
              receipt_footer: fetchedShop.receipt_footer || prev.receipt_footer,
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load shop settings from Supabase, using local defaults:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadShopProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load staff members when shop is available or activeTab changes to staff
  const loadStaff = React.useCallback(async (shopId: string) => {
    setStaffLoading(true);
    try {
      const members = await staffDb.getByShopId(shopId);
      setStaffMembers(members);
    } catch (err) {
      console.warn('Failed to load staff members:', err);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  // Load garment catalog rates
  const loadRates = React.useCallback(async (shopId: string) => {
    setRatesLoading(true);
    try {
      const rates = await ratesDb.getByShopId(shopId);
      setGarmentRates(rates);
    } catch (err) {
      console.warn('Failed to load garment rates:', err);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const shopId = shop.id || mockShop.id;
    loadStaff(shopId);
    loadRates(shopId);
  }, [shop.id, loadStaff, loadRates]);

  const handleRateFieldChange = (
    garmentType: GarmentType,
    field: keyof GarmentRate,
    value: number | boolean
  ) => {
    setGarmentRates((prev) =>
      prev.map((r) => (r.garment_type === garmentType ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      const shopId = shop.id || mockShop.id;
      const updated = await ratesDb.batchUpdateRates(shopId, garmentRates);
      setGarmentRates(updated);
      setNotification({
        message: 'Garment stitching catalog and rates saved successfully!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to save garment rates:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to save garment rates.',
        type: 'error',
      });
    } finally {
      setSavingRates(false);
    }
  };

  const handleResetRates = async () => {
    setResettingRates(true);
    try {
      const shopId = shop.id || mockShop.id;
      const defaults = await ratesDb.resetDefaults(shopId);
      setGarmentRates(defaults);
      setNotification({
        message: 'Restored recommended market stitching rates and timelines!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to reset default rates:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to restore default market rates.',
        type: 'error',
      });
    } finally {
      setResettingRates(false);
    }
  };

  const handleFieldChange = (field: keyof Shop, value: string) => {
    setShop((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'phone') {
      if (value.trim().length > 0 && !isValidPakistaniPhone(value)) {
        setPhoneError('Please enter a valid Pakistani number (e.g. 0300-1234567)');
      } else {
        setPhoneError(null);
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number if present
    if (shop.phone && !isValidPakistaniPhone(shop.phone)) {
      setPhoneError('Please enter a valid Pakistani mobile number (e.g. 0300-1234567)');
      setNotification({
        message: 'Invalid primary phone format. Please check the number.',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const user = await getCurrentUser();
        const shopId = shop.id || user?.id || mockShop.id;
        const updated = await shopsDb.update(shopId, {
          name: shop.name,
          phone: shop.phone || null,
          secondary_phone: shop.secondary_phone || null,
          address: shop.address || null,
          city: shop.city || 'Wah Cantt',
          ntn_number: shop.ntn_number || null,
          receipt_header: shop.receipt_header || null,
          receipt_footer: shop.receipt_footer || null,
        });

        setShop((prev) => ({
          ...prev,
          ...updated,
        }));

        setNotification({
          message: 'Workshop profile and branding settings updated successfully!',
          type: 'success',
        });
      } else {
        // Offline / Local save
        setNotification({
          message: 'Workshop settings saved locally (Offline mode).',
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Error saving shop profile:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to save shop settings. Please try again.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setNewStaffEmail('');
    setNewStaffRole('CUTTING_MASTER');
    setAddStaffError(null);
    setIsAddModalOpen(true);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newStaffEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAddStaffError('Please enter a valid email address.');
      return;
    }

    setAddingStaff(true);
    setAddStaffError(null);

    try {
      const shopId = shop.id || mockShop.id;
      const createdMember = await staffDb.addStaff(shopId, cleanEmail, newStaffRole);
      
      setStaffMembers((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === createdMember.id || m.user_id === createdMember.user_id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = createdMember;
          return updated;
        }
        return [...prev, createdMember];
      });

      setIsAddModalOpen(false);
      setNotification({
        message: `Successfully assigned ${ROLE_METADATA[newStaffRole]?.label || newStaffRole} role to ${cleanEmail}!`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to add staff member:', err);
      setAddStaffError(err instanceof Error ? err.message : 'Failed to add staff member. Please try again.');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToDelete) return;
    setDeletingStaff(true);

    try {
      const shopId = shop.id || mockShop.id;
      await staffDb.removeStaff(shopId, memberToDelete.id);

      setStaffMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setNotification({
        message: `Removed staff member ${memberToDelete.email || memberToDelete.name || ''} from workshop.`,
        type: 'success',
      });
      setMemberToDelete(null);
    } catch (err) {
      console.error('Failed to remove staff member:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to remove staff member.',
        type: 'error',
      });
    } finally {
      setDeletingStaff(false);
    }
  };

  // Filtered staff list
  const filteredStaff = React.useMemo(() => {
    return staffMembers.filter((m) => {
      const matchesSearch =
        staffSearchQuery.trim() === '' ||
        (m.name && m.name.toLowerCase().includes(staffSearchQuery.toLowerCase())) ||
        (m.email && m.email.toLowerCase().includes(staffSearchQuery.toLowerCase())) ||
        m.role.toLowerCase().includes(staffSearchQuery.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [staffMembers, staffSearchQuery, roleFilter]);

  // Aggregate counts
  const totalCount = staffMembers.length;
  const cutterCount = staffMembers.filter((m) => m.role === 'CUTTING_MASTER').length;
  const stitcherCount = staffMembers.filter((m) => m.role === 'STITCHER').length;
  const supportCount = staffMembers.filter(
    (m) => m.role === 'PRESSMAN' || m.role === 'COUNTER_CLERK' || m.role === 'MANAGER' || m.role === 'STAFF'
  ).length;

  return (
    <AppShell activeRoute="/settings">
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* Top Header & Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-white">
                  Workshop Settings
                </h1>
                <p className="font-urdu-serif text-sm text-gold/80 -mt-0.5" dir="rtl">
                  ورکشاپ پروفائل اور عملہ کی ترتیبات
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Configure workshop identity, manage master cutters and stitchers, configure rates, and thermal hardware.
            </p>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-2">
            <Badge variant="status-booked" className="gap-1.5 py-1 px-3">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              <span>Multi-Tenant RLS Active</span>
            </Badge>
          </div>
        </div>

        {/* Notification Toast Alert */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-gold/10 border-gold/30 text-gold'
            }`}
            role="alert"
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              )}
              <span className="text-xs sm:text-sm font-medium">{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Workshop Profile</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(ورکشاپ پروفائل)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Staff & Roles</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(کاریگر اور عملہ)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
              {staffMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Scissors className="h-4 w-4" />
            <span>Catalog & Rates</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(ریٹ لسٹ)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
              {garmentRates.filter((r) => r.is_active).length}/{garmentRates.length || 6}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('printer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'printer'
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>Thermal Printer</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(پرنٹر)</span>
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
              Phase C.4
            </span>
          </button>
        </div>

        {/* Tab 1: Workshop Profile */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Columns: Form Controls */}
            <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-6">
              {/* Section 1: General Identity */}
              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Store className="h-4 w-4 text-gold" />
                    <span>Workshop Identity</span>
                    <span className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                      دکان اور برانڈ کی شناخت
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Primary legal name and trade title displayed on customer receipts and khata reminders.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                      <span>Workshop / Shop Name</span>
                      <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                        دکان / ورکشاپ کا نام
                      </span>
                    </label>
                    <Input
                      type="text"
                      value={shop.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="e.g. Silaye Master Tailors & Fabrics"
                      required
                      className="bg-black/30 border-white/10 focus:border-gold text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                        <span>Primary Phone</span>
                        <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                          بنیادی فون نمبر
                        </span>
                      </label>
                      <Input
                        type="text"
                        value={shop.phone || shop.owner_phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        placeholder="0300-1234567"
                        leftIcon={<Phone className="h-3.5 w-3.5 text-gray-400" />}
                        error={phoneError || undefined}
                        className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                        <span>Secondary / Counter Phone</span>
                        <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                          کاؤنٹر فون نمبر
                        </span>
                      </label>
                      <Input
                        type="text"
                        value={shop.secondary_phone || ''}
                        onChange={(e) => handleFieldChange('secondary_phone', e.target.value)}
                        placeholder="0312-7654321"
                        leftIcon={<Phone className="h-3.5 w-3.5 text-gray-400" />}
                        className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Physical Location & Tax NTN */}
              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gold" />
                    <span>Location & Tax NTN</span>
                    <span className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                      پتہ اور ٹیکس نمبر
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Workshop physical address and National Tax Number printed on invoices.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                      <span>Physical Address</span>
                      <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                        ورکشاپ کا پتہ
                      </span>
                    </label>
                    <Input
                      type="text"
                      value={shop.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      placeholder="Shop #14, Main Bazaar, Near Aslam Market"
                      leftIcon={<MapPin className="h-3.5 w-3.5 text-gray-400" />}
                      className="bg-black/30 border-white/10 focus:border-gold text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                        <span>City</span>
                        <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                          شہر
                        </span>
                      </label>
                      <Input
                        type="text"
                        value={shop.city || 'Wah Cantt'}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        placeholder="Wah Cantt"
                        className="bg-black/30 border-white/10 focus:border-gold text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                        <span>Tax / NTN Number</span>
                        <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                          این ٹی این نمبر
                        </span>
                      </label>
                      <Input
                        type="text"
                        value={shop.ntn_number || ''}
                        onChange={(e) => handleFieldChange('ntn_number', e.target.value)}
                        placeholder="e.g. 1234567-8"
                        leftIcon={<FileText className="h-3.5 w-3.5 text-gray-400" />}
                        className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 3: Receipt Branding & Customer Messages */}
              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-gold" />
                    <span>Receipt Header & Footer Branding</span>
                    <span className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                      رسید ہیڈر اور فوٹر
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Custom text lines automatically embedded at top and bottom of thermal slips and WhatsApp booking messages.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                      <span>Receipt Header Note</span>
                      <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                        رسید کے اوپر کا پیغام
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      value={shop.receipt_header || ''}
                      onChange={(e) => handleFieldChange('receipt_header', e.target.value)}
                      placeholder="سِلائی ماسٹر ٹیلرز اینڈ فیبرکس - واہ کینٹ&#10;ماہر سلائی برائے مردانہ شلوار قمیض و واسکٹ"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-gray-600 focus:border-gold focus:outline-none transition-colors leading-relaxed font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                      <span>Receipt Footer Note & Policy</span>
                      <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                        رسید کے نیچے کا پیغام و شرائط
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      value={shop.receipt_footer || ''}
                      onChange={(e) => handleFieldChange('receipt_footer', e.target.value)}
                      placeholder="شکریہ! مال کی واپسی یا تبدیلی 7 یوم کے اندر ممکن ہے۔&#10;Thank you for your business / آپ کے اعتماد کا شکریہ"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-gray-600 focus:border-gold focus:outline-none transition-colors leading-relaxed font-sans"
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-[11px] text-gray-400">
                    Changes take effect immediately across all booking slips and WhatsApp dispatches.
                  </span>
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={saving}
                    disabled={saving}
                    className="bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)] gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Workshop Settings</span>
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {/* Right 5 Columns: Live Interactive Receipt Preview Card */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-gold" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Live Receipt Preview
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-gold border-gold/30 bg-gold/5">
                  Thermal Slip (80mm)
                </Badge>
              </div>

              {/* Thermal Ticket Simulation Card */}
              <div className="rounded-2xl border border-white/10 bg-[#121316] p-6 shadow-2xl space-y-4 relative overflow-hidden">
                {/* Subtle top thermal notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-black/60 rounded-b-md" />

                {/* Receipt Header Branding */}
                <div className="text-center space-y-1.5 pt-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold mb-1">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <h3 className="font-editorial text-lg font-bold text-white tracking-tight">
                    {shop.name || 'Silaye Master Tailors'}
                  </h3>

                  {shop.receipt_header ? (
                    <p className="text-[11px] text-gray-300 whitespace-pre-line leading-relaxed">
                      {shop.receipt_header}
                    </p>
                  ) : (
                    <p className="font-urdu-serif text-xs text-gold/80" dir="rtl">
                      سِلائی ماسٹر ٹیلرز اینڈ فیبرکس
                    </p>
                  )}

                  <div className="text-[11px] text-gray-400 space-y-0.5 pt-1">
                    {shop.address && <p>{shop.address}</p>}
                    <p>
                      {shop.city || 'Wah Cantt'} | Ph: {shop.phone || shop.owner_phone || '0300-5551234'}
                    </p>
                    {shop.secondary_phone && <p>Counter Ph: {shop.secondary_phone}</p>}
                    {shop.ntn_number && <p className="font-mono text-[10px]">NTN: {shop.ntn_number}</p>}
                  </div>
                </div>

                {/* Dotted separator */}
                <div className="border-t border-dashed border-white/20 my-3" />

                {/* Sample Invoice Metadata */}
                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Receipt No:</span>
                    <span className="font-mono text-white font-medium">#ORD-2026-0842</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-300">28-Aug-2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <span className="text-white font-medium">Chaudhry Tariq Mehmood</span>
                  </div>
                </div>

                {/* Dotted separator */}
                <div className="border-t border-dashed border-white/20 my-3" />

                {/* Sample Order Item */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-medium text-white">
                    <span>1x Men Shalwar Kameez (Ban Collar)</span>
                    <span>Rs. 1,800</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-[11px]">
                    <span>Fabric: In-Stock Boski Giza Cotton</span>
                    <span>Rs. 2,200</span>
                  </div>

                  <div className="border-t border-white/10 pt-2 space-y-1">
                    <div className="flex justify-between text-gray-300 font-semibold">
                      <span>Total Amount:</span>
                      <span>Rs. 4,000</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Advance Received:</span>
                      <span>Rs. 2,000</span>
                    </div>
                    <div className="flex justify-between text-gold font-bold">
                      <span>Balance Due on Delivery:</span>
                      <span>Rs. 2,000</span>
                    </div>
                  </div>
                </div>

                {/* Dotted separator */}
                <div className="border-t border-dashed border-white/20 my-3" />

                {/* Custom Receipt Footer Branding */}
                <div className="text-center space-y-1 text-[11px] text-gray-400">
                  <p className="whitespace-pre-line leading-relaxed">
                    {shop.receipt_footer ||
                      'Thank you for your business / آپ کے اعتماد کا شکریہ\nمال کی واپسی یا تبدیلی 7 یوم کے اندر ممکن ہے۔'}
                  </p>
                  <p className="text-[10px] text-gray-500 pt-1 font-mono">
                    Powered by Silaye Master Workshop OS
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Staff & Roles Management */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Top Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Total Workshop Staff</p>
                    <p className="text-2xl font-bold font-mono text-white mt-1">
                      <bdi dir="ltr">{totalCount}</bdi>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-gold/80 font-urdu-sans mt-2" dir="rtl">
                  کل کاریگر و ورکشاپ عملہ
                </p>
              </Card>

              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Cutting Masters</p>
                    <p className="text-2xl font-bold font-mono text-amber-300 mt-1">
                      <bdi dir="ltr">{cutterCount}</bdi>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Scissors className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-amber-300/80 font-urdu-sans mt-2" dir="rtl">
                  ماسٹر کٹر / کٹائی ماسٹر
                </p>
              </Card>

              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Stitchers / Tailors</p>
                    <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                      <bdi dir="ltr">{stitcherCount}</bdi>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-cyan-300/80 font-urdu-sans mt-2" dir="rtl">
                  درزی / سلائی کاریگر
                </p>
              </Card>

              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Counter & Support</p>
                    <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">
                      <bdi dir="ltr">{supportCount}</bdi>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <Store className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-emerald-300/80 font-urdu-sans mt-2" dir="rtl">
                  کاؤنٹر کلرک و پریس مین
                </p>
              </Card>
            </div>

            {/* Action Bar & Filter Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B0C0E]/50 p-4 rounded-2xl border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                  <Input
                    type="text"
                    placeholder="Search by name, email, role..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-3.5 w-3.5 text-gray-400" />}
                    className="bg-black/30 border-white/10 text-xs text-white"
                  />
                  {staffSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStaffSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Role Filter Selector */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-gray-200 focus:border-gold focus:outline-none"
                >
                  <option value="ALL">All Roles (تمام عہدے)</option>
                  <option value="OWNER">Owner (مالک)</option>
                  <option value="CUTTING_MASTER">Cutting Master (ماسٹر کٹر)</option>
                  <option value="STITCHER">Stitcher (درزی)</option>
                  <option value="PRESSMAN">Pressman (استری والا)</option>
                  <option value="COUNTER_CLERK">Counter Clerk (کاؤنٹر کلرک)</option>
                  <option value="MANAGER">Manager (منیجر)</option>
                </select>
              </div>

              {/* Add Staff CTA */}
              <Button
                type="button"
                onClick={handleOpenAddModal}
                className="bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)] gap-2 whitespace-nowrap cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Staff Member</span>
                <span className="font-urdu-sans text-xs opacity-80">(نیا کاریگر)</span>
              </Button>
            </div>

            {/* Staff Directory List */}
            <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-gold" />
                    <span>Workshop Staff Directory</span>
                    <span className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                      کاریگروں کی فہرست اور تفویض کردہ رول
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Active team members and assigned dashboard privileges for workshop operations.
                  </CardDescription>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadStaff(shop.id || mockShop.id)}
                  disabled={staffLoading}
                  className="text-gray-400 hover:text-white gap-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${staffLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                {staffLoading && staffMembers.length === 0 ? (
                  /* Loading Skeletons */
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white/10" />
                          <div className="space-y-1.5">
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="h-3 w-48 bg-white/5 rounded" />
                          </div>
                        </div>
                        <div className="h-7 w-24 bg-white/10 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredStaff.length === 0 ? (
                  /* Empty state */
                  <div className="p-12 text-center space-y-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-400 mx-auto">
                      <Users className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-gray-300 font-medium">No staff members found matching criteria.</p>
                    <p className="text-xs text-gray-500">
                      Try clearing your search query or add a new craftsman to your workshop.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAddModal}
                      className="border-white/10 text-gold text-xs mt-2"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Add Craftsman
                    </Button>
                  </div>
                ) : (
                  /* Staff Directory Table / Grid */
                  <div className="divide-y divide-white/5">
                    {filteredStaff.map((member) => {
                      const meta = ROLE_METADATA[member.role] || ROLE_METADATA.STAFF;
                      const RoleIcon = meta.icon;
                      const isOwner = member.role === 'OWNER';
                      const isSelf = member.user_id === currentUserId;

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-colors gap-4"
                        >
                          {/* Member Info */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-gray-200 font-bold font-mono text-sm shadow-inner">
                                {member.name
                                  ? member.name.substring(0, 2).toUpperCase()
                                  : (member.email || 'SM').substring(0, 2).toUpperCase()}
                              </div>
                              {isOwner && (
                                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[#0B0C0E] shadow-sm">
                                  <Crown className="h-2.5 w-2.5" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold text-white truncate">
                                  {member.name || member.email?.split('@')[0] || 'Workshop Member'}
                                </h4>
                                {isSelf && (
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                                <Mail className="h-3 w-3 text-gray-500" />
                                <span>{member.email || 'Email managed via authentication'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Role Badge & Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            {/* Role Badge with Urdu subtitle */}
                            <div className="text-right">
                              <div
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border ${meta.badgeClass}`}
                              >
                                <RoleIcon className="h-3.5 w-3.5" />
                                <span>{meta.label}</span>
                              </div>
                              <p className="font-urdu-sans text-[11px] text-gray-400 mt-0.5" dir="rtl">
                                {meta.urLabel}
                              </p>
                            </div>

                            {/* Remove Button */}
                            {isOwner ? (
                              <div className="relative group">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  className="text-gray-600 opacity-40 cursor-not-allowed h-9 w-9 p-0"
                                >
                                  <Crown className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMemberToDelete(member)}
                                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-9 w-9 p-0 rounded-xl cursor-pointer"
                                title="Remove staff member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-gray-400">
                <span>
                  Showing <bdi dir="ltr">{filteredStaff.length}</bdi> of <bdi dir="ltr">{staffMembers.length}</bdi> staff members
                </span>
                <span className="font-urdu-sans text-[11px] text-gold/70" dir="rtl">
                  تمام کاریگر کٹائی اور سلائی آرڈرز تفویض کے لیے دستیاب ہیں۔
                </span>
              </CardFooter>
            </Card>

            {/* Informational Guidance Banner */}
            <div className="p-4 rounded-2xl border border-white/5 bg-black/40 flex items-start gap-3 text-xs text-gray-400">
              <ShieldCheck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-gray-300">
                  Craftsman Role & Privilege Synchronization
                </p>
                <p>
                  Assigned <strong>Cutting Masters</strong> (*ماسٹر کٹر*) and <strong>Stitchers</strong> (*درزی*) will dynamically appear inside the craftsman dropdown selectors during <strong>New Booking</strong> (<code className="text-gold font-mono text-[11px]">/orders/new</code>) and order status audit flows.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Garment Catalog & Rates Management */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Top Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Active Garment Types</p>
                    <p className="text-2xl font-bold font-mono text-white mt-1">
                      <bdi dir="ltr">{garmentRates.filter((r) => r.is_active).length}</bdi> / 6
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                    <Scissors className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-gold/80 font-urdu-sans mt-2" dir="rtl">
                  فعال سلائی کیٹیگریز
                </p>
              </Card>

              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Average Stitching Rate</p>
                    <p className="text-2xl font-bold font-mono text-amber-300 mt-1">
                      Rs. <bdi dir="ltr">
                        {garmentRates.filter((r) => r.is_active).length > 0
                          ? Math.round(
                              garmentRates
                                .filter((r) => r.is_active)
                                .reduce((sum, r) => sum + r.base_stitching_rate, 0) /
                                garmentRates.filter((r) => r.is_active).length
                            ).toLocaleString()
                          : '0'}
                      </bdi>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-amber-300/80 font-urdu-sans mt-2" dir="rtl">
                  اوسط سلائی اجرت (روپے)
                </p>
              </Card>

              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Fastest Urgent Rush</p>
                    <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                      <bdi dir="ltr">
                        {garmentRates.filter((r) => r.is_active).length > 0
                          ? Math.min(...garmentRates.filter((r) => r.is_active).map((r) => r.urgent_delivery_days))
                          : 3}
                      </bdi>{' '}
                      <span className="text-xs font-normal text-gray-400">Days</span>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-cyan-300/80 font-urdu-sans mt-2" dir="rtl">
                  تیز ترین ارجنٹ ڈیلیوری
                </p>
              </Card>

              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Standard Delivery</p>
                    <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">
                      7 - 12 <span className="text-xs font-normal text-gray-400">Days</span>
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[11px] text-emerald-300/80 font-urdu-sans mt-2" dir="rtl">
                  معمول کا ڈیلیوری ٹائم
                </p>
              </Card>
            </div>

            {/* Action Bar & Controls Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B0C0E]/50 p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Garment Rate Matrix & Lead Times</span>
                  <span className="font-urdu-serif text-xs text-gold/80" dir="rtl">
                    (سلائی ریٹ لسٹ اور ڈیلیوری شیڈول)
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Set baseline stitching fees, urgent rush surcharges, and turnaround timelines auto-filled during booking.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetRates}
                  disabled={resettingRates || savingRates}
                  className="border-white/10 hover:bg-white/5 text-gray-300 text-xs gap-1.5 cursor-pointer"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${resettingRates ? 'animate-spin' : ''}`} />
                  <span>Restore Market Defaults</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveRates}
                  isLoading={savingRates}
                  disabled={savingRates || resettingRates}
                  className="bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)] text-xs gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Rate Matrix</span>
                </Button>
              </div>
            </div>

            {/* Garment Rate Cards Grid (6 Garment Types) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {garmentRates.map((rate) => {
                const meta = GARMENT_METADATA[rate.garment_type] || {
                  title: rate.garment_type,
                  urTitle: 'سلائی کیٹیگری',
                  description: 'Garment category configuration',
                  icon: Scissors,
                  accentColor: 'border-gold/40 bg-gold/10 text-gold',
                };
                const IconComp = meta.icon;
                const totalUrgentRate = rate.base_stitching_rate + rate.urgent_surcharge;

                return (
                  <Card
                    key={rate.garment_type}
                    className={`border transition-all backdrop-blur-xl ${
                      rate.is_active
                        ? 'border-white/10 bg-[#0B0C0E]/80 shadow-lg'
                        : 'border-white/5 bg-[#0B0C0E]/40 opacity-70'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.accentColor}`}
                          >
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm sm:text-base text-white font-medium">
                              {meta.title}
                            </CardTitle>
                            <p className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                              {meta.urTitle}
                            </p>
                          </div>
                        </div>

                        {/* Active / Inactive Switch Pill */}
                        <button
                          type="button"
                          onClick={() => handleRateFieldChange(rate.garment_type, 'is_active', !rate.is_active)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                            rate.is_active
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                              : 'border-gray-600/40 bg-gray-600/15 text-gray-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              rate.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                            }`}
                          />
                          <span>{rate.is_active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </div>
                      <CardDescription className="text-xs text-gray-400 pt-1 line-clamp-1">
                        {meta.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-1">
                      {/* Base Stitching Rate (PKR) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                          <span>Base Stitching Rate (PKR)</span>
                          <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                            بنیادی سلائی ریٹ
                          </span>
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={rate.base_stitching_rate}
                          onChange={(e) =>
                            handleRateFieldChange(
                              rate.garment_type,
                              'base_stitching_rate',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          disabled={!rate.is_active}
                          leftIcon={<span className="text-xs font-bold text-gold">Rs.</span>}
                          className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                        />
                      </div>

                      {/* Urgent Delivery Surcharge (PKR) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                          <span>Urgent Rush Surcharge (PKR)</span>
                          <span className="font-urdu-sans text-[11px] text-amber-300/80" dir="rtl">
                            ارجنٹ سلائی چارجز
                          </span>
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={rate.urgent_surcharge}
                          onChange={(e) =>
                            handleRateFieldChange(
                              rate.garment_type,
                              'urgent_surcharge',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          disabled={!rate.is_active}
                          leftIcon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
                          className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                        />
                      </div>

                      {/* Delivery Days (Standard & Urgent) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-gray-300 flex items-center justify-between">
                            <span>Standard Days</span>
                            <span className="font-urdu-sans text-[10px] text-gray-400" dir="rtl">
                              معمول کے دن
                            </span>
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            value={rate.standard_delivery_days}
                            onChange={(e) =>
                              handleRateFieldChange(
                                rate.garment_type,
                                'standard_delivery_days',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            disabled={!rate.is_active}
                            leftIcon={<Clock className="h-3.5 w-3.5 text-gray-400" />}
                            className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-gray-300 flex items-center justify-between">
                            <span>Urgent Days</span>
                            <span className="font-urdu-sans text-[10px] text-cyan-400/80" dir="rtl">
                              ارجنٹ دن
                            </span>
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={rate.standard_delivery_days}
                            value={rate.urgent_delivery_days}
                            onChange={(e) =>
                              handleRateFieldChange(
                                rate.garment_type,
                                'urgent_delivery_days',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            disabled={!rate.is_active}
                            leftIcon={<Zap className="h-3.5 w-3.5 text-cyan-400" />}
                            className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Live Calculation Preview Banner */}
                      <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-gray-300">
                          <span className="flex items-center gap-1.5 text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>Standard ({rate.standard_delivery_days}d):</span>
                          </span>
                          <span className="font-mono font-medium text-white">
                            Rs. <bdi dir="ltr">{rate.base_stitching_rate.toLocaleString()}</bdi>
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-cyan-300">
                          <span className="flex items-center gap-1.5 text-cyan-400">
                            <Zap className="h-3 w-3" />
                            <span>Urgent Rush ({rate.urgent_delivery_days}d):</span>
                          </span>
                          <span className="font-mono font-bold text-cyan-300">
                            Rs. <bdi dir="ltr">{totalUrgentRate.toLocaleString()}</bdi>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Informational Guidance Banner */}
            <div className="p-4 rounded-2xl border border-white/5 bg-black/40 flex items-start gap-3 text-xs text-gray-400">
              <ShieldCheck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-gray-300">
                  Automatic Dynamic Order Booking Pricing
                </p>
                <p>
                  When counter clerks book a customer order on <strong>New Booking</strong> (<code className="text-gold font-mono text-[11px]">/orders/new</code>), choosing a garment type automatically pre-fills the standard labor stitching fee and calculates the promised delivery date. Toggling the <strong>Urgent Rush Order</strong> switch instantly applies the surcharge and compresses delivery to the urgent timeline.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Thermal Printer Placeholder (Phase C.4) */}
        {activeTab === 'printer' && (
          <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-8 text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold mx-auto">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Thermal Printer & Hardware Preferences</h2>
              <p className="font-urdu-serif text-sm text-gold/80 mt-0.5" dir="rtl">
                تھرمل پرنٹر اور ہارڈویئر کنکشن (فیز C.4)
              </p>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
              Configure ESC/POS thermal printer roll dimensions (58mm fabric staple tags vs 80mm customer invoice), auto-cut line feeds, and barcode token preferences. Coming in Phase C.4.
            </p>
            <Button
              variant="outline"
              onClick={() => setActiveTab('profile')}
              className="border-white/10 hover:bg-white/5 text-gray-300 text-xs"
            >
              Return to Workshop Profile
            </Button>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Add Staff Member Modal Dialog                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#121316] p-6 shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-editorial text-lg font-bold text-white tracking-tight">
                    Add Workshop Craftsman
                  </h3>
                  <p className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                    ورکشاپ میں نیا کاریگر یا عملہ شامل کریں
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white rounded-lg p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddStaff} className="space-y-4">
              {addStaffError && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{addStaffError}</span>
                </div>
              )}

              {/* Craftsman Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                  <span>Craftsman User Email</span>
                  <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                    کاریگر کی ای میل
                  </span>
                </label>
                <Input
                  type="email"
                  placeholder="e.g. craftsman@silaye.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  required
                  autoFocus
                  leftIcon={<Mail className="h-3.5 w-3.5 text-gray-400" />}
                  className="bg-black/30 border-white/10 focus:border-gold text-white font-mono text-xs"
                />
                <p className="text-[11px] text-gray-400">
                  The craftsman must have a Silaye login or register with this email.
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                  <span>Workshop Role & Responsibilities</span>
                  <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                    ورکشاپ کا عہدہ و ذمہ داری
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {ASSIGNABLE_ROLES.map(({ role, title, urTitle }) => {
                    const meta = ROLE_METADATA[role];
                    const RoleIcon = meta.icon;
                    const isSelected = newStaffRole === role;

                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setNewStaffRole(role)}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-gold/60 bg-gold/10 text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                            : 'border-white/5 bg-black/20 text-gray-400 hover:border-white/15 hover:text-gray-200'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                            isSelected
                              ? 'border-gold/40 bg-gold/20 text-gold'
                              : 'border-white/10 bg-white/5 text-gray-400'
                          }`}
                        >
                          <RoleIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{title}</span>
                          </div>
                          <span className="font-urdu-sans text-[11px] text-gold/80 block" dir="rtl">
                            {urTitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addingStaff}
                  className="border-white/10 hover:bg-white/5 text-gray-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  isLoading={addingStaff}
                  disabled={addingStaff || !newStaffEmail.trim()}
                  className="bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)] text-xs gap-2"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Assign Role</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Remove Staff Member Confirmation Dialog                                 */}
      {/* ========================================================================= */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/20 bg-[#121316] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-editorial text-lg font-bold text-white tracking-tight">
                  Remove Craftsman
                </h3>
                <p className="font-urdu-serif text-xs text-rose-400/80 -mt-0.5" dir="rtl">
                  ورکشاپ سے کاریگر کو ہٹائیں
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to remove{' '}
              <strong className="text-white font-semibold">
                {memberToDelete.name || memberToDelete.email || 'this craftsman'}
              </strong>{' '}
              ({ROLE_METADATA[memberToDelete.role]?.label || memberToDelete.role}) from this workshop?
              They will lose access to orders and assignment flows.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberToDelete(null)}
                disabled={deletingStaff}
                className="border-white/10 hover:bg-white/5 text-gray-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmRemove}
                isLoading={deletingStaff}
                disabled={deletingStaff}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Staff</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
