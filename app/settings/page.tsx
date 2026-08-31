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
  Sliders,
  QrCode,
  Minus,
  Plus,
  Download,
  Eye,
  CreditCard,
  Layers,
  ArrowRight,
  Copy,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Hourglass,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getNavLayoutPreference,
  setNavLayoutPreference,
  type NavLayoutPreference,
  NAV_LAYOUT_CHANGED_EVENT,
} from '@/lib/nav-preferences';
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type WorkshopNotificationPrefs,
  NOTIFICATION_PREFS_CHANGED_EVENT,
} from '@/lib/notification-preferences';
import { sendTestNotification } from '@/lib/notifications';
import {
  shopsDb,
  staffDb,
  ratesDb,
  printerDb,
  subscriptionDb,
  manualPaymentsDb,
  purgeLocalCache,
  DEFAULT_PRINTER_SETTINGS,
} from '@/lib/db';
import { mockShop, mockOrders, mockCustomers } from '@/lib/mock-data';
import type {
  Shop,
  ShopMember,
  ShopMemberRole,
  GarmentRate,
  GarmentType,
  PrinterSettings,
  PrinterPaperWidth,
  PlanTier,
  BillingCycle,
  SubscriptionStatus,
  ShopUsage,
  ManualPaymentRequest,
  PaymentMethod,
  PaymentRequestStatus,
} from '@/types/tailor';
import { isValidPakistaniPhone } from '@/lib/whatsapp';
import { getCurrentUser, isSupabaseConfigured } from '@/lib/supabase/client';
import { ThermalSlipModal } from '@/components/tailor/thermal-slip-modal';
import { BarcodeRenderer } from '@/components/tailor/barcode-renderer';
import {
  formatCurrency,
  formatInch,
  formatDateDisplay,
  formatTimeDisplay,
  downloadEscPosBinaryFile,
  buildFabricTagBinary,
  buildCustomerInvoiceBinary,
} from '@/lib/escpos';

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

interface PricingPlanMeta {
  tier: PlanTier;
  title: string;
  urTitle: string;
  tagline: string;
  monthlyPKR: number;
  annualMonthlyPKR: number;
  highlight: boolean;
  badge?: string;
  badgeUr?: string;
  features: string[];
  maxOrdersPerMonth: number | 'unlimited';
}

const PRICING_PLANS: PricingPlanMeta[] = [
  {
    tier: 'FREE',
    title: 'Solo Master',
    urTitle: 'سولو ماسٹر (بنیادی)',
    tagline: 'For independent single-counter masters & small shops',
    monthlyPKR: 0,
    annualMonthlyPKR: 0,
    highlight: false,
    maxOrdersPerMonth: 50,
    features: [
      '50 Suits per Month Quota',
      '1 Counter Booking Terminal',
      'Standard Measurement Vault',
      '1-Click WhatsApp Receipts',
      'Offline IndexedDB Synchronization',
    ],
  },
  {
    tier: 'PRO',
    title: 'Multi-Counter Workshop',
    urTitle: 'ورکشاپ پلان (پیشہ ورانہ)',
    tagline: 'For busy workshops & high-volume master craftsmen',
    monthlyPKR: 2800,
    annualMonthlyPKR: 2240,
    highlight: true,
    badge: 'MOST POPULAR',
    badgeUr: 'سب سے مقبول',
    maxOrdersPerMonth: 'unlimited',
    features: [
      'Unlimited Suits & Orders Every Month',
      'Up to 5 Craftsmen Roles & Assignments',
      '58mm & 80mm ESC/POS Thermal Printing',
      'Custom Garment Catalog & Surcharges',
      'SMS & 1-Click WhatsApp Ready Alerts',
      'Slide-Out Order Inspector Drawer',
    ],
  },
  {
    tier: 'ENTERPRISE',
    title: 'Enterprise Tailor House',
    urTitle: 'حویلی / انٹرپرائز',
    tagline: 'For multi-branch luxury fashion houses & tailoring chains',
    monthlyPKR: 7000,
    annualMonthlyPKR: 5600,
    highlight: false,
    badge: 'MAX CAPACITY',
    badgeUr: 'لامحدود گنجائش',
    maxOrdersPerMonth: 'unlimited',
    features: [
      'Unlimited Everything (Suits & Branches)',
      'Multi-Branch Consolidated Dashboard',
      'Super Admin Telemetry & Audit Logs',
      'Priority 24/7 Phone & WhatsApp Support',
      'Custom Receipt Header & Footer Branding',
      'Dedicated Bespoke Tailoring Account Manager',
    ],
  },
];

