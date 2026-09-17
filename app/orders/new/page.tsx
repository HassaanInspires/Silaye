'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  User,
  Phone,
  MapPin,
  CalendarDays,
  Scissors,
  Package,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Ruler,
  BadgeCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CreditCard,
  RotateCcw,
  FileText,
  Clock,
  Layers,
  Zap,
  Crown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MeasurementIntakeForm } from '@/components/tailor/measurement-intake-form';
import { VisualMannequinPad } from '@/components/tailor/visual-mannequin-pad';
import { WhatsAppReceiptModal } from '@/components/tailor/whatsapp-receipt-modal';
import { ThermalSlipModal } from '@/components/tailor/thermal-slip-modal';
import { useLanguage } from '@/lib/language-provider';
import confetti from 'canvas-confetti';
import {
  mockShop,
} from '@/lib/mock-data';
import {
  staffDb,
  ratesDb,
  printerDb,
  subscriptionDb,
  customersDb,
  measurementsDb,
  shopsDb,
  ordersDb,
  DEFAULT_PRINTER_SETTINGS,
  db,
} from '@/lib/db';
import { syncEngine } from '@/lib/sync/sync-engine';
import { calculateOrderFinancials, formatPakistaniPhone } from '@/lib/validations/tailor';
import type {
  Customer,
  GarmentOrder,
  MeasurementProfile,
  ShopMember,
  GarmentRate,
  PrinterSettings,
  ShalwarKameezMeasurements,
  StylePreferences,
  GarmentType,
  FabricSource,
  PlanTier,
  Shop,
} from '@/types/tailor';

function getFutureDateString(days: number): string {
  const target = new Date();
  target.setDate(target.getDate() + days);
  return target.toISOString().split('T')[0];
}

function formatMeasurementDisplay(val: number): string {
  if (isNaN(val) || val <= 0) return '0″';
  const whole = Math.floor(val);
  const frac = Math.round((val - whole) * 100) / 100;
  let fracStr = '';
  if (Math.abs(frac - 0.25) < 0.05) fracStr = ' ¼';
  else if (Math.abs(frac - 0.5) < 0.05) fracStr = ' ½';
  else if (Math.abs(frac - 0.75) < 0.05) fracStr = ' ¾';

  if (whole === 0 && fracStr) return `${fracStr.trim()}″`;
  return `${whole}${fracStr}″`;
}

// ---------------------------------------------------------------------------
// Default measurement values (Pakistani adult standard baseline, quarter-inch aligned)
// ---------------------------------------------------------------------------

const DEFAULT_MEASUREMENTS: ShalwarKameezMeasurements = {
  kameez_length:  40.0,
  chest:          38.0,
  waist:          36.0,
  shoulder_teera: 17.5,
  sleeve_length:  23.5,
  neck_gala:      15.5,
  daman_width:    22.0,
  shalwar_length: 38.0,
  paincha:        8.5,
  aasan:          16.5,
};

const DEFAULT_STYLES: StylePreferences = {
  collar_style: 'FULL_BAN',
  daman_style:  'CHORAS_DAMAN',
  pocket_config: 'FRONT_ONE_SIDE',
  pockets: ['FRONT_CHEST', 'RIGHT_SIDE'],
  front_patti:  'GUM_PATTI',
  bottom_type:  'SHALWAR_TRADITIONAL',
  stitch_type:  'DOUBLE_SILAI',
};

const MOBILE_MEASUREMENT_FIELDS: Array<{
  key: keyof ShalwarKameezMeasurements;
  ur: string;
  en: string;
  defaultVal: number;
}> = [
  { key: 'kameez_length', ur: 'لمبائی', en: 'Length', defaultVal: 40 },
  { key: 'chest', ur: 'چھاتی', en: 'Chest', defaultVal: 38 },
  { key: 'waist', ur: 'کمر', en: 'Waist', defaultVal: 36 },
  { key: 'shoulder_teera', ur: 'تیرا', en: 'Shoulder', defaultVal: 17.5 },
  { key: 'sleeve_length', ur: 'بازو', en: 'Sleeve', defaultVal: 23.5 },
  { key: 'neck_gala', ur: 'گلا', en: 'Collar', defaultVal: 15.5 },
  { key: 'daman_width', ur: 'دامن', en: 'Daman', defaultVal: 22 },
  { key: 'shalwar_length', ur: 'شلوار لمبائی', en: 'Shalwar', defaultVal: 38 },
  { key: 'paincha', ur: 'پائینچہ', en: 'Paincha', defaultVal: 8.5 },
  { key: 'aasan', ur: 'آسن', en: 'Aasan', defaultVal: 16.5 },
];

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