export default function SettingsPage() {
  const [shop, setShop] = React.useState<Shop>(mockShop);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<'profile' | 'staff' | 'catalog' | 'printer' | 'billing'>('profile');
  const [notification, setNotification] = React.useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);

  // Navigation Layout Preference State
  const [navLayout, setNavLayout] = React.useState<NavLayoutPreference>('tabs');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setNavLayout(getNavLayoutPreference());
      const handleLayoutChange = () => {
        setNavLayout(getNavLayoutPreference());
      };
      window.addEventListener(NAV_LAYOUT_CHANGED_EVENT, handleLayoutChange);
      return () => {
        window.removeEventListener(NAV_LAYOUT_CHANGED_EVENT, handleLayoutChange);
      };
    }
  }, []);

  const handleNavLayoutChange = (newLayout: NavLayoutPreference) => {
    setNavLayout(newLayout);
    setNavLayoutPreference(newLayout);
    setNotification({
      message: 'نیویگیشن اسٹائل تبدیل کر دیا گیا ہے / Navigation layout updated successfully',
      type: 'success',
    });
  };

  // Workshop Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = React.useState<WorkshopNotificationPrefs>(() =>
    getNotificationPreferences()
  );
  const [sendingTestAlert, setSendingTestAlert] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotificationPrefs(getNotificationPreferences());
      const handlePrefsChange = () => {
        setNotificationPrefs(getNotificationPreferences());
      };
      window.addEventListener(NOTIFICATION_PREFS_CHANGED_EVENT, handlePrefsChange);
      return () => {
        window.removeEventListener(NOTIFICATION_PREFS_CHANGED_EVENT, handlePrefsChange);
      };
    }
  }, []);

  const handleToggleNotificationPref = (key: keyof WorkshopNotificationPrefs) => {
    const updated = setNotificationPreferences({
      [key]: !notificationPrefs[key],
    });
    setNotificationPrefs(updated);
    setNotification({
      message: 'نوٹیفیکیشن ترجیحات اپ ڈیٹ ہو گئیں / Notification preferences saved',
      type: 'success',
    });
  };

  const handleSendTestAlert = async () => {
    setSendingTestAlert(true);
    try {
      const delivered = await sendTestNotification();
      if (delivered) {
        setNotification({
          message: 'ٹیسٹ نوٹیفیکیشن بھیج دیا گیا ہے / Test alert sent successfully',
          type: 'success',
        });
      } else {
        setNotification({
          message: 'نوٹیفیکیشن کی اجازت درکار ہے / Please enable notification permissions in your browser or device settings',
          type: 'error',
        });
      }
    } catch {
      setNotification({
        message: 'ٹیسٹ الرٹ بھیجنے میں خرابی / Failed to dispatch test alert',
        type: 'error',
      });
    } finally {
      setSendingTestAlert(false);
    }
  };

  // Subscription & Billing State
  const [shopUsage, setShopUsage] = React.useState<ShopUsage>({
    id: 'su-mock-default',
    shop_id: mockShop.id,
    billing_month: new Date().toISOString().substring(0, 7) + '-01',
    orders_count: 14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [usageLoading, setUsageLoading] = React.useState<boolean>(false);
  const [isAnnual, setIsAnnual] = React.useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState<boolean>(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = React.useState<PlanTier | null>(null);
  const [upgrading, setUpgrading] = React.useState<boolean>(false);

  // Manual Pakistani Payment Verification State
  const [pendingPayment, setPendingPayment] = React.useState<ManualPaymentRequest | null>(null);
  const [pendingPaymentLoading, setPendingPaymentLoading] = React.useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = React.useState<string>('');
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = React.useState<string | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [isReceiptLightboxOpen, setIsReceiptLightboxOpen] = React.useState<boolean>(false);
  const [lightboxImageUrl, setLightboxImageUrl] = React.useState<string | null>(null);
  const [paymentFormError, setPaymentFormError] = React.useState<string | null>(null);

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

  // Thermal Printer & Hardware State
  const [printerSettings, setPrinterSettings] = React.useState<PrinterSettings>({
    id: 'ps-mock-default',
    shop_id: mockShop.id,
    ...DEFAULT_PRINTER_SETTINGS,
  });
  const [printerLoading, setPrinterLoading] = React.useState<boolean>(false);
  const [savingPrinter, setSavingPrinter] = React.useState<boolean>(false);
  const [resettingPrinter, setResettingPrinter] = React.useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = React.useState<boolean>(false);

  // Danger Zone & Workshop Reset State
  const [isResetModalOpen, setIsResetModalOpen] = React.useState<boolean>(false);
  const [resetConfirmInput, setResetConfirmInput] = React.useState<string>('');
  const [purgingWorkshop, setPurgingWorkshop] = React.useState<boolean>(false);
  const [flushingCache, setFlushingCache] = React.useState<boolean>(false);

  // Derived Subscription & Tier Limit Interceptors
  const isTrialExpired =
    shop.subscription_status === 'TRIALING' &&
    Boolean(shop.current_period_end && new Date(shop.current_period_end).getTime() < Date.now());
  const effectivePlanTier: PlanTier = isTrialExpired ? 'FREE' : (shop.plan_tier || 'FREE');
  const isStaffLimitReached = effectivePlanTier === 'FREE' && staffMembers.length >= 1;

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

  // Load thermal printer hardware preferences
  const loadPrinterSettings = React.useCallback(async (shopId: string) => {
    setPrinterLoading(true);
    try {
      const settings = await printerDb.getByShopId(shopId);
      setPrinterSettings(settings);
    } catch (err) {
      console.warn('Failed to load printer settings:', err);
    } finally {
      setPrinterLoading(false);
    }
  }, []);

  // Load monthly usage statistics
  // Load monthly usage statistics
  const loadUsage = React.useCallback(async (shopId: string) => {
    setUsageLoading(true);
    try {
      const usage = await subscriptionDb.getShopUsage(shopId);
      setShopUsage(usage);
    } catch (err) {
      console.warn('Failed to load shop usage:', err);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  // Load pending manual payment request
  const loadPendingPayment = React.useCallback(async (shopId: string) => {
    setPendingPaymentLoading(true);
    try {
      const pending = await manualPaymentsDb.getLatestPendingRequest(shopId);
      setPendingPayment(pending);
    } catch (err) {
      console.warn('Failed to load pending manual payment request:', err);
    } finally {
      setPendingPaymentLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const shopId = shop.id || mockShop.id;
    loadStaff(shopId);
    loadRates(shopId);
    loadPrinterSettings(shopId);
    loadUsage(shopId);
    loadPendingPayment(shopId);
  }, [shop.id, loadStaff, loadRates, loadPrinterSettings, loadUsage, loadPendingPayment]);

  // Safe Confetti Celebration Trigger
  const triggerCelebration = () => {
    if (typeof window !== 'undefined') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#E5C158', '#00E5FF', '#10B981', '#FFFFFF'],
        });
      } catch (err) {
        console.warn('Confetti execution failed:', err);
      }
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleOpenUpgradeModal = (tier: PlanTier) => {
    if (tier === 'FREE') {
      handleDowngradeToFree();
      return;
    }
    setSelectedUpgradeTier(tier);
    setPaymentMethod('BANK_TRANSFER');
    setTransactionRef('');
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setPaymentFormError(null);
    setIsUpgradeModalOpen(true);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPaymentFormError('Receipt image exceeds 5MB limit. Please select a smaller image.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPaymentFormError('Only image files (.png, .jpg, .jpeg, .webp) are supported.');
      return;
    }

    setPaymentFormError(null);
    setReceiptFile(file);

    if (typeof window !== 'undefined') {
      const preview = URL.createObjectURL(file);
      setReceiptPreviewUrl(preview);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    if (receiptPreviewUrl && receiptPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }
    setReceiptPreviewUrl(null);
  };

  const handleSubmitPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpgradeTier || selectedUpgradeTier === 'FREE') return;

    const cleanRef = transactionRef.trim();
    if (!cleanRef) {
      setPaymentFormError('Please enter the Transaction ID / Reference Number from your receipt.');
      return;
    }

    if (!receiptFile && !receiptPreviewUrl) {
      setPaymentFormError('Please upload a screenshot or photo of your payment slip / receipt.');
      return;
    }

    setUpgrading(true);
    setPaymentFormError(null);

    try {
      const shopId = shop.id || mockShop.id;
      const planMeta = PRICING_PLANS.find((p) => p.tier === selectedUpgradeTier);
      const amountPkr = isAnnual
        ? (planMeta?.annualMonthlyPKR || 0) * 12
        : planMeta?.monthlyPKR || 0;
      const cycle: BillingCycle = isAnnual ? 'ANNUAL' : 'MONTHLY';

      // 1. Upload receipt image
      let receiptUrl = receiptPreviewUrl || '';
      if (receiptFile) {
        receiptUrl = await manualPaymentsDb.uploadReceiptImage(receiptFile, shopId);
      }

      // 2. Create manual payment request in database
      const created = await manualPaymentsDb.createPaymentRequest({
        shop_id: shopId,
        plan_tier: selectedUpgradeTier as 'PRO' | 'ENTERPRISE',
        billing_cycle: cycle,
        amount_pkr: amountPkr,
        payment_method: paymentMethod,
        transaction_reference: cleanRef,
        receipt_image_url: receiptUrl,
      });

      setPendingPayment(created);

      // Trigger celebratory confetti
      triggerCelebration();

      setIsUpgradeModalOpen(false);
      setSelectedUpgradeTier(null);
      setReceiptFile(null);
      setReceiptPreviewUrl(null);

      setNotification({
        message: `🎉 Payment slip submitted for verification! Our finance desk will verify and activate your ${planMeta?.title || selectedUpgradeTier} subscription shortly.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to submit manual payment request:', err);
      setPaymentFormError(err instanceof Error ? err.message : 'Failed to submit payment request. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngradeToFree = async () => {
    setUpgrading(true);
    try {
      const shopId = shop.id || mockShop.id;
      const updated = await subscriptionDb.updateSubscription(shopId, {
        plan_tier: 'FREE',
        billing_cycle: 'MONTHLY',
        subscription_status: 'ACTIVE',
      });

      setShop((prev) => ({
        ...prev,
        ...updated,
        plan_tier: 'FREE',
        billing_cycle: 'MONTHLY',
        subscription_status: 'ACTIVE',
      }));

      setPendingPayment(null);

      setNotification({
        message: 'Workshop plan changed to Solo Master (Free).',
        type: 'info',
      });
    } catch (err) {
      console.error('Failed to downgrade plan:', err);
      setNotification({
        message: 'Failed to adjust plan. Please try again.',
        type: 'error',
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleFlushLocalCache = async () => {
    setFlushingCache(true);
    try {
      const result = await purgeLocalCache();
      setNotification({
        message: `Local cache successfully cleared (${result.clearedStores.join(', ')}). Active session preserved.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to flush local cache:', err);
      setNotification({
        message: 'Failed to flush local cache. Please check browser permissions.',
        type: 'error',
      });
    } finally {
      setFlushingCache(false);
    }
  };

  const handleOpenResetModal = () => {
    setResetConfirmInput('');
    setIsResetModalOpen(true);
  };

  const handleConfirmWorkshopReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'PURGE') {
      setNotification({
        message: 'Please type PURGE in all caps to confirm workshop data reset.',
        type: 'error',
      });
      return;
    }

    setPurgingWorkshop(true);
    try {
      const shopId = shop.id || mockShop.id;
      const result = await shopsDb.purgeShopTestData(shopId);
      await purgeLocalCache();

      // Refresh usage & staff
      await loadUsage(shopId);
      await loadStaff(shopId);

      setNotification({
        message: `Workshop data purged! Removed ${result.deleted_orders} orders, ${result.deleted_profiles} measurement profiles, and ${result.deleted_khata} khata records.`,
        type: 'success',
      });
      setIsResetModalOpen(false);
      setResetConfirmInput('');
    } catch (err) {
      console.error('Failed to reset workshop data:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to reset workshop data.',
        type: 'error',
      });
    } finally {
      setPurgingWorkshop(false);
    }
  };

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
      console.error('Failed to reset garment rates:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to reset garment rates.',
        type: 'error',
      });
    } finally {
      setResettingRates(false);
    }
  };

  const handlePaperWidthChange = (width: PrinterPaperWidth) => {
    setPrinterSettings((prev) => ({ ...prev, paper_width: width }));
  };

  const handleTogglePrinterSetting = (
    key: 'auto_print_on_booking' | 'show_barcode' | 'show_qr_tracking' | 'show_urdu_labels'
  ) => {
    setPrinterSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFeedLinesChange = (delta: number) => {
    setPrinterSettings((prev) => {
      const current = typeof prev.feed_lines === 'number' ? prev.feed_lines : 3;
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, feed_lines: next };
    });
  };

  const handleSavePrinterSettings = async () => {
    setSavingPrinter(true);
    try {
      const shopId = shop.id || mockShop.id;
      const updated = await printerDb.update(shopId, printerSettings);
      setPrinterSettings(updated);
      setNotification({
        message: 'Thermal printer hardware preferences saved successfully!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to save printer settings:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to save printer settings.',
        type: 'error',
      });
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleResetPrinterSettings = async () => {
    setResettingPrinter(true);
    try {
      const shopId = shop.id || mockShop.id;
      const defaults = await printerDb.resetDefaults(shopId);
      setPrinterSettings(defaults);
      setNotification({
        message: 'Restored standard 80mm thermal hardware defaults!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to reset printer settings:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to reset printer settings.',
        type: 'error',
      });
    } finally {
      setResettingPrinter(false);
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
      <div className="space-y-8 max-w-7xl mx-auto">
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
                ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>Thermal Printer</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(پرنٹر)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'billing'
                ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing & Subscriptions</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(بلنگ اور سبسکرپشن)</span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                shop.plan_tier === 'PRO'
                  ? 'border-gold/40 bg-gold/20 text-gold shadow-[0_0_8px_rgba(212,175,55,0.2)]'
                  : shop.plan_tier === 'ENTERPRISE'
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                  : 'border-slate-500/40 bg-slate-500/20 text-slate-300'
              }`}
            >
              {shop.plan_tier || 'FREE'}
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

              {/* Section 4: Navigation Layout Preference */}
              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-gold" />
                    <span>Navigation Layout</span>
                    <span className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                      نیویگیشن اسٹائل
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Choose your preferred mobile navigation interface. Changes apply immediately and persist across sessions.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Option 1: Modern Tabs */}
                  <div
                    onClick={() => handleNavLayoutChange('tabs')}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3',
                      navLayout === 'tabs'
                        ? 'border-gold/60 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-gold/40'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.02]'
                    )}
                    role="radio"
                    aria-checked={navLayout === 'tabs'}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleNavLayoutChange('tabs');
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                          navLayout === 'tabs'
                            ? 'border-gold bg-gold text-[#0B0C0E]'
                            : 'border-white/30 bg-black/40'
                        )}
                      >
                        {navLayout === 'tabs' && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            Modern Tabs + Action Button
                          </span>
                          <span className="font-urdu-sans text-xs text-gold" dir="rtl">
                            ماڈرن باٹم ٹیبز
                          </span>
                          <Badge variant="outline" className="text-[10px] text-gold border-gold/30 bg-gold/5 py-0 px-1.5">
                            Recommended / تجویز کردہ
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          4 Tabs + Center Gold FAB for 1-thumb use. Clean minimal top header without menu clutter.
                        </p>
                        <p className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                          4 باٹم ٹیبز اور درمیان میں گولڈ نیا سوٹ بٹن — ایک ہاتھ اور انگوٹھے سے تیز رفتار استعمال کے لیے۔
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Classic Drawer Only */}
                  <div
                    onClick={() => handleNavLayoutChange('drawer')}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3',
                      navLayout === 'drawer'
                        ? 'border-gold/60 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-gold/40'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.02]'
                    )}
                    role="radio"
                    aria-checked={navLayout === 'drawer'}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleNavLayoutChange('drawer');
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                          navLayout === 'drawer'
                            ? 'border-gold bg-gold text-[#0B0C0E]'
                            : 'border-white/30 bg-black/40'
                        )}
                      >
                        {navLayout === 'drawer' && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            Classic Drawer Only
                          </span>
                          <span className="font-urdu-sans text-xs text-gold" dir="rtl">
                            کلاسک ڈراور
                          </span>
                          <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/5 py-0 px-1.5">
                            Max Screen Space / بڑی سکرین
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Fullscreen view with top hamburger menu. Hides the bottom bar to maximize vertical space.
                        </p>
                        <p className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                          مکمل فل سکرین ویو اور اوپر ہیمبرگر مینو — باٹم بار چھپا کر ڈیٹا کے لیے زیادہ جگہ فراہم کرتا ہے۔
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option 3: Hybrid Master */}
                  <div
                    onClick={() => handleNavLayoutChange('hybrid')}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3',
                      navLayout === 'hybrid'
                        ? 'border-gold/60 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-gold/40'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.02]'
                    )}
                    role="radio"
                    aria-checked={navLayout === 'hybrid'}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleNavLayoutChange('hybrid');
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                          navLayout === 'hybrid'
                            ? 'border-gold bg-gold text-[#0B0C0E]'
                            : 'border-white/30 bg-black/40'
                        )}
                      >
                        {navLayout === 'hybrid' && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            Hybrid Master
                          </span>
                          <span className="font-urdu-sans text-xs text-gold" dir="rtl">
                            ہائبرڈ ماسٹر
                          </span>
                          <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/30 bg-amber-500/5 py-0 px-1.5">
                            Power User / ہمہ گیر
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Bottom tabs + Top hamburger drawer. Access quick counter shortcuts and full slide-out sidebar simultaneously.
                        </p>
                        <p className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                          باٹم ٹیبز اور اوپر ہیمبرگر ڈراور دونوں بیک وقت فعال — فوری بکنگ اور مکمل مینو دونوں دستیاب۔
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 5: Notifications & Due Alerts */}
              <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gold" />
                    <span>Notifications & Due Alerts</span>
                    <span className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                      نوٹیفیکیشنز اور الرٹس
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Automated daily delivery briefings, urgent in-production order alerts, and sound chimes.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Toggle 1: Morning Briefing */}
                  <div
                    onClick={() => handleToggleNotificationPref('morningBriefing')}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3',
                      notificationPrefs.morningBriefing
                        ? 'border-gold/50 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.02]'
                    )}
                    role="switch"
                    aria-checked={notificationPrefs.morningBriefing}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggleNotificationPref('morningBriefing');
                      }
                    }}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          Morning Delivery Briefing
                        </span>
                        <span className="font-urdu-sans text-xs text-gold" dir="rtl">
                          صبح 9:00 بجے ڈیلیوری الرٹ
                        </span>
                        <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/30 bg-amber-500/5 py-0 px-1.5">
                          9:00 AM Daily
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Automated morning briefing summarizing all garments scheduled for delivery today.
                      </p>
                      <p className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                        روزانہ صبح 9:00 بجے آج ڈیلیور ہونے والے تمام سوٹوں کی سمری اور الرٹ وصول کریں۔
                      </p>
                    </div>

                    {/* Switch Knob */}
                    <div
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1',
                        notificationPrefs.morningBriefing ? 'bg-gold' : 'bg-white/20'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0C0E] shadow ring-0 transition duration-200 ease-in-out',
                          notificationPrefs.morningBriefing ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </div>

                  {/* Toggle 2: Urgent Due Date Warnings */}
                  <div
                    onClick={() => handleToggleNotificationPref('urgentAlerts')}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3',
                      notificationPrefs.urgentAlerts
                        ? 'border-gold/50 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.02]'
                    )}
                    role="switch"
                    aria-checked={notificationPrefs.urgentAlerts}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggleNotificationPref('urgentAlerts');
                      }
                    }}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          Urgent Due Date Warnings
                        </span>
                        <span className="font-urdu-sans text-xs text-gold" dir="rtl">
                          24 گھنٹے پہلے فوری وارننگ
                        </span>
                        <Badge variant="outline" className="text-[10px] text-rose-300 border-rose-500/30 bg-rose-500/5 py-0 px-1.5">
                          &lt; 24h Warning
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        High-priority alerts when an in-production suit is due within 24 hours or overdue.
                      </p>
                      <p className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                        جب کوئی زیرِ تکمیل سوٹ 24 گھنٹے کے اندر ڈیلیور ہونا ہو یا تاخیر کا شکار ہو تو فوری وارننگ وصول کریں۔
                      </p>
                    </div>

                    {/* Switch Knob */}
                    <div
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1',
                        notificationPrefs.urgentAlerts ? 'bg-gold' : 'bg-white/20'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0C0E] shadow ring-0 transition duration-200 ease-in-out',
                          notificationPrefs.urgentAlerts ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </div>

                  {/* Toggle 3: Sound & Vibration */}
                  <div
                    onClick={() => handleToggleNotificationPref('soundEnabled')}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3',
                      notificationPrefs.soundEnabled
                        ? 'border-gold/50 bg-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.02]'
                    )}
                    role="switch"
                    aria-checked={notificationPrefs.soundEnabled}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggleNotificationPref('soundEnabled');
                      }
                    }}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          Sound & Vibration
                        </span>
                        <span className="font-urdu-sans text-xs text-gold" dir="rtl">
                          آواز اور وائبریشن
                        </span>
                        <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/5 py-0 px-1.5">
                          {notificationPrefs.soundEnabled ? 'Chime Active' : 'Muted'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Play workshop acoustic chime and trigger device vibration when alerts arrive.
                      </p>
                      <p className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                        الرٹس موصول ہونے پر مخصوص آواز اور وائبریشن بجائیں۔
                      </p>
                    </div>

                    {/* Switch Knob */}
                    <div
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1',
                        notificationPrefs.soundEnabled ? 'bg-gold' : 'bg-white/20'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0C0E] shadow ring-0 transition duration-200 ease-in-out',
                          notificationPrefs.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Bell className="h-3.5 w-3.5 text-gold" />
                    <span>Test your device's notification and audio alert permissions:</span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestAlert}
                    disabled={sendingTestAlert}
                    className="border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-semibold gap-2 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                  >
                    <Bell className={cn('h-3.5 w-3.5', sendingTestAlert && 'animate-bounce text-gold')} />
                    <span>{sendingTestAlert ? 'بھیجا جا رہا ہے...' : 'ٹیسٹ نوٹیفیکیشن بھیجیں / Send Test Alert'}</span>
                  </Button>
                </CardFooter>
              </Card>

              {/* Section 6: Danger Zone - Workshop Reset & Data Purification */}
              <Card className="border-rose-500/20 bg-[#0B0C0E]/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Workshop Reset & Data Purification</span>
                    <span className="font-urdu-serif text-xs text-rose-400/90 -mt-0.5" dir="rtl">
                      ورکشاپ ڈیٹا ری سیٹ اور صفائی
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Purge development test orders, measurements, and Khata transactions before launching production operations.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs text-gray-300 space-y-2">
                    <p className="font-medium text-rose-300">
                      Ready to go live with genuine customer orders?
                    </p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Purging test data will delete all dummy orders, customer profiles, and Khata financial entries while safely retaining your workshop identity, staff members, catalog rates, and printer hardware preferences.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFlushLocalCache}
                      disabled={flushingCache}
                      className="border-white/10 hover:bg-white/5 text-gray-300 text-xs gap-2"
                    >
                      <RotateCcw className={cn("h-3.5 w-3.5", flushingCache && "animate-spin text-gold")} />
                      <span>{flushingCache ? 'Flushing Cache...' : 'Flush Local Cache'}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenResetModal}
                      className="border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold gap-2 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span>Reset Workshop Data</span>
                    </Button>
                  </div>
                </CardContent>
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
                disabled={isStaffLimitReached}
                className={
                  isStaffLimitReached
                    ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed opacity-60 gap-2 whitespace-nowrap'
                    : 'bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.2)] gap-2 whitespace-nowrap cursor-pointer'
                }
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Staff Member</span>
                <span className="font-urdu-sans text-xs opacity-80">(نیا کاریگر)</span>
              </Button>
            </div>

            {/* Free Tier Staff Limit Gold Pro Upgrade Callout */}
            {isStaffLimitReached && (
              <div className="rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 via-amber-900/20 to-black/60 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-fade-in border-l-4 border-l-gold">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold border border-gold/40 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="border-gold/50 bg-gold/20 text-gold text-[10px] uppercase font-bold tracking-wider">
                        Pro Plan Feature
                      </Badge>
                      <span className="text-sm font-bold text-white">
                        Upgrade to Pro to add unlimited Cutting Masters &amp; Stitchers
                      </span>
                    </div>
                    <p className="font-urdu-sans text-xs text-gold/90 mt-1" dir="rtl">
                      مفت پلان پر صرف 1 کاریگر کی حد ہے۔ لامحدود ماسٹر کٹر اور درزی شامل کرنے کے لیے پرو ورکشاپ میں اپ گریڈ کریں۔
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className="shrink-0 bg-gradient-to-r from-gold to-amber-500 text-black font-bold text-xs hover:opacity-90 shadow-[0_0_20px_rgba(212,175,55,0.35)] gap-1.5 cursor-pointer"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Upgrade to Pro →</span>
                </Button>
              </div>
            )}

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
                      disabled={isStaffLimitReached}
                      className="border-white/10 text-gold text-xs mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Tab 4: Thermal Hardware & Printer Settings (Phase C.4) */}
        {activeTab === 'printer' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Quick Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-editorial text-xl font-bold text-white tracking-tight">
                      Thermal Hardware & Printer Settings
                    </h2>
                    <Badge className="border-gold/40 bg-gold/15 text-gold text-[10px] px-2 py-0.5">
                      {printerSettings.paper_width} Active
                    </Badge>
                  </div>
                  <p className="font-urdu-serif text-xs text-gold/80 mt-0.5" dir="rtl">
                    تھرمل پرنٹر، سلائی ٹیگ، بارکوڈ اور ہارڈویئر ترتیبات
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetPrinterSettings}
                  disabled={resettingPrinter || savingPrinter}
                  className="border-white/10 hover:bg-white/5 text-gray-300 text-xs gap-1.5"
                  title="Reset to 80mm default market hardware settings"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${resettingPrinter ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Reset Defaults</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTestModalOpen(true)}
                  className="border-gold/30 bg-gold/10 hover:bg-gold/20 text-gold text-xs gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Test Slip</span>
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSavePrinterSettings}
                  isLoading={savingPrinter}
                  disabled={savingPrinter}
                  className="bg-gold text-[#0B0C0E] hover:bg-gold-hover font-bold shadow-[0_0_20px_rgba(212,175,55,0.25)] text-xs gap-2"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Settings</span>
                </Button>
              </div>
            </div>

            {/* Main 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* ── Left Column: Hardware Controls & Form (7 cols) ────── */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Paper Width Selector Card */}
                <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-gold" />
                        <span>Default Roll Width</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Choose the default format for order slips and workshop tickets
                      </p>
                    </div>
                    <span className="font-urdu-sans text-xs text-gold/80" dir="rtl">
                      پرنٹر کاغذ کی چوڑائی
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 58mm Fabric Tag Option */}
                    <button
                      type="button"
                      onClick={() => handlePaperWidthChange('58mm')}
                      className={`flex flex-col p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        printerSettings.paper_width === '58mm'
                          ? 'border-gold/60 bg-gold/10 text-white shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-gold/40'
                          : 'border-white/5 bg-black/20 text-gray-400 hover:border-white/15 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                            printerSettings.paper_width === '58mm'
                              ? 'border-gold/40 bg-gold/20 text-gold'
                              : 'border-white/10 bg-white/5 text-gray-400'
                          }`}
                        >
                          <Tag className="h-4 w-4" />
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            printerSettings.paper_width === '58mm'
                              ? 'border-gold/50 text-gold bg-gold/10 text-[10px]'
                              : 'border-white/10 text-gray-400 text-[10px]'
                          }
                        >
                          58 mm • 32 Col
                        </Badge>
                      </div>
                      <div className="text-xs font-bold text-white">58mm Fabric Staple Tag</div>
                      <div className="font-urdu-sans text-[11px] text-gold/80 mt-0.5" dir="rtl">
                        چھوٹا ٹیگ - ۳۲ کالم برائے کٹنگ کاریگر
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                        Compact 2-inch mini roll tag with 3×3 measurement matrix for cloth pinning and workshop workflow.
                      </p>
                    </button>

                    {/* 80mm Customer Invoice Option */}
                    <button
                      type="button"
                      onClick={() => handlePaperWidthChange('80mm')}
                      className={`flex flex-col p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        printerSettings.paper_width === '80mm'
                          ? 'border-gold/60 bg-gold/10 text-white shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-gold/40'
                          : 'border-white/5 bg-black/20 text-gray-400 hover:border-white/15 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                            printerSettings.paper_width === '80mm'
                              ? 'border-gold/40 bg-gold/20 text-gold'
                              : 'border-white/10 bg-white/5 text-gray-400'
                          }`}
                        >
                          <Receipt className="h-4 w-4" />
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            printerSettings.paper_width === '80mm'
                              ? 'border-gold/50 text-gold bg-gold/10 text-[10px]'
                              : 'border-white/10 text-gray-400 text-[10px]'
                          }
                        >
                          80 mm • 48 Col
                        </Badge>
                      </div>
                      <div className="text-xs font-bold text-white">80mm Customer Invoice</div>
                      <div className="font-urdu-sans text-[11px] text-gold/80 mt-0.5" dir="rtl">
                        بڑا بل - ۴۸ کالم کسٹمر رسید
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                        Full-width 3-inch commercial roll with itemized financial breakdown, payment ledger, and customer terms.
                      </p>
                    </button>
                  </div>
                </Card>

                {/* 2. Hardware Feature Toggles Card */}
                <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Zap className="h-4 w-4 text-gold" />
                        <span>Hardware & Print Behavior</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Automations and receipt visual elements
                      </p>
                    </div>
                    <span className="font-urdu-sans text-xs text-gold/80" dir="rtl">
                      پرنٹنگ اور بارکوڈ آپشنز
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Toggle 1: Auto Print on Booking */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/20 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5 pr-4">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Auto-Print on Order Booking</span>
                          {printerSettings.auto_print_on_booking && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                              Enabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight">
                          Automatically launch the thermal printing dialog immediately when a new booking is saved.
                        </p>
                        <span className="font-urdu-sans text-[10px] text-gold/70 block pt-0.5" dir="rtl">
                          نئی بکنگ محفوظ ہوتے ہی خودکار پرنٹ ڈائیلاگ کھولیں
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePrinterSetting('auto_print_on_booking')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          printerSettings.auto_print_on_booking ? 'bg-gold' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0C0E] shadow ring-0 transition duration-200 ease-in-out ${
                            printerSettings.auto_print_on_booking ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 2: Show Barcode */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/20 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5 pr-4">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Print Code 128 Barcode</span>
                          {printerSettings.show_barcode && (
                            <Badge className="bg-gold/15 text-gold border-gold/30 text-[9px] px-1.5 py-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight">
                          Embed standard machine-scannable Code 128 barcode representing the order token on slips.
                        </p>
                        <span className="font-urdu-sans text-[10px] text-gold/70 block pt-0.5" dir="rtl">
                          کپڑے کے ٹیگ اور رسید پر سکین کے لیے بارکوڈ پرنٹ کریں
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePrinterSetting('show_barcode')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          printerSettings.show_barcode ? 'bg-gold' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0C0E] shadow ring-0 transition duration-200 ease-in-out ${
                            printerSettings.show_barcode ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 3: Show QR / Tracking */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/20 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5 pr-4">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Print Live Tracking URL</span>
                          {printerSettings.show_qr_tracking && (
                            <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[9px] px-1.5 py-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight">
                          Print direct online customer portal tracking URL on 80mm booking slips.
                        </p>
                        <span className="font-urdu-sans text-[10px] text-gold/70 block pt-0.5" dir="rtl">
                          کسٹمر کے لیے آن لائن لائیو آرڈر ٹریکنگ لنک کی شمولیت
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePrinterSetting('show_qr_tracking')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          printerSettings.show_qr_tracking ? 'bg-gold' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0C0E] shadow ring-0 transition duration-200 ease-in-out ${
                            printerSettings.show_qr_tracking ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 4: Urdu Dual Script Labels */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/20 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5 pr-4">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Bilingual Urdu Labels & Footers</span>
                          {printerSettings.show_urdu_labels && (
                            <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[9px] px-1.5 py-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight">
                          Display bilingual Urdu garment categories, receipt notices, and workshop notes.
                        </p>
                        <span className="font-urdu-sans text-[10px] text-gold/70 block pt-0.5" dir="rtl">
                          رسید پر اردو عنوانات اور شکریہ کا پیغام دکھائیں
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePrinterSetting('show_urdu_labels')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          printerSettings.show_urdu_labels ? 'bg-gold' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#0B0C0E] shadow ring-0 transition duration-200 ease-in-out ${
                            printerSettings.show_urdu_labels ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </Card>

                {/* 3. Feed Lines & Cutter Margin Stepper Card */}
                <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-gold" />
                        <span>Auto-Cutter Paper Feed Margin</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Blank line feeds before paper cut (prevents cutting through barcode/text)
                      </p>
                    </div>
                    <span className="font-urdu-sans text-xs text-gold/80" dir="rtl">
                      کاٹنے سے پہلے خالی لائنیں (۰ تا ۱۰)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/20">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-white flex items-center gap-2">
                        <span>Current Line Feeds:</span>
                        <span className="font-mono text-gold font-bold text-sm">
                          {printerSettings.feed_lines} lines
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        {Array.from({ length: 10 }).map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-2 w-2 rounded-full transition-all ${
                              idx < (printerSettings.feed_lines ?? 3)
                                ? 'bg-gold shadow-[0_0_6px_rgba(212,175,55,0.4)]'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Stepper Buttons */}
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleFeedLinesChange(-1)}
                        disabled={(printerSettings.feed_lines ?? 3) <= 0}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="w-10 text-center font-mono text-sm font-bold text-white">
                        {printerSettings.feed_lines}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFeedLinesChange(1)}
                        disabled={(printerSettings.feed_lines ?? 3) >= 10}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ── Right Column: Live Tactile Paper Preview (5 cols) ───── */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-5 sticky top-24 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gold" />
                      <h3 className="text-sm font-semibold text-white">Live Thermal Preview</h3>
                    </div>
                    <Badge variant="outline" className="border-gold/40 text-gold bg-gold/10 text-[10px]">
                      {printerSettings.paper_width === '58mm' ? '58mm Roll Preview' : '80mm Roll Preview'}
                    </Badge>
                  </div>

                  {/* Simulated Paper Roll Container */}
                  <div className="flex justify-center bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                    <div
                      className={`bg-white text-black font-mono rounded shadow-2xl border border-neutral-300 p-4 text-[10px] leading-snug transition-all select-text ${
                        printerSettings.paper_width === '58mm' ? 'w-[260px]' : 'w-[320px]'
                      }`}
                      style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
                    >
                      {printerSettings.paper_width === '58mm' ? (
                        /* 58mm Fabric Tag Live Preview */
                        <div className="space-y-1">
                          <div className="text-center font-bold tracking-tight">
                            <div>================================</div>
                            <div className="text-[11px] font-extrabold">{shop.name.toUpperCase()}</div>
                            <div className="text-[9px]">FABRIC STAPLE TAG</div>
                            <div>================================</div>
                          </div>

                          <div className="space-y-0.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="font-bold">Order #:</span>
                              <span className="font-bold">DP-2026-0801</span>
                            </div>
                            <div className="flex justify-between text-neutral-700">
                              <span>Date: 28-Aug-2026</span>
                              <span>04:30 PM</span>
                            </div>
                            <div>Cust: <strong className="font-semibold">Tariq Khan</strong></div>
                            <div>Phone: 0300-1234567</div>
                          </div>

                          <div className="border-t border-dashed border-black pt-1 space-y-0.5">
                            <div className="font-bold flex items-baseline justify-between">
                              <span>ITEM: SHALWAR KAMEEZ (1 PR)</span>
                              {printerSettings.show_urdu_labels && (
                                <span className="font-urdu-sans text-[9px] text-neutral-800" dir="rtl">
                                  شلوار قمیض
                                </span>
                              )}
                            </div>
                            <div>DELIVERY: 04-Sep-2026</div>
                          </div>

                          {/* 3x3 Grid */}
                          <div className="border-t border-dashed border-black pt-1">
                            <div className="text-center font-bold text-[9px] pb-0.5">MEASUREMENTS (INCH)</div>
                            <div className="grid grid-cols-3 text-center border border-black font-semibold text-[10px] divide-x divide-black bg-neutral-100/50">
                              <div className="py-0.5">L: 40.50"</div>
                              <div className="py-0.5">C: 38.00"</div>
                              <div className="py-0.5">W: 36.00"</div>
                            </div>
                            <div className="grid grid-cols-3 text-center border-x border-b border-black font-semibold text-[10px] divide-x divide-black bg-neutral-100/50">
                              <div className="py-0.5">T: 18.25"</div>
                              <div className="py-0.5">B: 23.50"</div>
                              <div className="py-0.5">G: 16.00"</div>
                            </div>
                            <div className="grid grid-cols-3 text-center border-x border-b border-black font-semibold text-[10px] divide-x divide-black bg-neutral-100/50">
                              <div className="py-0.5">P: 08.50"</div>
                              <div className="py-0.5">A: 15.00"</div>
                              <div className="py-0.5">D: 22.00"</div>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-black pt-1 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Total: Rs. 1,800</span>
                              <span>Adv: Rs. 1,000</span>
                            </div>
                            <div className="flex justify-between text-xs font-black">
                              <span>BAL DUE:</span>
                              <span>Rs. 800</span>
                            </div>
                          </div>

                          {/* Live Barcode */}
                          {printerSettings.show_barcode && (
                            <div className="border-t border-dashed border-black pt-1 text-center">
                              <BarcodeRenderer
                                value="DP-2026-0801"
                                format="svg"
                                height={32}
                                moduleWidth={1.2}
                                displayValue={true}
                                barColor="#000000"
                                backgroundColor="transparent"
                              />
                              <div className="text-center text-[9px]">================================</div>
                            </div>
                          )}

                          {/* Line Feeds margin simulation */}
                          {printerSettings.feed_lines > 0 && (
                            <div
                              className="border-t border-dotted border-neutral-300 text-[8px] text-neutral-400 text-center flex items-center justify-center"
                              style={{ height: `${printerSettings.feed_lines * 7}px` }}
                            >
                              ✂ [Cutter Feed: {printerSettings.feed_lines} lines]
                            </div>
                          )}
                        </div>
                      ) : (
                        /* 80mm Customer Invoice Live Preview */
                        <div className="space-y-1.5">
                          <div className="text-center font-bold tracking-tight">
                            <div>========================================</div>
                            <div className="text-xs font-black">{shop.name.toUpperCase()}</div>
                            {shop.address && <div className="text-[9px] font-normal">{shop.address}</div>}
                            {(shop.phone || shop.owner_phone) && (
                              <div className="text-[9px] font-normal">Tel: {shop.phone || shop.owner_phone}</div>
                            )}
                            <div>========================================</div>
                          </div>

                          <div className="space-y-0.5 text-[10px]">
                            <div className="flex justify-between">
                              <span>Receipt #: <strong className="font-bold">DP-2026-0801</strong></span>
                              <span>28-Aug-2026</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cust: <strong className="font-bold">Tariq Khan</strong></span>
                              <span>04:30 PM</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Phone: 0300-1234567</span>
                              <span>Status: <strong className="font-bold">PARTIAL</strong></span>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-black pt-1">
                            <div className="flex justify-between font-bold text-[9px] pb-0.5 border-b border-black">
                              <span className="w-1/2">Item Description</span>
                              <span className="w-10 text-center">Qty</span>
                              <span className="w-14 text-right">Rate</span>
                              <span className="w-16 text-right">Amount</span>
                            </div>
                            <div className="pt-0.5 space-y-0.5 text-[10px]">
                              <div className="flex justify-between items-start">
                                <div className="w-1/2 min-w-0 pr-1">
                                  <div className="truncate font-medium">Men Shalwar Kameez</div>
                                  {printerSettings.show_urdu_labels && (
                                    <div className="font-urdu-sans text-[9px] text-neutral-600 truncate" dir="rtl">
                                      مردانہ شلوار قمیض
                                    </div>
                                  )}
                                </div>
                                <span className="w-10 text-center">1</span>
                                <span className="w-14 text-right">1,800</span>
                                <span className="w-16 text-right font-medium">1,800.00</span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-black pt-1 space-y-0.5 text-[10px]">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>Rs. 1,800</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Advance Deposit (Cash):</span>
                              <span>Rs. 1,000</span>
                            </div>
                            <div className="flex justify-between font-black text-[11px] pt-0.5 border-t border-black">
                              <span>NET BALANCE DUE:</span>
                              <span>Rs. 800</span>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-black pt-1 text-[10px] flex justify-between font-bold">
                            <span>Delivery Date:</span>
                            <span>04-Sep-2026</span>
                          </div>

                          {printerSettings.show_urdu_labels && shop.receipt_footer && (
                            <div className="border-t border-dashed border-black pt-1 text-[8px] text-neutral-600 font-urdu-sans text-center" dir="rtl">
                              {shop.receipt_footer}
                            </div>
                          )}

                          {/* Online Tracking & Barcode */}
                          {(printerSettings.show_qr_tracking || printerSettings.show_barcode) && (
                            <div className="border-t border-dashed border-black pt-1 text-center">
                              {printerSettings.show_qr_tracking && (
                                <div className="text-[9px] text-neutral-700 pb-0.5">
                                  Track Live: silaye.com/track/DP20260801
                                </div>
                              )}
                              {printerSettings.show_barcode && (
                                <BarcodeRenderer
                                  value="DP-2026-0801"
                                  format="svg"
                                  height={36}
                                  moduleWidth={1.4}
                                  displayValue={true}
                                  barColor="#000000"
                                  backgroundColor="transparent"
                                />
                              )}
                              <div className="text-center text-[9px] pt-0.5">========================================</div>
                            </div>
                          )}

                          {/* Line Feeds margin simulation */}
                          {printerSettings.feed_lines > 0 && (
                            <div
                              className="border-t border-dotted border-neutral-300 text-[8px] text-neutral-400 text-center flex items-center justify-center"
                              style={{ height: `${printerSettings.feed_lines * 7}px` }}
                            >
                              ✂ [Cutter Feed: {printerSettings.feed_lines} lines]
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTestModalOpen(true)}
                      className="flex-1 border-white/10 hover:bg-white/5 text-gray-300 text-xs gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Test Print Dialog</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const testSlipData = {
                          shopName: shop.name,
                          shopAddress: shop.address,
                          shopPhone: shop.phone || shop.owner_phone,
                          orderNumber: 'DP-2026-0801',
                          bookingDate: '28-Aug-2026',
                          bookingTime: '04:30 PM',
                          customerName: 'Muhammad Tariq Khan',
                          customerPhone: '0300-1234567',
                          garmentType: 'Men Shalwar Kameez',
                          garmentTypeUr: 'مردانہ شلوار قمیض',
                          quantity: 1,
                          deliveryDate: '2026-09-04',
                          totalAmount: 1800,
                          advancePaid: 1000,
                          balanceDue: 800,
                        };
                        const bytes = printerSettings.paper_width === '58mm'
                          ? buildFabricTagBinary(testSlipData, printerSettings)
                          : buildCustomerInvoiceBinary(testSlipData, printerSettings);
                        downloadEscPosBinaryFile(bytes, `test-slip-${printerSettings.paper_width}.bin`);
                      }}
                      className="border-white/10 hover:bg-white/5 text-gray-300 text-xs gap-1.5"
                      title="Download raw ESC/POS binary stream for thermal printer hardware"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>.bin</span>
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Billing & Subscriptions */}
        {activeTab === 'billing' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Pending Manual Payment Review Banner */}
            {pendingPayment && pendingPayment.status === 'PENDING' && (
              <div className="rounded-2xl border border-amber-500/40 bg-[#16130c]/95 p-6 sm:p-7 backdrop-blur-2xl shadow-[0_0_35px_rgba(245,158,11,0.18)] relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                {/* Banner Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                      <Hourglass className="h-5 w-5 animate-spin" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                          <span>Payment Under Review</span>
                        </span>
                        <span className="font-urdu-sans text-xs text-amber-400 font-semibold" dir="rtl">
                          (تصدیق زیر جائزہ ہے)
                        </span>
                      </div>
                      <h3 className="font-editorial text-lg sm:text-xl font-bold text-white tracking-tight mt-1">
                        Manual Pakistani Bank Transfer Verification in Progress
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-amber-400/90 font-mono bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Submitted {new Date(pendingPayment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs relative z-10">
                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                    <span className="text-gray-400 block text-[11px]">Requested Plan:</span>
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      {pendingPayment.plan_tier === 'PRO' ? (
                        <>
                          <Crown className="h-4 w-4 text-gold" />
                          <span>Pro Workshop</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-cyan-400" />
                          <span>Enterprise House</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                    <span className="text-gray-400 block text-[11px]">Amount & Frequency:</span>
                    <span className="font-bold text-white text-sm">
                      <bdi dir="ltr" className="text-amber-400 font-mono">Rs. {Number(pendingPayment.amount_pkr).toLocaleString('en-PK')}</bdi>{' '}
                      <span className="text-xs text-gray-400 font-normal">({pendingPayment.billing_cycle === 'ANNUAL' ? '1-Year' : '1-Month'})</span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                    <span className="text-gray-400 block text-[11px]">Method & Reference:</span>
                    <div className="font-mono text-xs text-gray-200 truncate">
                      <span className="font-semibold text-white uppercase">{pendingPayment.payment_method.replace('_', ' ')}</span>
                      <span className="text-amber-400 block truncate">#{pendingPayment.transaction_reference}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-gray-400 block text-[11px]">Receipt Slip:</span>
                      <span className="text-[11px] text-gray-300 font-medium truncate block">Slip Attached</span>
                    </div>
                    {pendingPayment.receipt_image_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxImageUrl(pendingPayment.receipt_image_url);
                          setIsReceiptLightboxOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer shrink-0"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-amber-300/80 leading-relaxed pt-1 relative z-10">
                  Our finance operations team is verifying your payment reference with the bank. Verification typically completes within 1–2 hours during business hours. Your workshop capacity will automatically unlock.
                </p>
              </div>
            )}

            {/* Active Plan & Usage Overview Widget */}
            <div className="premium-glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden border border-white/10 bg-[#0F1115]/80 backdrop-blur-2xl">
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5 relative z-10">
                {/* Current Plan Badge & Identity */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                      Current Subscription Plan
                    </span>
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        shop.subscription_status === 'ACTIVE'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : shop.subscription_status === 'TRIALING'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      <span>{shop.subscription_status === 'ACTIVE' ? 'Active / فعال' : shop.subscription_status === 'TRIALING' ? 'Trial Period' : 'Past Due'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {shop.plan_tier === 'PRO' ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gold/40 bg-gold/15 text-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        <Crown className="h-5 w-5 text-gold" />
                        <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight">
                          Multi-Counter Workshop (Pro)
                        </span>
                      </div>
                    ) : shop.plan_tier === 'ENTERPRISE' ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <Sparkles className="h-5 w-5 text-cyan-400" />
                        <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight">
                          Enterprise Tailor House
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-500/40 bg-slate-500/15 text-slate-200">
                        <Store className="h-5 w-5 text-slate-400" />
                        <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight">
                          Solo Master (Free)
                        </span>
                      </div>
                    )}
                    <span className="font-urdu-serif text-sm text-gold/80" dir="rtl">
                      {shop.plan_tier === 'PRO' ? 'ورکشاپ پلان (پیشہ ورانہ)' : shop.plan_tier === 'ENTERPRISE' ? 'حویلی / انٹرپرائز' : 'سولو ماسٹر (بنیادی)'}
                    </span>
                  </div>
                </div>

                {/* Renewal & Billing Frequency Details */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-gray-300">
                    <Clock className="h-4 w-4 text-gold shrink-0" />
                    <span>
                      {(() => {
                        if (!shop.current_period_end) {
                          return 'Quota resets on 1st of next month';
                        }
                        const end = new Date(shop.current_period_end);
                        const now = new Date();
                        const diffDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                        return `Quota cycle resets in ${diffDays} days (${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`;
                      })()}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-gray-400 font-mono">
                    <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                    <span>{shop.billing_cycle === 'ANNUAL' ? 'Annual Cycle (-20%)' : 'Monthly Cycle'}</span>
                  </span>
                </div>
              </div>

              {/* Meter Progress Bar */}
              <div className="pt-6 space-y-3 relative z-10">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-300 font-medium flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-gold" />
                    <span>Monthly Tailoring Quota Meter</span>
                    <span className="font-urdu-sans text-xs text-gold/70" dir="rtl">(ماہانہ کوٹہ)</span>
                  </span>

                  {shop.plan_tier === 'FREE' ? (
                    <span className="font-semibold text-white">
                      <bdi dir="ltr" className="text-gold font-bold">{shopUsage.orders_count}</bdi> / 50 Suits Tailored
                      <span className="text-xs text-gray-400 ml-1.5">({Math.min(100, Math.round((shopUsage.orders_count / 50) * 100))}% used)</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <bdi dir="ltr" className="font-bold">{shopUsage.orders_count}</bdi> Suits Tailored
                      <span className="text-xs text-emerald-400/80 font-normal">· Unlimited Capacity (لامحدود)</span>
                    </span>
                  )}
                </div>

                {/* Visual Meter Bar */}
                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden relative">
                  {shop.plan_tier === 'FREE' ? (
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        shopUsage.orders_count >= 50
                          ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                          : shopUsage.orders_count >= 40
                          ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                          : 'bg-gradient-to-r from-gold to-amber-400 shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((shopUsage.orders_count / 50) * 100))}%` }}
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                  <span>
                    {shop.plan_tier === 'FREE'
                      ? '50 suits monthly ceiling. Upgrade to Pro for unlimited suits & 5 staff roles.'
                      : 'All quota caps unlocked. Tailor unlimited customer suits without limits.'}
                  </span>
                  {shop.plan_tier === 'FREE' && shopUsage.orders_count >= 40 && (
                    <span className="text-amber-400 font-medium">
                      ⚠️ Approaching monthly limit ({50 - shopUsage.orders_count} suits remaining)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Pricing Matrix */}
            <div className="space-y-6">
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-gold text-xs font-semibold tracking-wider uppercase">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Transparent PKR Subscriptions</span>
                </div>
                <h2 className="font-editorial text-2xl sm:text-4xl text-white font-medium tracking-tight">
                  Tailoring capacity without <em className="italic text-gold">complications.</em>
                </h2>
                <p className="text-xs sm:text-sm text-gray-400">
                  Select the workshop tier suited to your craftsmen and counter volume. All plans in Pakistani Rupees.
                </p>

                {/* Billing Toggle */}
                <div className="pt-2">
                  <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-[#121316] border border-white/10 backdrop-blur-md shadow-lg">
                    <button
                      type="button"
                      onClick={() => setIsAnnual(false)}
                      className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        !isAnnual
                          ? 'bg-gold text-[#0B0C0E] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Monthly (ماہانہ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAnnual(true)}
                      className={`relative px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isAnnual
                          ? 'bg-gold text-[#0B0C0E] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>Annually (سالانہ)</span>
                      <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        −20% Save
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4">
                {PRICING_PLANS.map((plan) => {
                  const isCurrentTier = shop.plan_tier === plan.tier;
                  const isCurrentCycle = isAnnual ? shop.billing_cycle === 'ANNUAL' : shop.billing_cycle === 'MONTHLY';
                  const isExactCurrent = isCurrentTier && isCurrentCycle;

                  const displayPrice = isAnnual ? plan.annualMonthlyPKR : plan.monthlyPKR;
                  const savings = plan.monthlyPKR > 0 && isAnnual ? (plan.monthlyPKR - plan.annualMonthlyPKR) * 12 : 0;

                  return (
                    <div
                      key={plan.tier}
                      className={`premium-glass-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-300 hover:-translate-y-1 ${
                        plan.highlight
                          ? 'border-gold/60 shadow-[0_0_40px_rgba(212,175,55,0.15)] bg-[#14151a]'
                          : 'border-white/10 bg-[#0F1115]/80'
                      }`}
                    >
                      {/* Popular Badge */}
                      {plan.badge && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0B0C0E] shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            <Crown className="h-3 w-3 fill-current" />
                            <span>{plan.badge}</span>
                            <span className="font-urdu-sans text-[9px] -mt-0.5" dir="rtl">({plan.badgeUr})</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-6">
                        {/* Plan Title & Identity */}
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-editorial text-2xl font-bold text-white tracking-tight">
                              {plan.title}
                            </h3>
                            {isExactCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                                Active Plan
                              </span>
                            )}
                          </div>
                          <p className="font-urdu-serif text-xs text-gold/80 mt-0.5" dir="rtl">
                            {plan.urTitle}
                          </p>
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            {plan.tagline}
                          </p>
                        </div>

                        {/* Price Block */}
                        <div className="border-t border-white/10 pt-5 space-y-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-editorial text-3xl sm:text-4xl font-normal text-white">
                              <bdi dir="ltr">Rs. {displayPrice.toLocaleString('en-PK')}</bdi>
                            </span>
                            <span className="text-xs text-gray-400">/ month</span>
                          </div>

                          {plan.monthlyPKR === 0 ? (
                            <p className="text-[11px] text-gray-400">Free forever · No credit card required</p>
                          ) : isAnnual ? (
                            <p className="text-[11px] text-gray-400">
                              Billed annually (<bdi dir="ltr">Rs. {(displayPrice * 12).toLocaleString('en-PK')}/yr</bdi>) ·{' '}
                              <span className="font-semibold text-emerald-400">
                                Save Rs. {savings.toLocaleString('en-PK')}/yr
                              </span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400">Billed monthly · Cancel or switch anytime</p>
                          )}
                        </div>

                        {/* Feature List */}
                        <div className="space-y-3 pt-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Included Capabilities
                          </span>
                          <ul className="space-y-2.5">
                            {plan.features.map((feat) => (
                              <li key={feat} className="flex items-start gap-2.5 text-xs text-gray-300">
                                <div
                                  className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                    plan.highlight ? 'bg-gold/20 text-gold' : 'bg-white/10 text-gray-300'
                                  }`}
                                >
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </div>
                                <span className="leading-snug">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* CTA Action */}
                      <div className="pt-8 mt-auto">
                        {isExactCurrent ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled
                            className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-xs py-5 opacity-80 cursor-default"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            <span>Current Plan (موجودہ پلان)</span>
                          </Button>
                        ) : pendingPayment && pendingPayment.status === 'PENDING' && pendingPayment.plan_tier === plan.tier ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled
                            className="w-full border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold text-xs py-5 opacity-90 cursor-default gap-1.5"
                          >
                            <Hourglass className="h-4 w-4 animate-spin text-amber-400" />
                            <span>Verification In Review (زیر جائزہ)</span>
                          </Button>
                        ) : plan.tier === 'FREE' ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenUpgradeModal(plan.tier)}
                            className="w-full border-white/10 hover:bg-white/5 text-gray-300 font-semibold text-xs py-5 cursor-pointer"
                          >
                            <span>Downgrade to Free</span>
                          </Button>
                        ) : isCurrentTier && !isExactCurrent ? (
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => handleOpenUpgradeModal(plan.tier)}
                            className="w-full bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold text-xs py-5 shadow-[0_0_20px_rgba(212,175,55,0.2)] cursor-pointer"
                          >
                            <span>Switch to {isAnnual ? 'Annual (−20%)' : 'Monthly'}</span>
                          </Button>
                        ) : plan.tier === 'PRO' ? (
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => handleOpenUpgradeModal(plan.tier)}
                            className="w-full bg-gold text-[#0B0C0E] hover:bg-gold-hover font-bold text-xs py-5 shadow-[0_0_25px_rgba(212,175,55,0.3)] cursor-pointer gap-1.5"
                          >
                            <Crown className="h-4 w-4" />
                            <span>Upgrade to Pro (پرو پلان حاصل کریں)</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenUpgradeModal(plan.tier)}
                            className="w-full border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs py-5 shadow-[0_0_20px_rgba(6,182,212,0.15)] cursor-pointer gap-1.5"
                          >
                            <Sparkles className="h-4 w-4" />
                            <span>Upgrade to Enterprise</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Test Thermal Print Slip Modal                                             */}
      {/* ========================================================================= */}
      {isTestModalOpen && (
        <ThermalSlipModal
          open={isTestModalOpen}
          onOpenChange={setIsTestModalOpen}
          order={mockOrders[0]}
          customer={mockCustomers[0]}
          shop={shop}
          settings={printerSettings}
          initialFormat={printerSettings.paper_width}
        />
      )}

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

      {/* ========================================================================= */}
      {/* Manual Pakistani Bank Transfer & Slip Upload Modal                        */}
      {/* ========================================================================= */}
      {isUpgradeModalOpen && selectedUpgradeTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#121316] p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                    selectedUpgradeTier === 'PRO'
                      ? 'border-gold/40 bg-gold/15 text-gold'
                      : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                  }`}
                >
                  {selectedUpgradeTier === 'PRO' ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-white tracking-tight">
                    Bank Transfer & Slip Verification
                  </h3>
                  <p className="font-urdu-serif text-xs text-gold/80 -mt-0.5" dir="rtl">
                    بینک ٹرانسفر، راست اور رسید اپ لوڈ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  setSelectedUpgradeTier(null);
                  setReceiptFile(null);
                  setReceiptPreviewUrl(null);
                  setPaymentFormError(null);
                }}
                className="text-gray-400 hover:text-white rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Plan & Amount Summary Card */}
            {(() => {
              const meta = PRICING_PLANS.find((p) => p.tier === selectedUpgradeTier);
              if (!meta) return null;

              const monthlyPrice = isAnnual ? meta.annualMonthlyPKR : meta.monthlyPKR;
              const totalPrice = isAnnual ? meta.annualMonthlyPKR * 12 : meta.monthlyPKR;

              return (
                <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Upgrading Workshop To:</span>
                    <span className="font-bold text-white text-sm">{meta.title} ({meta.urTitle})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Billing Cycle:</span>
                    <span className="font-semibold text-gold">
                      {isAnnual ? 'Annual Billing (−20% Discount applied)' : 'Monthly Billing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                    <span className="text-gray-300 font-medium">Total Amount to Transfer:</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-white font-mono">
                        <bdi dir="ltr" className="text-gold">Rs. {totalPrice.toLocaleString('en-PK')}</bdi>
                      </span>
                      {isAnnual && (
                        <div className="text-[10px] text-emerald-400">
                          Includes 12 months full access (Save Rs. {((meta.monthlyPKR - meta.annualMonthlyPKR) * 12).toLocaleString('en-PK')})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Official Bank & Account Details Card */}
            <div className="rounded-xl border border-gold/30 bg-[#16140e]/90 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-gold/20 pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gold" />
                  <span className="text-xs font-bold text-white">Official Pakistani Bank Accounts</span>
                </div>
                <span className="font-urdu-sans text-[11px] text-gold/80" dir="rtl">
                  میزان بینک اور راست اکاونٹ
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Bank Name & Title */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bank & Title:</span>
                  <span className="text-white font-semibold text-right">
                    Meezan Bank Ltd · <span className="text-gold">Silaye Technologies / Hassan Tariq</span>
                  </span>
                </div>

                {/* IBAN */}
                <div className="flex items-center justify-between gap-2 bg-black/50 p-2 rounded-lg border border-white/5">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 block">Account / IBAN Number:</span>
                    <span className="font-mono text-xs text-white font-semibold block truncate">
                      PK00MEZN0001234567890101
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText('PK00MEZN0001234567890101', 'iban')}
                    className="border-gold/30 hover:bg-gold/10 text-gold text-[11px] h-7 px-2.5 gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedField === 'iban' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Raast ID */}
                <div className="flex items-center justify-between gap-2 bg-black/50 p-2 rounded-lg border border-white/5">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 block">Raast ID / Instant Pay:</span>
                    <span className="font-mono text-xs text-white font-semibold block truncate">
                      03001234567 <span className="text-gray-400 font-normal text-[11px]">(payments@silaye.pk)</span>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText('03001234567', 'raast')}
                    className="border-gold/30 hover:bg-gold/10 text-gold text-[11px] h-7 px-2.5 gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedField === 'raast' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* JazzCash / EasyPaisa Till */}
                <div className="flex items-center justify-between gap-2 bg-black/50 p-2 rounded-lg border border-white/5">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 block">JazzCash & EasyPaisa Merchant Number:</span>
                    <span className="font-mono text-xs text-white font-semibold block truncate">
                      03001234567
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText('03001234567', 'wallet')}
                    className="border-gold/30 hover:bg-gold/10 text-gold text-[11px] h-7 px-2.5 gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedField === 'wallet' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitPaymentRequest} className="space-y-4">
              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
                  <span>Transfer Channel Used:</span>
                  <span className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                    ادائیگی کا طریقہ منتخب کریں
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'BANK_TRANSFER' as PaymentMethod, label: 'Bank Transfer', ur: 'بینک ٹرانسفر' },
                    { id: 'RAAST' as PaymentMethod, label: 'Raast Pay', ur: 'راست ادائیگی' },
                    { id: 'JAZZCASH' as PaymentMethod, label: 'JazzCash', ur: 'جاز کیش' },
                    { id: 'EASYPAISA' as PaymentMethod, label: 'EasyPaisa', ur: 'ایزی پیسہ' },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-gold bg-gold/15 text-white shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                            : 'border-white/10 bg-black/30 text-gray-400 hover:border-white/20 hover:text-gray-200'
                        }`}
                      >
                        <span className="font-semibold text-xs block truncate">{m.label}</span>
                        <span className="font-urdu-sans text-[10px] text-gold/80 block mt-0.5" dir="rtl">
                          {m.ur}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transaction ID / UTR Reference Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
                  <span>Transaction ID / Reference Number <span className="text-rose-400">*</span>:</span>
                  <span className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                    ٹرانزیکشن آئی ڈی / یو ٹی آر نمبر
                  </span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. MEZN-98234812 / RAAST-837482"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="bg-black/50 border-white/10 text-white font-mono text-xs h-10 placeholder:text-gray-600 focus:border-gold"
                  required
                />
              </div>

              {/* Receipt File Upload & Preview */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
                  <span>Upload Payment Receipt / Slip Screenshot <span className="text-rose-400">*</span>:</span>
                  <span className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                    بینک رسید یا اسکرین شاٹ اپ لوڈ کریں
                  </span>
                </label>

                {receiptPreviewUrl ? (
                  <div className="relative rounded-xl border border-gold/40 bg-black/60 p-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptPreviewUrl}
                      alt="Receipt Preview"
                      className="h-16 w-16 object-cover rounded-lg border border-white/10 shrink-0 bg-neutral-900"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold text-white truncate">
                        {receiptFile?.name || 'receipt_slip.jpg'}
                      </p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Slip image attached ({receiptFile ? `${(receiptFile.size / 1024).toFixed(0)} KB` : 'Ready'})</span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveReceipt}
                      className="border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs h-8 px-2.5 gap-1 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </Button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/15 hover:border-gold/50 rounded-xl p-5 flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-black/50 transition-all cursor-pointer group">
                    <div className="h-9 w-9 rounded-full bg-white/5 group-hover:bg-gold/15 flex items-center justify-center text-gray-400 group-hover:text-gold transition-colors">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div className="text-center space-y-0.5">
                      <p className="text-xs font-semibold text-gray-300 group-hover:text-white">
                        Click to browse or drop payment receipt image
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Supports PNG, JPG, JPEG, WebP up to 5MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Error Message */}
              {paymentFormError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{paymentFormError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    setSelectedUpgradeTier(null);
                    setReceiptFile(null);
                    setReceiptPreviewUrl(null);
                    setPaymentFormError(null);
                  }}
                  disabled={upgrading}
                  className="border-white/10 hover:bg-white/5 text-gray-300 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  isLoading={upgrading}
                  disabled={upgrading}
                  className="bg-gold text-[#0B0C0E] hover:bg-gold-hover font-bold text-xs shadow-[0_0_20px_rgba(212,175,55,0.25)] gap-1.5 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>Submit Slip for Review (تصدیق کے لیے جمع کریں)</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Receipt Image Lightbox Modal                                              */}
      {/* ========================================================================= */}
      {isReceiptLightboxOpen && lightboxImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full rounded-2xl border border-white/10 bg-[#0F1115] p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold text-white">Payment Receipt Document</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReceiptLightboxOpen(false);
                  setLightboxImageUrl(null);
                }}
                className="text-gray-400 hover:text-white rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[75vh] overflow-hidden rounded-xl bg-black/80 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImageUrl}
                alt="Receipt Full View"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* WORKSHOP RESET / PURGE TEST DATA CONFIRMATION MODAL                 */}
      {/* ------------------------------------------------------------------ */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0F1115]/95 p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(244,63,94,0.2)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-400">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-editorial text-lg font-bold text-white">
                    Reset Workshop Data
                  </h3>
                  <p className="font-urdu-sans text-xs text-rose-400" dir="rtl">
                    ورکشاپ ٹیسٹ ڈیٹا صفائی
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-gray-400 hover:text-white rounded-lg p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <p>
                You are initiating a permanent data purification for <strong className="text-white">{shop.name}</strong>.
              </p>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  <span>Will Be Deleted:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
                  <li>All test orders and production queue records</li>
                  <li>All customer measurement profiles</li>
                  <li>All Khata financial transactions & balances</li>
                  <li>Customer directory contacts</li>
                  <li>Monthly tailoring quota usage reset to 0</li>
                </ul>
                <p className="font-urdu-sans text-rose-400 pt-1" dir="rtl">
                  تمام کسٹمرز، آرڈرز اور کھاتہ رجسٹر مکمل ڈیلیٹ ہو جائے گا۔
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-300">
                <span className="font-medium">Retained Safely:</span> Workshop profile settings, staff accounts, catalog rates, and printer hardware preferences.
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-gray-300 flex items-center justify-between font-medium">
                  <span>Type <strong className="text-rose-400 font-mono">PURGE</strong> to confirm:</span>
                  <span className="font-urdu-sans text-[11px] text-gray-400" dir="rtl">
                    تصدیق کے لیے PURGE لکھیں
                  </span>
                </label>
                <Input
                  type="text"
                  placeholder="PURGE"
                  value={resetConfirmInput}
                  onChange={(e) => setResetConfirmInput(e.target.value)}
                  className="bg-black/50 border-rose-500/30 focus:border-rose-500 text-white font-mono text-center uppercase tracking-widest text-sm h-10"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsResetModalOpen(false)}
                disabled={purgingWorkshop}
                className="border-white/10 text-gray-300 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleConfirmWorkshopReset}
                disabled={purgingWorkshop || resetConfirmInput.trim().toUpperCase() !== 'PURGE'}
                className="font-semibold bg-rose-500 hover:bg-rose-600 text-white text-xs shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {purgingWorkshop ? 'Purging Workshop...' : 'Purge All Test Data'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