interface SectionCardProps {
  title: string;
  urTitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, urTitle, icon, children, className }: SectionCardProps) {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';
  const displayTitle = isUrdu && urTitle ? urTitle : title;

  return (
    <Card className={cn('premium-glass-card flex flex-col gap-0 border border-border bg-card shadow-xs hover:border-primary/30 transition-all duration-300', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 pb-3 pt-3.5 bg-card-elevated/40">
        <div className="flex items-center gap-2.5">
          <span className="text-primary p-1.5 rounded-lg bg-primary/10 border border-primary/20 shadow-xs">{icon}</span>
          <CardTitle className={cn("text-sm font-semibold text-foreground tracking-tight", isUrdu && "font-urdu-serif text-base")}>
            {displayTitle}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-5">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Financial Row sub-component
// ---------------------------------------------------------------------------

interface FinancialRowProps {
  label: string;
  urLabel?: string;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  highlight?: 'gold' | 'green' | 'red' | 'amber';
  prefix?: string;
  isBold?: boolean;
}

function FinancialRow({
  label,
  urLabel,
  value,
  onChange,
  readOnly = false,
  highlight,
  prefix = 'Rs.',
  isBold = false,
}: FinancialRowProps) {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';
  const displayLabel = isUrdu && urLabel ? urLabel : label;

  const colorMap = {
    gold:  'text-primary',
    green: 'text-status-ready',
    red:   'text-status-overdue',
    amber: 'text-status-stitching',
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      {/* Label */}
      <div className="flex flex-col gap-0">
        <span
          className={cn(
            'text-xs leading-tight',
            isUrdu ? 'font-urdu-sans text-xs' : 'font-sans',
            isBold ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
        >
          {displayLabel}
        </span>
      </div>

      {/* Input or display */}
      {readOnly ? (
        <bdi
          dir="ltr"
          className={cn(
            'font-mono text-sm tabular-nums whitespace-nowrap',
            isBold ? 'font-bold text-base' : 'font-medium',
            highlight ? colorMap[highlight] : 'text-foreground'
          )}
        >
          {prefix} {value.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </bdi>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">{prefix}</span>
          <bdi dir="ltr" className="inline-flex">
            <input
              type="number"
              dir="ltr"
              inputMode="numeric"
              min={0}
              value={value}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange?.(isNaN(v) ? 0 : Math.max(0, v));
              }}
              className="h-8 w-24 rounded-md border border-input bg-card-elevated px-2 text-right font-mono text-xs font-semibold text-foreground tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </bdi>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Garment type options
// ---------------------------------------------------------------------------

const GARMENT_TYPE_OPTIONS: ReadonlyArray<{ value: GarmentType; en: string; ur: string }> = [
  { value: 'MEN_SHALWAR_KAMEEZ', en: 'Shalwar Kameez', ur: 'شلوار قمیض' },
  { value: 'MEN_KURTA',          en: 'Kurta',           ur: 'کرتہ' },
  { value: 'WAISTCOAT',          en: 'Waistcoat',       ur: 'واسکٹ' },
  { value: 'PRINCE_SUIT',        en: 'Prince Suit',     ur: 'پرنس سوٹ' },
  { value: 'TROUSER_SHIRT',      en: 'Trouser + Shirt', ur: 'ٹراؤزر + شرٹ' },
  { value: 'WOMEN_SUIT',         en: "Ladies' Suit",    ur: 'خواتین سوٹ' },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NewOrderPage() {
  const { language, dir, t: dashT, newOrderT: t } = useLanguage();
  const isUrdu = language === 'ur';

  // ── Tab state: 3 Progressive Disclosure Steps ──────────────────────────
  const [activeTab, setActiveTab] = React.useState<string>('customer');
  const [mobileStep, setMobileStep] = React.useState<1 | 2 | 3>(1);

  // ── Customer lookup state ──────────────────────────────────────────────
  const [phone, setPhone] = React.useState<string>('');
  const [foundCustomer, setFoundCustomer] = React.useState<Customer | null>(null);
  const [foundProfile, setFoundProfile] = React.useState<MeasurementProfile | null>(null);
  const [isProfileLocked, setIsProfileLocked] = React.useState<boolean>(false);

  // ── Customer form fields ───────────────────────────────────────────────
  const [customerName, setCustomerName] = React.useState<string>('');
  const [customerAddress, setCustomerAddress] = React.useState<string>('');
  const [showAddressNotes, setShowAddressNotes] = React.useState<boolean>(false);

  // ── Garment & fabric ──────────────────────────────────────────────────
  const [garmentType, setGarmentType] = React.useState<GarmentType>('MEN_SHALWAR_KAMEEZ');
  const [quantity, setQuantity] = React.useState<number>(1);
  const [deliveryDate, setDeliveryDate] = React.useState<string>('');
  const [trialDate, setTrialDate] = React.useState<string>('');
  const [fabricSource, setFabricSource] = React.useState<FabricSource>('CUSTOMER');
  const [fabricColor, setFabricColor] = React.useState<string>('');
  const [fabricBrand, setFabricBrand] = React.useState<string>('');
  const [fabricNotes, setFabricNotes] = React.useState<string>('');

  // ── Garment Catalog Rates & Urgent Rush State ──────────────────────────
  const [garmentRates, setGarmentRates] = React.useState<GarmentRate[]>([]);
  const [isUrgent, setIsUrgent] = React.useState<boolean>(false);

  // ── Measurements & styles ─────────────────────────────────────────────
  const [measurements, setMeasurements] = React.useState<ShalwarKameezMeasurements>(DEFAULT_MEASUREMENTS);
  const [stylePreferences, setStylePreferences] = React.useState<StylePreferences>(DEFAULT_STYLES);

  // ── Mannequin visibility & focus ──────────────────────────────────────
  const [showMannequin, setShowMannequin] = React.useState<boolean>(false);
  const [activeField, setActiveField] = React.useState<keyof ShalwarKameezMeasurements | null>(null);

  // ── Financials ─────────────────────────────────────────────────────────
  const [stitchingRate, setStitchingRate] = React.useState<number>(1800);
  const [fabricCharges, setFabricCharges] = React.useState<number>(0);
  const [addonsCharges, setAddonsCharges] = React.useState<number>(0);
  const [discountAmount, setDiscountAmount] = React.useState<number>(0);
  const [advancePaid, setAdvancePaid] = React.useState<number>(0);

  // ── Staff assignment ──────────────────────────────────────────────────
  const [staffList, setStaffList] = React.useState<ShopMember[]>([]);
  const [assignedCutterId, setAssignedCutterId] = React.useState<string>('');
  const [assignedStitcherId, setAssignedStitcherId] = React.useState<string>('');

  // ── Special notes ──────────────────────────────────────────────────────
  const [specialNotes, setSpecialNotes] = React.useState<string>('');

  // ── Modals & Draft status ─────────────────────────────────────────────
  const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState<boolean>(false);
  const [isThermalModalOpen, setIsThermalModalOpen] = React.useState<boolean>(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = React.useState<boolean>(false);
  const [quotaDetails, setQuotaDetails] = React.useState<{
    currentCount: number;
    maxLimit: number;
    tier: PlanTier;
    reason?: string;
  } | null>(null);
  const [isCheckingQuota, setIsCheckingQuota] = React.useState<boolean>(false);
  const [currentShop, setCurrentShop] = React.useState<Shop>(mockShop);
  const [printerSettings, setPrinterSettings] = React.useState<PrinterSettings>({
    id: 'ps-mock-default',
    shop_id: mockShop.id,
    ...DEFAULT_PRINTER_SETTINGS,
  });
  const [newBookedOrder, setNewBookedOrder] = React.useState<GarmentOrder | null>(null);
  const [newBookedCustomer, setNewBookedCustomer] = React.useState<Customer | null>(null);
  const [draftSavedToast, setDraftSavedToast] = React.useState<boolean>(false);
  const [orderBookedToast, setOrderBookedToast] = React.useState<boolean>(false);
  const [showMobileAdmin, setShowMobileAdmin] = React.useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Load workshop staff, catalog rates & printer settings dynamically
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    let isMounted = true;
    async function loadWorkshopStaffAndRates() {
      try {
        const loadedShop = await shopsDb.getCurrentShop();
        const activeShop = loadedShop || mockShop;
        if (isMounted) setCurrentShop(activeShop);

        const [members, rates, pSettings] = await Promise.all([
          staffDb.getByShopId(activeShop.id),
          ratesDb.getByShopId(activeShop.id),
          printerDb.getByShopId(activeShop.id),
        ]);

        if (isMounted) {
          if (members && members.length > 0) {
            setStaffList(members);
          }
          if (rates && rates.length > 0) {
            setGarmentRates(rates);
            const defaultRate = rates.find((r) => r.garment_type === 'MEN_SHALWAR_KAMEEZ') || rates[0];
            if (defaultRate) {
              setStitchingRate(defaultRate.base_stitching_rate);
              setDeliveryDate((prev) => prev || getFutureDateString(defaultRate.standard_delivery_days));
            }
          }
          if (pSettings) {
            setPrinterSettings(pSettings);
          }
        }
      } catch (err) {
        console.warn('Failed to load workshop staff, rates, or printer settings for order booking:', err);
      }
    }
    loadWorkshopStaffAndRates();
    return () => {
      isMounted = false;
    };
  }, []);

  // --------------------------------------------------------------------------
  // Customer auto-lookup: fires when phone reaches 10–11 digits
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    let isMounted = true;
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
      async function lookupCustomer() {
        try {
          const match = await customersDb.getByPhone(phone, currentShop.id);
          if (!isMounted) return;
          if (match) {
            setFoundCustomer(match);
            setCustomerName(match.full_name);
            setCustomerAddress(match.address ?? '');

            const profiles = await measurementsDb.getByCustomerId(match.id);
            if (!isMounted) return;
            const defaultProfile = profiles.find((p) => p.is_default) || profiles[0] || null;

            if (defaultProfile) {
              setFoundProfile(defaultProfile);
              setMeasurements(defaultProfile.measurements);
              setStylePreferences(defaultProfile.style_preferences);
              setIsProfileLocked(true);
            }
          } else {
            setFoundCustomer(null);
            setFoundProfile(null);
            setIsProfileLocked(false);
          }
        } catch (err) {
          console.warn('Customer lookup error:', err);
        }
      }
      lookupCustomer();
    } else {
      if (digits.length < 10) {
        setFoundCustomer(null);
        setFoundProfile(null);
        setIsProfileLocked(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [phone, currentShop.id]);

  // --------------------------------------------------------------------------
  // Active Garment Rate & Surcharge Derivations
  // --------------------------------------------------------------------------
  const activeGarmentRate = React.useMemo(() => {
    return garmentRates.find((r) => r.garment_type === garmentType);
  }, [garmentRates, garmentType]);

  const urgentSurcharge = isUrgent && activeGarmentRate ? activeGarmentRate.urgent_surcharge * quantity : 0;
  const effectiveAddonsCharges = addonsCharges + urgentSurcharge;

  // --------------------------------------------------------------------------
  // Real-time financial derivation (memoised)
  // --------------------------------------------------------------------------
  const financials = React.useMemo(
    () =>
      calculateOrderFinancials({
        stitching_rate: stitchingRate,
        quantity:       quantity,
        fabric_charges: fabricCharges,
        addons_charges: effectiveAddonsCharges,
        discount_amount: discountAmount,
        advance_paid:   advancePaid,
      }),
    [stitchingRate, quantity, fabricCharges, effectiveAddonsCharges, discountAmount, advancePaid]
  );

  const handleGarmentTypeChange = (newType: GarmentType) => {
    setGarmentType(newType);
    const rate = garmentRates.find((r) => r.garment_type === newType);
    if (rate) {
      setStitchingRate(rate.base_stitching_rate);
      const days = isUrgent ? rate.urgent_delivery_days : rate.standard_delivery_days;
      setDeliveryDate(getFutureDateString(days));
    }
  };

  const handleToggleUrgent = (newUrgentState: boolean) => {
    setIsUrgent(newUrgentState);
    const rate = garmentRates.find((r) => r.garment_type === garmentType);
    if (rate) {
      const days = newUrgentState ? rate.urgent_delivery_days : rate.standard_delivery_days;
      setDeliveryDate(getFutureDateString(days));
    }
  };

  // Credit balance when advance exceeds total (overpayment)
  const isOverpayment = advancePaid > financials.total_amount && financials.total_amount > 0;
  const creditBalance = isOverpayment ? advancePaid - financials.total_amount : 0;

  // Selected Garment Info
  const selectedGarmentOption = GARMENT_TYPE_OPTIONS.find((g) => g.value === garmentType) || GARMENT_TYPE_OPTIONS[0];

  // Selected Staff Info (Dynamic from staffDb with mock fallback)
  const cuttingMasters = React.useMemo<ShopMember[]>(() => {
    if (staffList.length > 0) {
      const filtered = staffList.filter(
        (s) => s.role === 'CUTTING_MASTER' || s.role === 'OWNER' || s.role === 'MANAGER'
      );
      return filtered.length > 0 ? filtered : staffList;
    }
    return [];
  }, [staffList]);

  const stitchers = React.useMemo<ShopMember[]>(() => {
    if (staffList.length > 0) {
      const filtered = staffList.filter(
        (s) => s.role === 'STITCHER' || s.role === 'OWNER' || s.role === 'MANAGER'
      );
      return filtered.length > 0 ? filtered : staffList;
    }
    return [];
  }, [staffList]);

  const selectedCutter = cuttingMasters.find((s) => s.id === assignedCutterId);
  const selectedStitcher = stitchers.find((s) => s.id === assignedStitcherId);

  // Form validity
  const isFormValidToBook = Boolean(customerName.trim() && deliveryDate);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleMeasurementChange = (
    key: keyof ShalwarKameezMeasurements,
    value: number
  ) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const handleStyleChange = <K extends keyof StylePreferences>(
    key: K,
    value: StylePreferences[K]
  ) => {
    setStylePreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateFreshRevision = () => {
    setIsProfileLocked(false);
    setFoundProfile(null);
  };

  const handleResetForm = () => {
    setPhone('');
    setFoundCustomer(null);
    setFoundProfile(null);
    setIsProfileLocked(false);
    setCustomerName('');
    setCustomerAddress('');
    setGarmentType('MEN_SHALWAR_KAMEEZ');
    setQuantity(1);
    setIsUrgent(false);
    const defaultRate = garmentRates.find((r) => r.garment_type === 'MEN_SHALWAR_KAMEEZ');
    if (defaultRate) {
      setStitchingRate(defaultRate.base_stitching_rate);
      setDeliveryDate(getFutureDateString(defaultRate.standard_delivery_days));
    } else {
      setStitchingRate(1800);
      setDeliveryDate(getFutureDateString(7));
    }
    setTrialDate('');
    setFabricSource('CUSTOMER');
    setFabricColor('');
    setFabricBrand('');
    setFabricNotes('');
    setMeasurements(DEFAULT_MEASUREMENTS);
    setStylePreferences(DEFAULT_STYLES);
    setFabricCharges(0);
    setAddonsCharges(0);
    setDiscountAmount(0);
    setAdvancePaid(0);
    setAssignedCutterId('');
    setAssignedStitcherId('');
    setSpecialNotes('');
    setActiveField(null);
    setActiveTab('customer');
  };

  const handleSaveDraft = () => {
    setDraftSavedToast(true);
    setTimeout(() => {
      setDraftSavedToast(false);
    }, 3000);
  };

  const handleBookOrder = async () => {
    if (!customerName.trim() || !deliveryDate) return;

    // ── Pre-flight Subscription Quota Check ─────────────────────────────────
    setIsCheckingQuota(true);
    try {
      const quotaCheck = await subscriptionDb.checkOrderAllowed(currentShop.id);
      if (!quotaCheck.allowed) {
        setQuotaDetails({
          currentCount: quotaCheck.currentCount,
          maxLimit: quotaCheck.maxLimit,
          tier: quotaCheck.tier,
          reason: quotaCheck.reason || 'Monthly order quota reached (50/50). Upgrade to Pro for unlimited suits.',
        });
        setIsQuotaModalOpen(true);
        return;
      }
    } catch (err) {
      console.warn('Subscription quota check error, continuing gracefully:', err);
    } finally {
      setIsCheckingQuota(false);
    }

    // 1. Generate stable client UUIDs for offline entity integrity
    const customerId = foundCustomer?.id || crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const profileId = foundProfile?.id || crypto.randomUUID();
    const trackingKey = crypto.randomUUID();
    const khataTxId = crypto.randomUUID();

    // 2. Offline-safe human order number: ORD-YYMM-XXXX
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    const orderNum = `ORD-${yy}${mm}-${rnd}`;

    const effectiveCust: Customer = foundCustomer || {
      id: customerId,
      shop_id: currentShop.id,
      full_name: customerName.trim(),
      phone: phone.trim() || '03001234567',
      alternate_phone: null,
      address: customerAddress.trim() || null,
      city: 'Wah Cantt',
      notes: specialNotes || null,
      total_orders_count: 1,
      total_spent: financials.total_amount,
      current_khata_balance: financials.balance_due,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newOrder: GarmentOrder = {
      id: orderId,
      order_number: orderNum,
      shop_id: currentShop.id,
      customer_id: effectiveCust.id,
      measurement_profile_id: profileId,
      status: 'BOOKED',
      garment_type: garmentType,
      quantity,
      booking_date: new Date().toISOString(),
      trial_date: trialDate || null,
      delivery_date: deliveryDate,
      actual_delivery_date: null,
      fabric_provided_by: fabricSource,
      fabric_color: fabricColor || null,
      fabric_brand: fabricBrand || null,
      fabric_pieces_count: 1,
      fabric_notes: fabricNotes || null,
      stitching_rate: stitchingRate,
      fabric_charges: fabricCharges,
      addons_charges: effectiveAddonsCharges,
      discount_amount: discountAmount,
      total_amount: financials.total_amount,
      advance_paid: financials.advance_paid,
      balance_due: financials.balance_due,
      payment_status: financials.payment_status,
      assigned_cutter_id: assignedCutterId || null,
      assigned_stitcher_id: assignedStitcherId || null,
      snapshot_measurements: measurements,
      snapshot_styles: stylePreferences,
      barcode_token: `BC-${orderNum}`,
      public_tracking_key: trackingKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const measurementProfile: MeasurementProfile = {
      id: profileId,
      shop_id: currentShop.id,
      customer_id: effectiveCust.id,
      profile_name: `${customerName.trim()} - Standard Fit`,
      garment_type: garmentType,
      measurements,
      style_preferences: stylePreferences,
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Atomic Dexie transaction across all workshop stores
    await db.transaction('rw', [db.orders, db.customers, db.khata_transactions, db.measurements], async () => {
      await db.customers.put({
        ...effectiveCust,
        sync_status: 'pending',
        sync_retry_count: 0,
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      });

      await db.orders.put({
        ...newOrder,
        order_number: orderNum,
        sync_status: 'pending',
        sync_retry_count: 0,
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      });

      await db.measurements.put({
        ...measurementProfile,
        sync_status: 'pending',
        sync_retry_count: 0,
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      });

      if (financials.advance_paid > 0) {
        await db.khata_transactions.put({
          id: khataTxId,
          shop_id: currentShop.id,
          customer_id: effectiveCust.id,
          order_id: orderId,
          transaction_type: 'ORDER_ADVANCE',
          amount: financials.advance_paid,
          balance_after: financials.balance_due,
          notes: `Advance payment for Order ${orderNum}`,
          created_by: null,
          created_at: new Date().toISOString(),
          sync_status: 'pending',
          sync_retry_count: 0,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        });
      }
    });

    // 4. Do NOT await remote Supabase network calls - non-blocking quota update
    subscriptionDb.incrementUsage(currentShop.id).catch(console.error);

    setNewBookedOrder(newOrder);
    setNewBookedCustomer(effectiveCust);

    // 5. Immediately open the thermal receipt modal
    if (printerSettings.auto_print_on_booking) {
      setIsThermalModalOpen(true);
    } else {
      setIsReceiptModalOpen(true);
    }

    // 6. Show bilingual confirmation toast
    setOrderBookedToast(true);
    setTimeout(() => {
      setOrderBookedToast(false);
    }, 4000);

    // 7. Fire background sync runner non-blockingly
    syncEngine.processQueue().catch(console.error);

    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const isSubmitting = isCheckingQuota;
  const handleCreateOrder = (_skipPrint?: boolean) => {
    handleBookOrder();
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <AppShell activeRoute="/orders/new">
      <div className="max-w-7xl mx-auto">
        {/* Floating Single-Language Booking Success Toast */}
        {orderBookedToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-16 md:top-20 right-4 md:right-8 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-xl px-4 py-3 text-xs text-foreground shadow-lg animate-in fade-in slide-in-from-top-2"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col">
              <span className={cn("font-bold text-sm leading-relaxed", isUrdu ? "font-urdu-serif" : "font-sans")}>
                {t.suitBookedSuccess}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t.suitBookedSub}
              </span>
            </div>
          </div>
        )}
        
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="hidden md:flex mb-6 flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className={cn("text-2xl font-bold tracking-tight text-foreground", isUrdu ? "font-urdu-serif text-3xl" : "font-sans")}>
                {t.pageTitle}
              </h1>
              <Badge variant="status-booked" className="text-xs font-medium">
                {t.draftMode}
              </Badge>
              {draftSavedToast && (
                <span className="flex items-center gap-1 text-xs text-status-ready font-medium animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t.draftSaved}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.pageSubtitle}
            </p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* MOBILE 3-STEP WIZARD (md:hidden)                                 */}
        {/* ================================================================ */}
        <div className="block md:hidden space-y-4 pb-44 pb-safe">
          {/* Step Progress Pills Header */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-card rounded-xl border border-border shadow-xs">
            {[
              { step: 1, label: t.stepCustomer },
              { step: 2, label: t.stepStyle },
              { step: 3, label: t.stepMatrix },
            ].map((s) => {
              const isCurrent = mobileStep === s.step;
              const isPast = mobileStep > s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  data-testid={`mobile-step-${s.step}`}
                  onClick={() => setMobileStep(s.step as 1 | 2 | 3)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-all border',
                    isCurrent
                      ? 'bg-primary/15 text-primary border-primary/40 shadow-xs font-semibold'
                      : isPast
                      ? 'bg-card-elevated text-emerald-600 dark:text-emerald-400 border-border/40'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  )}
                >
                  <span className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-mono font-bold shrink-0",
                    isCurrent ? "bg-primary text-primary-foreground" : isPast ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>
                    <bdi>{s.step}</bdi>
                  </span>
                  <span className={cn('text-xs font-medium truncate', isUrdu ? 'font-urdu-sans text-[11px]' : 'font-sans')}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ============================================================== */}
          {/* STEP 1: CUSTOMER & SUIT DETAILS                                */}
          {/* ============================================================== */}
          {mobileStep === 1 && (
            <div className="space-y-4 pb-44 pb-safe">
              {/* Unified Single Surface Card */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
                {/* 1. Customer Intake & Smart Collapsible Address */}
                <div className="space-y-3 border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider", isUrdu && "font-urdu-sans")}>
                      {t.customerIntakeHeader}
                    </span>
                    {foundProfile && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {t.matchedProfile}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className={cn("text-xs text-foreground font-medium", isUrdu && "font-urdu-sans")}>
                      {t.phoneLabel}
                    </label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      placeholder={t.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(formatPakistaniPhone(e.target.value))}
                      leftIcon={<Phone className="h-4 w-4 text-primary" />}
                      className="h-10 text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={cn("text-xs text-foreground font-medium", isUrdu && "font-urdu-sans")}>
                      {t.customerNameLabel} *
                    </label>
                    <Input
                      type="text"
                      placeholder={t.customerNamePlaceholder}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      leftIcon={<User className="h-4 w-4 text-primary" />}
                      className="h-10 text-sm"
                    />
                  </div>

                  {/* Smart Collapsible Address & Notes Button */}
                  <button
                    type="button"
                    onClick={() => setShowAddressNotes(!showAddressNotes)}
                    className={cn(
                      'w-full min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer',
                      customerAddress.trim()
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-border bg-card-elevated hover:bg-card text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className={cn('h-3.5 w-3.5 shrink-0', customerAddress.trim() ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary')} />
                      {customerAddress.trim() ? (
                        <span className="truncate text-[11px]">
                          ✓ {t.addressSaved} <span className="font-semibold text-foreground">{customerAddress}</span> - {t.tapToChange}
                        </span>
                      ) : (
                        <span className="truncate text-[11px]">
                          {showAddressNotes ? t.hideAddressNotes : t.showAddressNotes}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', showAddressNotes && 'rotate-180')} />
                  </button>

                  {/* Collapsible Address & Notes Fields */}
                  {showAddressNotes && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1">
                        <label className={cn("text-[11px] text-muted-foreground font-medium", isUrdu && "font-urdu-sans")}>
                          {t.customerAddressLabel}
                        </label>
                        <Input
                          type="text"
                          placeholder={t.customerAddressPlaceholder}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          leftIcon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                          className="h-10 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={cn("text-[11px] text-muted-foreground font-medium", isUrdu && "font-urdu-sans")}>
                          {t.specialNotesLabel}
                        </label>
                        <Input
                          type="text"
                          placeholder={t.specialNotesPlaceholder}
                          value={specialNotes}
                          onChange={(e) => setSpecialNotes(e.target.value)}
                          leftIcon={<FileText className="h-4 w-4 text-muted-foreground" />}
                          className="h-10 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Sleek Garment Selection Chips & Quantity */}
                <div className="space-y-3 border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider", isUrdu && "font-urdu-sans")}>
                      {t.garmentTypeLabel}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {isUrdu ? selectedGarmentOption.ur : selectedGarmentOption.en}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {GARMENT_TYPE_OPTIONS.map((g) => {
                      const isSelected = garmentType === g.value;
                      const displayName = isUrdu ? g.ur : g.en;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => handleGarmentTypeChange(g.value)}
                          className={cn(
                            'h-auto min-h-11 px-3 rounded-xl border transition-all duration-200 flex items-center justify-center text-center py-2 cursor-pointer active:scale-98',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                              : 'bg-card-elevated border-border text-foreground hover:bg-card'
                          )}
                        >
                          <span className={cn("text-xs font-semibold truncate", isUrdu ? "font-urdu-sans" : "font-sans")}>
                            {isSelected && <span className="mr-1">✓</span>}
                            {displayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Suit Quantity Stepper */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className={cn("text-xs font-semibold text-foreground block", isUrdu && "font-urdu-sans")}>
                        {t.quantityLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{t.totalSuits}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="h-9 w-9 rounded-lg bg-card-elevated border border-border text-foreground font-bold text-base flex items-center justify-center active:scale-95 transition-all hover:bg-card"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="font-mono text-base font-bold text-primary w-7 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-9 w-9 rounded-lg bg-card-elevated border border-border text-foreground font-bold text-base flex items-center justify-center active:scale-95 transition-all hover:bg-card"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Turnaround Date & Fast-Track Side-by-Side Row */}
                <div className="border-b border-border/50 pb-4">
                  <div className="grid grid-cols-2 gap-2.5 items-end">
                    <div className="space-y-1.5">
                      <label className={cn("text-xs text-foreground font-medium block", isUrdu && "font-urdu-sans")}>
                        {t.deliveryDateLabel} *
                      </label>
                      <Input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="h-11 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className={cn("text-foreground font-medium", isUrdu && "font-urdu-sans")}>{t.urgentRushOrder}</label>
                        {isUrgent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {t.urgentActive}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleUrgent(!isUrgent)}
                        className={cn(
                          'w-full h-11 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 active:scale-98 cursor-pointer',
                          isUrgent
                            ? 'border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-xs'
                            : 'border-border bg-card-elevated text-muted-foreground hover:text-foreground hover:bg-card'
                        )}
                      >
                        <Zap className={cn('h-4 w-4', isUrgent ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
                        <span className="truncate">
                          {isUrgent ? t.urgentEnabledBtn : t.enableUrgent}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Fabric Details & Source Segmented Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider", isUrdu && "font-urdu-sans")}>
                      {t.fabricSectionTitle}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {fabricSource === 'CUSTOMER' ? t.fabricSourceCustomer : t.fabricSourceShop}
                    </span>
                  </div>

                  {/* Two-way Source Pills */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFabricSource('CUSTOMER')}
                      className={cn(
                        'h-auto min-h-11 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center text-center py-2 active:scale-98 cursor-pointer',
                        fabricSource === 'CUSTOMER'
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'bg-card-elevated border-border text-foreground hover:bg-card'
                      )}
                    >
                      <span className={cn("text-xs font-semibold truncate", isUrdu && "font-urdu-sans")}>
                        {fabricSource === 'CUSTOMER' && <span className="mr-1">✓</span>}
                        {t.fabricSourceCustomer}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFabricSource('SHOP')}
                      className={cn(
                        'h-auto min-h-11 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center text-center py-2 active:scale-98 cursor-pointer',
                        fabricSource === 'SHOP'
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'bg-card-elevated border-border text-foreground hover:bg-card'
                      )}
                    >
                      <span className={cn("text-xs font-semibold truncate", isUrdu && "font-urdu-sans")}>
                        {fabricSource === 'SHOP' && <span className="mr-1">✓</span>}
                        {t.fabricSourceShop}
                      </span>
                    </button>
                  </div>

                  {/* Color & Brand Inputs */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className={cn("text-[11px] text-muted-foreground font-medium", isUrdu && "font-urdu-sans")}>{t.fabricColorLabel}</label>
                      <Input
                        type="text"
                        placeholder={t.fabricColorPlaceholder}
                        value={fabricColor}
                        onChange={(e) => setFabricColor(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={cn("text-[11px] text-muted-foreground font-medium", isUrdu && "font-urdu-sans")}>{t.fabricBrandLabel}</label>
                      <Input
                        type="text"
                        placeholder={t.fabricBrandPlaceholder}
                        value={fabricBrand}
                        onChange={(e) => setFabricBrand(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Inline Advancement CTA */}
              <Button
                type="button"
                disabled={!customerName.trim()}
                onClick={() => {
                  if (!customerName.trim()) return;
                  setMobileStep(2);
                  document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  'w-full h-12 font-bold text-sm flex items-center justify-center gap-2 rounded-xl transition-all shadow-md',
                  !customerName.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                )}
              >
                <span>
                  {!customerName.trim() ? t.enterCustomerNameNotice : t.nextStyleStep}
                </span>
                {customerName.trim() && (
                  dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />
                )}
              </Button>

              <div className="h-32 w-full shrink-0" aria-hidden="true" />
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: STYLE & PREFERENCES                                    */}
          {/* ============================================================== */}
          {mobileStep === 2 && (
            <div className="space-y-4 pb-44 pb-safe">
              {/* Unified Single Surface Card */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
                {/* 1. Collar Cut Selection */}
                <div className="space-y-2.5 border-b border-border/50 pb-3.5">
                  <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider block", isUrdu && "font-urdu-sans")}>
                    {t.collarCutTitle}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'FULL_BAN', labelUrdu: 'مکمل بین', label: 'Full Ban' },
                      { id: 'HALF_BAN', labelUrdu: 'ہاف بین', label: 'Half Ban' },
                      { id: 'SHERWANI_COLLAR', labelUrdu: 'شیروانی کالر', label: 'Sherwani' },
                      { id: 'SHIRT_COLLAR', labelUrdu: 'شرٹ کالر', label: 'Shirt Collar' },
                      { id: 'SOFT_BAN', labelUrdu: 'سافٹ بین', label: 'Soft Ban' },
                    ].map((item, idx) => {
                      const isSelected = stylePreferences.collar_style === item.id;
                      const displayLabel = isUrdu ? item.labelUrdu : item.label;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleStyleChange('collar_style', item.id as any)}
                          className={cn(
                            'h-auto min-h-11 px-3 py-2 rounded-xl border flex items-center justify-center text-center cursor-pointer transition-all',
                            idx === 4 ? 'col-span-2' : '',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                              : 'bg-card-elevated border-border text-foreground hover:bg-card'
                          )}
                        >
                          <span className={cn("text-xs font-semibold truncate", isUrdu ? "font-urdu-sans" : "font-sans")}>
                            {isSelected && <span className="mr-1.5">✓</span>}
                            {displayLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Daman Cut Selection */}
                <div className="space-y-2.5 border-b border-border/50 pb-3.5">
                  <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider block", isUrdu && "font-urdu-sans")}>
                    {t.damanCutTitle}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'CHORAS_DAMAN', labelUrdu: 'چورس دامن', label: 'Square Daman' },
                      { id: 'GOOL_DAMAN', labelUrdu: 'گول دامن', label: 'Round Daman' },
                    ].map((item) => {
                      const isSelected = stylePreferences.daman_style === item.id;
                      const displayLabel = isUrdu ? item.labelUrdu : item.label;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleStyleChange('daman_style', item.id as any)}
                          className={cn(
                            'h-auto min-h-11 px-3 py-2 rounded-xl border flex items-center justify-center text-center cursor-pointer transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                              : 'bg-card-elevated border-border text-foreground hover:bg-card'
                          )}
                        >
                          <span className={cn("text-xs font-semibold truncate", isUrdu ? "font-urdu-sans" : "font-sans")}>
                            {isSelected && <span className="mr-1.5">✓</span>}
                            {displayLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Pocket Configurations (Multi-Select) */}
                <div className="space-y-2.5 border-b border-border/50 pb-3.5">
                  <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider block", isUrdu && "font-urdu-sans")}>
                    {t.pocketsTitle} {t.pocketsMultiSelect}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'FRONT_CHEST', labelUrdu: 'سامنے والی جیب', label: 'Front Chest' },
                      { id: 'RIGHT_SIDE', labelUrdu: 'دائیں سائیڈ جیب', label: 'Right Side' },
                      { id: 'LEFT_SIDE', labelUrdu: 'بائیں سائیڈ جیب', label: 'Left Side' },
                      { id: 'MOBILE_INSIDE', labelUrdu: 'اندرونی موبائل جیب', label: 'Mobile Pocket' },
                    ].map((item) => {
                      const isSelected = stylePreferences.pockets?.includes(item.id as any);
                      const displayLabel = isUrdu ? item.labelUrdu : item.label;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            const current = stylePreferences.pockets || [];
                            const next = isSelected
                              ? current.filter((p) => p !== item.id)
                              : [...current, item.id as any];
                            handleStyleChange('pockets', next);
                          }}
                          className={cn(
                            'h-auto min-h-11 px-3 py-2 rounded-xl border flex items-center justify-center text-center cursor-pointer transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                              : 'bg-card-elevated border-border text-foreground hover:bg-card'
                          )}
                        >
                          <span className={cn("text-xs font-semibold truncate", isUrdu ? "font-urdu-sans" : "font-sans")}>
                            {isSelected && <span className="mr-1.5">✓</span>}
                            {displayLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Stitching Type Selection */}
                <div className="space-y-2.5 border-b border-border/50 pb-3.5">
                  <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider block", isUrdu && "font-urdu-sans")}>
                    {t.stitchingTypeTitle}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'DOUBLE_SILAI', labelUrdu: 'ڈبل سلائی (مضبوط)', label: 'Double Stitch' },
                      { id: 'SINGLE_SILAI', labelUrdu: 'سنگل سلائی (کلاسک)', label: 'Single Stitch' },
                    ].map((item) => {
                      const isSelected = stylePreferences.stitch_type === item.id;
                      const displayLabel = isUrdu ? item.labelUrdu : item.label;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleStyleChange('stitch_type', item.id as any)}
                          className={cn(
                            'h-auto min-h-11 px-3 py-2 rounded-xl border flex items-center justify-center text-center cursor-pointer transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                              : 'bg-card-elevated border-border text-foreground hover:bg-card'
                          )}
                        >
                          <span className={cn("text-xs font-semibold truncate", isUrdu ? "font-urdu-sans" : "font-sans")}>
                            {isSelected && <span className="mr-1.5">✓</span>}
                            {displayLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Front Patti Selection */}
                <div className="space-y-2.5">
                  <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider block", isUrdu && "font-urdu-sans")}>
                    {t.frontPattiTitle}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'GUM_PATTI', labelUrdu: 'گم پٹی', label: 'Hidden' },
                      { id: 'OPEN_PATTI', labelUrdu: 'اوپن پٹی', label: 'Open Button' },
                    ].map((item) => {
                      const isSelected = stylePreferences.front_patti === item.id;
                      const displayLabel = isUrdu ? item.labelUrdu : item.label;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleStyleChange('front_patti', item.id as any)}
                          className={cn(
                            'h-auto min-h-11 px-3 py-2 rounded-xl border flex items-center justify-center text-center cursor-pointer transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                              : 'bg-card-elevated border-border text-foreground hover:bg-card'
                          )}
                        >
                          <span className={cn("text-xs font-semibold truncate", isUrdu ? "font-urdu-sans" : "font-sans")}>
                            {isSelected && <span className="mr-1.5">✓</span>}
                            {displayLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Physical Bottom Spacer to prevent docked bar overlap */}
              <div className="h-32 w-full shrink-0" aria-hidden="true" />
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: MEASUREMENT MATRIX & FINAL LEDGER                      */}
          {/* ============================================================== */}
          {mobileStep === 3 && (
            <div className="space-y-4 pb-44 pb-safe">
              {/* Unified Measurement Matrix Surface */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
                {/* Surface Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className={cn("text-xs font-bold text-foreground uppercase tracking-wider", isUrdu && "font-urdu-sans")}>
                      {t.matrixTitle}
                    </h3>
                    <p className={cn("text-[10px] text-muted-foreground", isUrdu && "font-urdu-sans")}>
                      {t.matrixSubtitle}
                    </p>
                  </div>
                  <Ruler className="h-5 w-5 text-primary shrink-0" />
                </div>

                {/* Single-Surface Full-Width Measurement Rows */}
                <div className="space-y-3.5">
                  {MOBILE_MEASUREMENT_FIELDS.map((field, idx) => {
                    const val = measurements[field.key] ?? field.defaultVal;
                    const base = Math.max(1, Math.floor(val));
                    const currentFrac = Math.round((val - Math.floor(val)) * 100) / 100;
                    const displayFieldLabel = isUrdu ? field.ur : field.en;

                    return (
                      <div
                        key={field.key}
                        className={cn(
                          'space-y-2',
                          idx < MOBILE_MEASUREMENT_FIELDS.length - 1 && 'border-b border-border/40 pb-3.5'
                        )}
                      >
                        {/* Row Header: Single-language label + formatted live badge */}
                        <div className="flex items-center justify-between">
                          <span className={cn("text-xs font-semibold text-foreground uppercase tracking-wide", isUrdu && "font-urdu-sans")}>
                            {displayFieldLabel}
                          </span>
                          <bdi className="font-mono text-primary font-bold text-xs bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
                            {formatMeasurementDisplay(val)}
                          </bdi>
                        </div>

                        {/* Controls Bar layout (strictly sized for 360px viewports) */}
                        <div className="flex items-center gap-1 w-full">
                          {/* Whole Steppers: [-1], numeric input, [+1] */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const newBase = Math.max(1, base - 1);
                                const newVal = Math.round((newBase + currentFrac) * 100) / 100;
                                handleMeasurementChange(field.key, newVal);
                              }}
                              className="h-11 w-9 text-sm font-bold bg-card-elevated border border-border rounded-xl active:scale-95 text-foreground hover:bg-card flex items-center justify-center select-none cursor-pointer"
                              aria-label={`Decrease ${displayFieldLabel} by 1 inch`}
                            >
                              -1
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max="120"
                              value={base === 0 ? '' : base}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10);
                                const newBase = isNaN(parsed) || parsed < 1 ? 1 : parsed;
                                const newVal = Math.round((newBase + currentFrac) * 100) / 100;
                                handleMeasurementChange(field.key, newVal);
                              }}
                              placeholder="0"
                              className="h-11 w-12 text-center font-mono font-bold text-primary bg-card border border-input rounded-xl focus:border-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newBase = base + 1;
                                const newVal = Math.round((newBase + currentFrac) * 100) / 100;
                                handleMeasurementChange(field.key, newVal);
                              }}
                              className="h-11 w-9 text-sm font-bold bg-card-elevated border border-border rounded-xl active:scale-95 text-foreground hover:bg-card flex items-center justify-center select-none cursor-pointer"
                              aria-label={`Increase ${displayFieldLabel} by 1 inch`}
                            >
                              +1
                            </button>
                          </div>

                          {/* Spacer divider */}
                          <div className="w-px h-7 bg-border mx-1 shrink-0" aria-hidden="true" />

                          {/* Fraction Pills (0, ¼, ½, ¾) */}
                          <div className="grid grid-cols-4 gap-1 flex-1 min-w-0">
                            {[
                              { label: '0', value: 0.0 },
                              { label: '¼', value: 0.25 },
                              { label: '½', value: 0.5 },
                              { label: '¾', value: 0.75 },
                            ].map((frac) => {
                              const isFracActive = Math.abs(currentFrac - frac.value) < 0.05;
                              return (
                                <button
                                  key={frac.label}
                                  type="button"
                                  onClick={() => {
                                    const newVal = Math.round((base + frac.value) * 100) / 100;
                                    handleMeasurementChange(field.key, newVal);
                                  }}
                                  className={cn(
                                    'h-11 rounded-xl font-mono font-bold text-xs flex items-center justify-center select-none transition-all cursor-pointer',
                                    isFracActive
                                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                      : 'bg-card-elevated border border-border text-foreground hover:bg-card active:scale-95'
                                  )}
                                >
                                  {frac.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible Administration (Staff & Notes) */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowMobileAdmin((prev) => !prev)}
                  className="w-full py-3 px-4 rounded-xl border border-border bg-card hover:bg-card-elevated active:scale-[0.99] text-xs font-semibold text-foreground flex items-center justify-between transition-all cursor-pointer shadow-xs"
                >
                  <span className={cn("text-xs font-semibold", isUrdu && "font-urdu-sans")}>
                    {showMobileAdmin ? t.hideStaffNotes : t.showStaffNotes}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(assignedCutterId || assignedStitcherId || specialNotes.trim()) && (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', showMobileAdmin && 'rotate-180')} />
                  </div>
                </button>

                {showMobileAdmin && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm animate-fade-in">
                    <span className={cn("text-xs font-bold text-foreground uppercase tracking-wider block", isUrdu && "font-urdu-sans")}>
                      {t.staffSectionTitle}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={cn("text-[11px] text-muted-foreground", isUrdu && "font-urdu-sans")}>{t.cutterLabel}</label>
                        <select
                          value={assignedCutterId}
                          onChange={(e) => setAssignedCutterId(e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-card-elevated px-2 text-xs text-foreground focus:border-primary"
                        >
                          <option value="">{t.none}</option>
                          {cuttingMasters.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={cn("text-[11px] text-muted-foreground", isUrdu && "font-urdu-sans")}>{t.stitcherLabel}</label>
                        <select
                          value={assignedStitcherId}
                          onChange={(e) => setAssignedStitcherId(e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-card-elevated px-2 text-xs text-foreground focus:border-primary"
                        >
                          <option value="">{t.none}</option>
                          {stitchers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className={cn("text-xs font-bold text-foreground uppercase tracking-wider block", isUrdu && "font-urdu-sans")}>
                        {t.productionNotesLabel}
                      </label>
                      <textarea
                        rows={2}
                        placeholder={t.productionNotesPlaceholder}
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        className="w-full rounded-lg border border-input bg-card-elevated p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Inline back button to Step 2 */}
              <button
                type="button"
                onClick={() => {
                  setMobileStep(2);
                  document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full h-11 rounded-xl border border-border bg-card-elevated text-foreground text-xs hover:bg-card active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {dir === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                <span className={isUrdu ? "font-urdu-sans text-xs" : ""}>{t.backToStyle}</span>
              </button>

              {/* Physical Bottom Spacer to prevent docked bar overlap */}
              <div className="h-36 w-full shrink-0" aria-hidden="true" />
            </div>
          )}

          {/* ============================================================== */}
          {/* MOBILE STICKY BOTTOM BOOKING BAR                               */}
          {/* ============================================================== */}
          <div className="fixed bottom-0 left-0 right-0 z-30 pb-safe bg-card/95 backdrop-blur-xl border-t border-border p-3 shadow-lg space-y-2">
            {mobileStep === 1 ? (
              <Button
                type="button"
                disabled={!customerName.trim()}
                onClick={() => {
                  if (!customerName.trim()) return;
                  setMobileStep(2);
                  document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  'w-full h-12 font-bold text-sm flex items-center justify-center gap-2 rounded-xl transition-all shadow-md',
                  !customerName.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                )}
              >
                <span>
                  {!customerName.trim() ? t.enterCustomerNameNotice : t.nextStyleStep}
                </span>
                {customerName.trim() && (
                  dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            ) : mobileStep === 2 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setMobileStep(1);
                    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="h-12 px-4 rounded-xl border border-border bg-card-elevated text-foreground hover:bg-card text-xs font-medium active:scale-98"
                >
                  {t.back}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setMobileStep(3);
                    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex-1 h-12 min-h-[48px] px-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-md flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-[0.99]"
                >
                  <span className="text-sm font-bold truncate">{t.nextMeasurementsStep}</span>
                  {dir === 'rtl' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {t.totalPKR}
                    </span>
                    <bdi dir="ltr" className="font-mono text-sm font-bold text-foreground whitespace-nowrap">
                      Rs. {financials.total_amount.toLocaleString()}
                    </bdi>
                  </div>

                  <div className="flex items-center gap-1.5 bg-card-elevated border border-border px-2 py-1 rounded-lg">
                    <span className="text-[11px] text-muted-foreground">{t.advanceShort}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={advancePaid === 0 ? '' : advancePaid}
                      placeholder="0"
                      onChange={(e) => setAdvancePaid(Number(e.target.value) || 0)}
                      className="h-8 w-20 text-center font-mono font-bold text-primary bg-card border border-input rounded-md focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {t.remainingBalance}
                    </span>
                    <bdi dir="ltr" className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      Rs. {financials.balance_due.toLocaleString()}
                    </bdi>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!isFormValidToBook || isSubmitting}
                  isLoading={isSubmitting}
                  onClick={() => handleCreateOrder(false)}
                  className="w-full h-12 min-h-[48px] rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className={cn("text-sm font-bold", isUrdu ? "font-urdu-serif text-base" : "font-sans")}>
                    {isSubmitting
                      ? t.verifyingQuota
                      : !customerName.trim()
                      ? t.enterCustomerNameNotice
                      : t.confirmAndBook}
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Split-Pane Architecture: 12-Column Responsive Layout (DESKTOP) ── */}
        <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ================================================================
              LEFT: TABBED INTAKE STEPPER (lg:col-span-8 - 2/3 WIDTH)
              ================================================================ */}
          <main className="lg:col-span-8">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              defaultValue="customer"
              className="w-full overflow-hidden"
            >
              {/* Stepper Tab Navigation Headers */}
              <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-2 bg-card-elevated p-1 sm:p-1.5 rounded-xl border border-border h-auto mb-6 shadow-xs">
                
                {/* Tab 1 Trigger */}
                <TabsTrigger
                  value="customer"
                  data-testid="desktop-tab-customer"
                  className="flex items-center justify-center gap-2 py-2 sm:py-2.5 px-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs border border-transparent transition-all min-w-0"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-mono font-bold bg-primary/15 text-primary data-[state=active]:bg-black/20 data-[state=active]:text-primary-foreground shrink-0">
                    <bdi>1</bdi>
                  </span>
                  <span className={cn("text-xs sm:text-sm font-semibold truncate", isUrdu && "font-urdu-sans text-xs")}>
                    {t.tabCustomer}
                  </span>
                </TabsTrigger>

                {/* Tab 2 Trigger */}
                <TabsTrigger
                  value="measurements"
                  data-testid="desktop-tab-measurements"
                  className="flex items-center justify-center gap-2 py-2 sm:py-2.5 px-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs border border-transparent transition-all min-w-0"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-mono font-bold bg-primary/15 text-primary data-[state=active]:bg-black/20 data-[state=active]:text-primary-foreground shrink-0">
                    <bdi>2</bdi>
                  </span>
                  <span className={cn("text-xs sm:text-sm font-semibold truncate", isUrdu && "font-urdu-sans text-xs")}>
                    {t.tabMeasurements}
                  </span>
                </TabsTrigger>

                {/* Tab 3 Trigger */}
                <TabsTrigger
                  value="billing"
                  data-testid="desktop-tab-billing"
                  className="flex items-center justify-center gap-2 py-2 sm:py-2.5 px-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs border border-transparent transition-all min-w-0"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-mono font-bold bg-primary/15 text-primary data-[state=active]:bg-black/20 data-[state=active]:text-primary-foreground shrink-0">
                    <bdi>3</bdi>
                  </span>
                  <span className={cn("text-xs sm:text-sm font-semibold truncate", isUrdu && "font-urdu-sans text-xs")}>
                    {t.tabBilling}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* ================================================================
                  TAB 1: CUSTOMER & FABRIC DETAILS
                  ================================================================ */}
              <TabsContent value="customer" className="mt-0 flex flex-col gap-6">
                
                {/* Section 1: Customer Profile & Phone Lookup */}
                <SectionCard
                  title={t.customerSectionTitle}
                  icon={<User className="h-4 w-4" />}
                >
                  <div className="flex flex-col gap-4">
                    {/* Phone input with auto-lookup */}
                    <div className="flex flex-col gap-2">
                      <Input
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        label={t.phoneLabel}
                        placeholder={t.phonePlaceholder}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        leftIcon={<Phone className="h-4 w-4 text-primary" />}
                        hint={t.phoneHint}
                      />

                      {/* Profile Matched Badge */}
                      {foundCustomer && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-ready/30 bg-status-ready/10 p-3.5">
                          <div className="flex items-center gap-3">
                            <BadgeCheck className="h-5 w-5 shrink-0 text-status-ready" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-status-ready">
                                {t.matchedCustomerFull}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {foundCustomer.full_name} ·{' '}
                                <bdi dir="ltr">{formatPakistaniPhone(foundCustomer.phone)}</bdi>
                                {foundProfile && (
                                  <> · {t.profileLabel} <span className="font-semibold text-foreground">{foundProfile.profile_name}</span></>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {foundCustomer.current_khata_balance > 0 && (
                              <Badge variant="status-overdue" className="text-[0.65rem]">
                                <bdi dir="ltr">{t.khataUdhaar} Rs. {foundCustomer.current_khata_balance.toLocaleString()}</bdi>
                              </Badge>
                            )}
                            {foundCustomer.current_khata_balance < 0 && (
                              <Badge variant="status-ready" className="text-[0.65rem]">
                                <bdi dir="ltr">{t.khataCredit} Rs. {Math.abs(foundCustomer.current_khata_balance).toLocaleString()}</bdi>
                              </Badge>
                            )}
                            {foundCustomer.current_khata_balance === 0 && (
                              <Badge variant="default" className="text-[0.65rem]">
                                {t.khataSettled}
                              </Badge>
                            )}

                            {isProfileLocked && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCreateFreshRevision}
                                className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                <RefreshCw className="h-3 w-3" />
                                {t.unlockMeasurements}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Unknown number indicator */}
                      {!foundCustomer && phone.replace(/\D/g, '').length >= 10 && (
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-card-elevated px-3.5 py-2.5">
                          <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            {t.newCustomerNote}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name & Address Inputs */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label={`${t.customerNameLabel} *`}
                        placeholder={t.customerNamePlaceholder}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        leftIcon={<User className="h-4 w-4 text-primary" />}
                        required
                      />
                      <Input
                        label={t.customerAddressLabel}
                        placeholder={t.customerAddressPlaceholder}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        leftIcon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Section 2: Garment & Fabric Specifications */}
                <SectionCard
                  title={t.garmentSectionTitle}
                  icon={<Scissors className="h-4 w-4" />}
                >
                  <div className="flex flex-col gap-5">
                    {/* Garment Type & Quantity */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground", isUrdu && "font-urdu-sans")}>
                          {t.garmentTypeLabel}
                        </label>
                        <div className="relative">
                          <select
                            value={garmentType}
                            onChange={(e) => handleGarmentTypeChange(e.target.value as GarmentType)}
                            className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-sm font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          >
                            {GARMENT_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {isUrdu ? opt.ur : opt.en}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground", isUrdu && "font-urdu-sans")}>
                          {t.quantityLabel}
                        </label>
                        <bdi dir="ltr" className="inline-flex w-full">
                          <input
                            type="number"
                            dir="ltr"
                            inputMode="numeric"
                            min={1}
                            max={20}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-center font-mono text-sm font-bold text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          />
                        </bdi>
                      </div>
                    </div>

                    {/* Urgent Rush Order Dynamic Toggle Pill */}
                    <div className={cn(
                      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all',
                      isUrgent
                        ? 'border-status-stitching/50 bg-status-stitching/10 shadow-xs ring-1 ring-status-stitching/30'
                        : 'border-border/70 bg-card-elevated/60'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all',
                          isUrgent
                            ? 'border-status-stitching/40 bg-status-stitching/20 text-status-stitching shadow-xs'
                            : 'border-border/60 bg-white/5 text-muted-foreground'
                        )}>
                          <Zap className={cn('h-4 w-4', isUrgent && 'animate-pulse')} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-bold text-foreground", isUrdu && "font-urdu-sans")}>
                              {t.urgentRushOrder}
                            </span>
                            {activeGarmentRate && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-mono',
                                  isUrgent
                                    ? 'border-status-stitching/50 bg-status-stitching/20 text-status-stitching font-bold'
                                    : 'border-border text-muted-foreground'
                                )}
                              >
                                +Rs. {activeGarmentRate.urgent_surcharge}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {isUrgent && activeGarmentRate
                              ? `${t.urgentRushNotice} ${activeGarmentRate.urgent_delivery_days} ${t.days} (${t.targetDelivery} ${deliveryDate || 'N/A'})`
                              : activeGarmentRate
                              ? `${t.urgentStandardNotice} ${activeGarmentRate.standard_delivery_days} ${t.days}`
                              : 'Compress timeline and apply urgent surcharge'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleUrgent(!isUrgent)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0',
                          isUrgent
                            ? 'border-status-stitching/50 bg-status-stitching text-background shadow-xs'
                            : 'border-border/80 bg-card/80 text-muted-foreground hover:text-foreground hover:border-border'
                        )}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>{isUrgent ? t.urgentEnabledBtn : t.enableUrgent}</span>
                      </button>
                    </div>

                    {/* Delivery & Trial Dates */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        type="date"
                        label={`${t.deliveryDateLabel} *`}
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        leftIcon={<CalendarDays className="h-4 w-4 text-primary" />}
                        required
                      />
                      <Input
                        type="date"
                        label={t.trialDateLabel}
                        value={trialDate}
                        onChange={(e) => setTrialDate(e.target.value)}
                        leftIcon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                      />
                    </div>

                    {/* Fabric Source Toggle */}
                    <div className="flex flex-col gap-2">
                      <span className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", isUrdu && "font-urdu-sans")}>
                        {t.fabricSourceLabel}
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFabricSource('CUSTOMER')}
                          className={cn(
                            'flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-semibold transition-all duration-150 cursor-pointer',
                            fabricSource === 'CUSTOMER'
                              ? 'border-primary bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'border-border/60 bg-card-elevated text-foreground hover:border-border hover:bg-card'
                          )}
                        >
                          <span className={isUrdu ? "font-urdu-sans" : ""}>
                            {fabricSource === 'CUSTOMER' && <span className="mr-1">✓</span>}
                            {t.fabricSourceCustomer}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFabricSource('SHOP')}
                          className={cn(
                            'flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-semibold transition-all duration-150 cursor-pointer',
                            fabricSource === 'SHOP'
                              ? 'border-primary bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'border-border/60 bg-card-elevated text-foreground hover:border-border hover:bg-card'
                          )}
                        >
                          <span className={isUrdu ? "font-urdu-sans" : ""}>
                            {fabricSource === 'SHOP' && <span className="mr-1">✓</span>}
                            {t.fabricSourceShop}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Fabric Brand & Color */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label={t.fabricBrandLabel}
                        placeholder={t.fabricBrandPlaceholder}
                        value={fabricBrand}
                        onChange={(e) => setFabricBrand(e.target.value)}
                        leftIcon={<Package className="h-4 w-4 text-muted-foreground" />}
                      />
                      <Input
                        label={t.fabricColorLabel}
                        placeholder={t.fabricColorPlaceholder}
                        value={fabricColor}
                        onChange={(e) => setFabricColor(e.target.value)}
                      />
                    </div>

                    {/* Fabric Notes */}
                    <div>
                      <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground", isUrdu && "font-urdu-sans")}>
                        {t.fabricNotesLabel}
                      </label>
                      <textarea
                        rows={2}
                        value={fabricNotes}
                        onChange={(e) => setFabricNotes(e.target.value)}
                        placeholder={t.fabricNotesPlaceholder}
                        className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Tab 1 Navigation Action Bar */}
                <div className="flex items-center justify-end rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('measurements')}
                    className="gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                    size="sm"
                  >
                    <span>{t.nextMeasurementsStep}</span>
                    {dir === 'rtl' ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </TabsContent>

              {/* ================================================================
                  TAB 2: MEASUREMENTS & STYLE PREFERENCES
                  ================================================================ */}
              <TabsContent value="measurements" className="mt-0 flex flex-col gap-6">
                <SectionCard
                  title={t.matrixTitle}
                  icon={<Ruler className="h-4 w-4" />}
                >
                  {/* Top toolbar */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <p className={cn("text-xs text-muted-foreground", isUrdu && "font-urdu-sans")}>
                      {t.matrixSubtitle}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMannequin((prev) => !prev)}
                      className="h-8 gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showMannequin ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-primary" />
                          <span>{t.bodyDiagramHide}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          <span>{t.bodyDiagramShow}</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Profile lock banner */}
                  {isProfileLocked && foundProfile && (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-xs text-foreground">
                          {t.autofilledFromProfile}{' '}
                          <span className="font-bold text-primary">{foundProfile.profile_name}</span>
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateFreshRevision}
                        className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <RefreshCw className="mr-1.5 h-3 w-3" />
                        {t.editFreshRevision}
                      </Button>
                    </div>
                  )}

                  {/* Form & Optional Mannequin Display */}
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    {/* Measurement Intake Form (Card-free 2-column Ledger) */}
                    <div className="flex-1 min-w-0">
                      <MeasurementIntakeForm
                        measurements={measurements}
                        stylePreferences={stylePreferences}
                        onMeasurementChange={handleMeasurementChange}
                        onStyleChange={handleStyleChange}
                        activeMeasurementField={activeField}
                        onFieldFocus={setActiveField}
                      />
                    </div>

                    {/* Collapsible Visual Mannequin Pad */}
                    {showMannequin && (
                      <div className="w-full shrink-0 lg:w-52">
                        <div className="sticky top-24 flex flex-col items-center rounded-xl border border-border/80 bg-card/90 p-3 shadow-md backdrop-blur-xs">
                          <span className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Body Mapping Pad
                          </span>
                          <VisualMannequinPad activeField={activeField} />
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Tab 2 Navigation Action Bar */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('customer')}
                    className="gap-2 text-xs"
                    size="sm"
                  >
                    {dir === 'rtl' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                    <span>{t.backToCustomer}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setActiveTab('billing')}
                    className="gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                    size="sm"
                  >
                    <span>{t.nextBillingStep}</span>
                    {dir === 'rtl' ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </TabsContent>

              {/* ================================================================
                  TAB 3: BILLING & CONFIRMATION
                  ================================================================ */}
              <TabsContent value="billing" className="mt-0 flex flex-col gap-6">
                
                {/* Section 1: Itemized Pricing & Rate Modifiers */}
                <SectionCard
                  title={t.billingSectionTitle}
                  urTitle="مالی حساب اور ریٹس"
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t.stitchingRateLabel}
                          </label>
                          {activeGarmentRate && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {t.catalogRate} <bdi dir="ltr">Rs. {activeGarmentRate.base_stitching_rate}</bdi>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">PKR</span>
                          <bdi dir="ltr" className="inline-flex w-full">
                            <input
                              type="number"
                              dir="ltr"
                              inputMode="numeric"
                              min={0}
                              value={stitchingRate}
                              onChange={(e) => setStitchingRate(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="h-9 w-full rounded-md border border-input bg-card px-3 text-right font-mono text-sm font-bold text-foreground tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </bdi>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {t.subtotal} <bdi dir="ltr">Rs. {(stitchingRate * quantity).toLocaleString('en-PK')}</bdi> ({quantity}x {isUrdu ? selectedGarmentOption.ur : selectedGarmentOption.en})
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t.fabricChargesLabel}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">PKR</span>
                          <bdi dir="ltr" className="inline-flex w-full">
                            <input
                              type="number"
                              dir="ltr"
                              inputMode="numeric"
                              min={0}
                              value={fabricCharges}
                              onChange={(e) => setFabricCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="h-9 w-full rounded-md border border-input bg-card px-3 text-right font-mono text-sm font-bold text-foreground tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </bdi>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {fabricSource === 'SHOP' ? t.fabricShopPrice : t.fabricCustomerZero}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t.addonsChargesLabel}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">PKR</span>
                          <bdi dir="ltr" className="inline-flex w-full">
                            <input
                              type="number"
                              dir="ltr"
                              inputMode="numeric"
                              min={0}
                              value={addonsCharges}
                              onChange={(e) => setAddonsCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="h-9 w-full rounded-md border border-input bg-card px-3 text-right font-mono text-sm font-bold text-foreground tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </bdi>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {t.addonsSubtext}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t.discountLabel}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">PKR</span>
                          <bdi dir="ltr" className="inline-flex w-full">
                            <input
                              type="number"
                              dir="ltr"
                              inputMode="numeric"
                              min={0}
                              value={discountAmount}
                              onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="h-9 w-full rounded-md border border-input bg-card px-3 text-right font-mono text-sm font-bold text-foreground tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </bdi>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {t.discountSubtext}
                        </span>
                      </div>
                    </div>

                    {/* Urgent Rush Surcharge Live Notification Bar */}
                    {isUrgent && activeGarmentRate && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-status-stitching/40 bg-status-stitching/10 p-3 text-xs text-status-stitching">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 shrink-0 animate-pulse" />
                          <span className="font-semibold">
                            {t.urgentSurchargeNotice} <bdi dir="ltr">Rs. {activeGarmentRate.urgent_surcharge} × {quantity} = Rs. {urgentSurcharge.toLocaleString('en-PK')}</bdi>
                          </span>
                        </div>
                        <span className="text-[11px] opacity-80">
                          {t.urgentRushNotice} <bdi dir="ltr">{activeGarmentRate.urgent_delivery_days} {t.days}</bdi>
                        </span>
                      </div>
                    )}

                    {/* Advance Payment Intake */}
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {t.advanceDepositLabel}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {t.advanceSubtext}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">PKR</span>
                        <bdi dir="ltr" className="inline-flex">
                          <input
                            type="number"
                            dir="ltr"
                            inputMode="numeric"
                            min={0}
                            value={advancePaid}
                            onChange={(e) => setAdvancePaid(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="h-10 w-36 rounded-lg border border-primary/50 bg-card px-3 text-right font-mono text-base font-black text-primary tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </bdi>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Section 2: Workshop Staff Assignment */}
                <SectionCard
                  title={t.staffSectionTitle}
                  urTitle="ورکشاپ عملہ تفویض"
                  icon={<Scissors className="h-4 w-4" />}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Cutting Master */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t.cutterLabel}
                      </label>
                      <div className="relative">
                        <select
                          value={assignedCutterId}
                          onChange={(e) => setAssignedCutterId(e.target.value)}
                          className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rtl:pr-3 rtl:pl-9"
                        >
                          <option value="">{t.unassigned}</option>
                          {cuttingMasters.map((s) => {
                            const displayName = s.name || s.email?.split('@')[0] || 'Craftsman';
                            const roleTag = s.role === 'OWNER' ? ' (Owner)' : s.role === 'MANAGER' ? ' (Manager)' : '';
                            return (
                              <option key={s.id} value={s.id}>
                                {displayName}{roleTag}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:right-auto rtl:left-3" />
                      </div>
                    </div>

                    {/* Stitcher */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t.stitcherLabel}
                      </label>
                      <div className="relative">
                        <select
                          value={assignedStitcherId}
                          onChange={(e) => setAssignedStitcherId(e.target.value)}
                          className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rtl:pr-3 rtl:pl-9"
                        >
                          <option value="">{t.unassigned}</option>
                          {stitchers.map((s) => {
                            const displayName = s.name || s.email?.split('@')[0] || 'Craftsman';
                            const roleTag = s.role === 'OWNER' ? ' (Owner)' : s.role === 'MANAGER' ? ' (Manager)' : '';
                            return (
                              <option key={s.id} value={s.id}>
                                {displayName}{roleTag}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:right-auto rtl:left-3" />
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Section 3: Special Workshop Instructions */}
                <SectionCard
                  title={t.productionNotesLabel}
                  urTitle="خصوصی ہدایات"
                  icon={<FileText className="h-4 w-4" />}
                >
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.productionNotesLabel}
                    </label>
                    <textarea
                      rows={3}
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      placeholder={t.productionNotesPlaceholder}
                      className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                </SectionCard>

                {/* Tab 3 Navigation Action Bar */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('measurements')}
                    className="gap-2 text-xs"
                    size="sm"
                  >
                    {dir === 'rtl' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                    <span>{t.backToMeasurements}</span>
                  </Button>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {isUrdu ? 'آرڈر کی تصدیق کے لیے سائیڈ بار ملاحظہ کریں ←' : 'Review and finalize order in the Summary sidebar →'}
                  </span>
                </div>
              </TabsContent>
            </Tabs>
          </main>

          {/* ================================================================
              RIGHT: FIXED/STICKY ORDER SUMMARY & FINANCIAL LEDGER (1/3 WIDTH)
              ================================================================ */}
          <aside className="lg:col-span-4">
            <div className="flex flex-col gap-5 static lg:sticky lg:top-20">
              
              {/* Main Summary Glass Card */}
              <div className="premium-glass-card p-5 flex flex-col gap-5 border border-border/80 shadow-2xl">
                
                {/* Header: Real-Time Order Preview */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.orderSummary}
                    </span>
                    <h3 className="text-base font-bold text-foreground truncate max-w-[180px]">
                      {customerName.trim() || t.newCustomer}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isUrgent && (
                      <Badge variant="status-stitching" className="text-[10px] gap-1 px-1.5 py-0.5">
                        <Zap className="h-3 w-3" />
                        {isUrdu ? 'ارجنٹ' : 'Urgent'}
                      </Badge>
                    )}
                    <Badge variant="status-booked" className="text-[11px] font-mono font-semibold">
                      {isUrdu ? selectedGarmentOption.ur : selectedGarmentOption.en} × {quantity}
                    </Badge>
                  </div>
                </div>

                {/* Delivery Date preview */}
                <div className="flex items-center justify-between text-xs py-1 border-b border-border/40 pb-2.5">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {t.targetDelivery}
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    {deliveryDate ? (
                      <bdi dir="ltr">{deliveryDate}</bdi>
                    ) : (
                      <span className="text-muted-foreground/60 italic">{t.notSet}</span>
                    )}
                    {isUrgent && activeGarmentRate && (
                      <span className="text-[10px] text-status-stitching font-bold">
                        ({activeGarmentRate.urgent_delivery_days}{isUrdu ? ' دن' : 'd rush'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Financial Ledger */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between pb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <CreditCard className="h-3.5 w-3.5" />
                      {t.financialLedger}
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-border/40">
                    <FinancialRow
                      label={`${t.stitchingFee} (× ${quantity})`}
                      urLabel={`${t.stitchingFee} (× ${quantity})`}
                      value={stitchingRate * quantity}
                      readOnly
                    />
                    <FinancialRow
                      label={t.fabricFee}
                      urLabel={t.fabricFee}
                      value={fabricCharges}
                      readOnly
                    />
                    {addonsCharges > 0 && (
                      <FinancialRow
                        label={t.addonFee}
                        urLabel={t.addonFee}
                        value={addonsCharges}
                        readOnly
                      />
                    )}
                    {urgentSurcharge > 0 && (
                      <FinancialRow
                        label={t.urgentFee}
                        urLabel={t.urgentFee}
                        value={urgentSurcharge}
                        readOnly
                        highlight="amber"
                      />
                    )}
                    {addonsCharges === 0 && urgentSurcharge === 0 && (
                      <FinancialRow
                        label={t.addonFee}
                        urLabel={t.addonFee}
                        value={0}
                        readOnly
                      />
                    )}
                    {discountAmount > 0 && (
                      <FinancialRow
                        label={t.discountFee}
                        urLabel={t.discountFee}
                        value={discountAmount}
                        readOnly
                        highlight="green"
                      />
                    )}

                    {/* Total Amount in bold Gold */}
                    <div className="py-2.5 flex items-center justify-between border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          {t.totalAmount}
                        </span>
                      </div>
                      <bdi dir="ltr" className="font-mono text-lg font-black tabular-nums text-primary whitespace-nowrap">
                        Rs. {financials.total_amount.toLocaleString('en-PK')}
                      </bdi>
                    </div>

                    {/* Advance Paid */}
                    <FinancialRow
                      label={t.advancePaid}
                      urLabel={t.advancePaid}
                      value={advancePaid}
                      readOnly
                    />

                    {/* Real-time Balance Due Card */}
                    <div className="mt-2 rounded-xl border border-border/80 bg-card-elevated/80 p-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {isOverpayment ? t.creditBalance : t.balanceDue}
                          </span>
                          {financials.payment_status === 'FULLY_PAID' && !isOverpayment ? (
                            <Badge variant="status-ready" className="text-[10px] px-1.5 py-0 h-4.5">
                              {t.paid}
                            </Badge>
                          ) : isOverpayment ? (
                            <Badge variant="status-stitching" className="text-[10px] px-1.5 py-0 h-4.5">
                              {t.credit}
                            </Badge>
                          ) : financials.advance_paid > 0 ? (
                            <Badge variant="status-cutting" className="text-[10px] px-1.5 py-0 h-4.5">
                              {t.partial}
                            </Badge>
                          ) : (
                            <Badge variant="status-booked" className="text-[10px] px-1.5 py-0 h-4.5">
                              {t.unpaid}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <bdi
                        dir="ltr"
                        className={cn(
                          'font-mono text-lg font-black tabular-nums whitespace-nowrap',
                          isOverpayment
                            ? 'text-status-stitching'
                            : financials.balance_due === 0
                            ? 'text-status-ready'
                            : 'text-status-overdue'
                        )}
                      >
                        Rs. {isOverpayment
                          ? creditBalance.toLocaleString('en-PK')
                          : financials.balance_due.toLocaleString('en-PK')}
                      </bdi>
                    </div>

                    {/* Overpayment note */}
                    {isOverpayment && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-status-stitching/30 bg-status-stitching/10 p-2.5 text-[11px] text-status-stitching">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          <bdi dir="ltr">Rs. {creditBalance.toLocaleString()}</bdi> {t.overpaymentNote}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Workshop Assignment summary */}
                {(selectedCutter || selectedStitcher) && (
                  <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.assignedOperators}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedCutter && (
                        <div className="bg-card-elevated border border-border text-foreground px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5">
                          <Scissors className="h-3 w-3 text-primary" />
                          <span>{t.cutter} {selectedCutter.name || selectedCutter.email?.split('@')[0] || t.cutterLabel}</span>
                        </div>
                      )}
                      {selectedStitcher && (
                        <div className="bg-card-elevated border border-border text-foreground px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-status-stitching" />
                          <span>{t.stitcher} {selectedStitcher.name || selectedStitcher.email?.split('@')[0] || t.stitcherLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Action CTAs */}
                <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    disabled={!isFormValidToBook || isCheckingQuota}
                    isLoading={isCheckingQuota}
                    onClick={handleBookOrder}
                    className={cn(
                      'w-full h-11 text-sm font-bold tracking-wide shadow-lg transition-all duration-200 gap-2',
                      isFormValidToBook && !isCheckingQuota
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(200,169,126,0.3)]'
                        : 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isCheckingQuota ? t.verifyingQuota : t.confirmAndBook}</span>
                  </Button>

                  {!isFormValidToBook && (
                    <p className="text-center text-[11px] text-muted-foreground">
                      {t.bookRequirementsNotice}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={handleSaveDraft}
                    >
                      {t.saveDraft}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetForm}
                      className="text-xs text-muted-foreground hover:text-destructive gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t.resetForm}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
        </div>

        {/* WhatsApp Booking Receipt Modal */}
        <WhatsAppReceiptModal
          open={isReceiptModalOpen}
          onOpenChange={setIsReceiptModalOpen}
          order={newBookedOrder}
          customer={newBookedCustomer}
          shop={currentShop}
          initialTemplate="booking"
        />

        {/* Thermal Slip & Fabric Tag Modal */}
        <ThermalSlipModal
          open={isThermalModalOpen}
          onOpenChange={setIsThermalModalOpen}
          order={newBookedOrder}
          customer={newBookedCustomer}
          shop={currentShop}
          settings={printerSettings}
          initialFormat={printerSettings.paper_width}
        />

        {/* Monthly Quota Exceeded Luxury Theme-Adaptive Dialog */}
        {isQuotaModalOpen && quotaDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="quota-dialog-title" aria-describedby="quota-dialog-desc">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-primary/40 bg-card p-6 sm:p-8 shadow-2xl">
              {/* Decorative radial top glow */}
              <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

              {/* Header */}
              <div className="relative z-10 flex items-start justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-xs">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 id="quota-dialog-title" className="text-lg font-bold text-foreground">
                        {isUrdu ? 'ماہانہ کوٹہ مکمل' : 'Monthly Quota Reached'}
                      </h2>
                      <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary text-[10px] uppercase tracking-wider font-semibold">
                        {currentShop.subscription_status === 'TRIALING' ? (isUrdu ? 'ٹرائل ختم' : 'Trial Expired') : (isUrdu ? 'فری پلان' : 'Free Tier')}
                      </Badge>
                    </div>
                    <p id="quota-dialog-desc" className="text-xs text-muted-foreground">
                      {isUrdu ? 'اس مہینے کے سوٹس کا کوٹہ مکمل ہو چکا ہے' : 'Maximum monthly suit quota exhausted'}
                    </p>
                  </div>
                </div>
                <span dir="rtl" lang="ur" className="font-urdu-serif text-lg leading-urdu-display text-primary">
                  {isUrdu ? 'کوٹہ حد' : 'ماہانہ کوٹہ'}
                </span>
              </div>

              {/* Body */}
              <div className="relative z-10 space-y-5 py-5">
                {/* Progress meter */}
                <div className="rounded-xl border border-border bg-card-elevated/60 p-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-foreground">
                      {isUrdu ? 'ماہانہ استعمال کی شرح' : 'Monthly Usage Consumption'}
                    </span>
                    <span className="font-mono font-bold text-primary">
                      <bdi dir="ltr">{quotaDetails.currentCount} / {quotaDetails.maxLimit}</bdi> {isUrdu ? 'سوٹس' : 'Suits'} (<bdi dir="ltr">{Math.min(100, Math.round((quotaDetails.currentCount / quotaDetails.maxLimit) * 100))}%</bdi>)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary shadow-xs transition-all duration-500"
                      style={{ width: `${Math.min(100, (quotaDetails.currentCount / quotaDetails.maxLimit) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {currentShop.subscription_status === 'TRIALING'
                      ? (isUrdu
                        ? 'آپ کا ٹرائل ختم ہو چکا ہے۔ ورک اسپیس فری حد (50 سوٹ فی ماہ) پر محدود ہے۔'
                        : 'Your promotional trial has concluded. The workspace is currently limited to the Free tier ceiling of 50 suits/month.')
                      : (isUrdu
                        ? `فری پلان میں ماہانہ 50 آرڈرز کی حد ہے۔ آپ اس مہینے ${quotaDetails.currentCount} سوٹ درج کر چکے ہیں۔`
                        : `Free tier accommodates up to 50 orders per calendar month. You have tailored ${quotaDetails.currentCount} suits this month.`)}
                  </p>
                </div>

                {/* Feature comparison / upgrade value */}
                <div className="space-y-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    {isUrdu ? 'پرو ورکشاپ کے ساتھ لامحدود ترقی حاصل کریں:' : 'Unlock Unlimited Growth with Pro Workshop:'}
                  </p>
                  <ul className="space-y-1.5 text-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>{isUrdu ? 'لامحدود سوٹ اور آرڈرز' : 'Unlimited Suits & Orders'}</strong> {isUrdu ? 'بغیر کسی ماہانہ حد کے' : 'without monthly ceiling'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>{isUrdu ? 'مکمل عملہ انتظام' : 'Multi-Staff & Role Assignment'}</strong> {isUrdu ? '(کٹر، درزی، پریس ماسٹر)' : '(Cutters, Stitchers, Pressers)'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>{isUrdu ? 'تھرمل رسید اور ٹیگ پرنٹنگ' : 'Hardware Thermal ESC/POS'}</strong> {isUrdu ? 'براہ راست رسید پرنٹ' : 'direct receipt & tag printing'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span><strong>{isUrdu ? 'کسٹم واٹس ایپ اور رسید برانڈنگ' : 'Custom WhatsApp & Slip Branding'}</strong> {isUrdu ? 'اردو فونٹس کے ساتھ' : 'with Urdu typography'}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer CTAs */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsQuotaModalOpen(false)}
                  className="w-full sm:w-auto text-xs"
                >
                  {isUrdu ? 'سمجھ گیا' : 'Dismiss'}
                </Button>
                <Link href="/settings" className="w-full sm:w-auto">
                  <Button
                    type="button"
                    className="w-full sm:w-auto bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shadow-md gap-1.5"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    <span>{isUrdu ? 'پرو ورکشاپ میں اپ گریڈ کریں ←' : 'Upgrade to Pro Workshop →'}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
