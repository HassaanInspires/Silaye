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
} from '@/lib/db';
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

// ---------------------------------------------------------------------------
// Default measurement values (spec mid-range defaults, quarter-inch aligned)
// ---------------------------------------------------------------------------

const DEFAULT_MEASUREMENTS: ShalwarKameezMeasurements = {
  kameez_length:  42.0,
  chest:          40.0,
  waist:          38.0,
  shoulder_teera: 17.5,
  sleeve_length:  24.0,
  neck_gala:      15.5,
  daman_width:    22.0,
  shalwar_length: 39.0,
  paincha:        8.5,
  aasan:          17.0,
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

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

interface SectionCardProps {
  title: string;
  urTitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, urTitle, icon, children, className }: SectionCardProps) {
  return (
    <Card className={cn('flex flex-col gap-0 border-border/80 bg-card/70 backdrop-blur-xs shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 pb-3.5 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">{icon}</span>
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        </div>
        <span
          dir="rtl"
          lang="ur"
          className="font-urdu-serif text-sm leading-urdu-display text-primary"
        >
          {urTitle}
        </span>
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
  urLabel: string;
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
  const colorMap = {
    gold:  'text-primary',
    green: 'text-status-ready',
    red:   'text-status-overdue',
    amber: 'text-status-stitching',
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      {/* Labels */}
      <div className="flex flex-col gap-0">
        <span
          className={cn(
            'text-xs leading-tight',
            isBold ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        <span
          dir="rtl"
          lang="ur"
          className="font-urdu-sans text-[0.6rem] leading-urdu-data text-muted-foreground/80"
        >
          {urLabel}
        </span>
      </div>

      {/* Input or display */}
      {readOnly ? (
        <bdi
          dir="ltr"
          className={cn(
            'font-mono text-sm tabular-nums',
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
  // ── Tab state: 3 Progressive Disclosure Steps ──────────────────────────
  const [activeTab, setActiveTab] = React.useState<string>('customer');

  // ── Customer lookup state ──────────────────────────────────────────────
  const [phone, setPhone] = React.useState<string>('');
  const [foundCustomer, setFoundCustomer] = React.useState<Customer | null>(null);
  const [foundProfile, setFoundProfile] = React.useState<MeasurementProfile | null>(null);
  const [isProfileLocked, setIsProfileLocked] = React.useState<boolean>(false);

  // ── Customer form fields ───────────────────────────────────────────────
  const [customerName, setCustomerName] = React.useState<string>('');
  const [customerAddress, setCustomerAddress] = React.useState<string>('');

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

    const orderNum = `DP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveCust: Customer = foundCustomer || {
      id: `cust-${Date.now()}`,
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
      id: `ord-${Date.now()}`,
      order_number: orderNum,
      shop_id: currentShop.id,
      customer_id: effectiveCust.id,
      measurement_profile_id: foundProfile?.id || null,
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
      public_tracking_key: `track-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Increment monthly quota count
    await subscriptionDb.incrementUsage(currentShop.id);

    setNewBookedOrder(newOrder);
    setNewBookedCustomer(effectiveCust);
    if (printerSettings.auto_print_on_booking) {
      setIsThermalModalOpen(true);
    } else {
      setIsReceiptModalOpen(true);
    }

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

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <AppShell activeRoute="/orders/new">
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-6 pb-28">
        
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">New Booking</h1>
              <Badge variant="status-booked" className="text-xs">
                Draft Mode
              </Badge>
              {draftSavedToast && (
                <span className="flex items-center gap-1 text-xs text-status-ready font-medium animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Draft saved locally
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Intake customer profile, fabric specifications, bespoke measurements, and workshop ledger
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              dir="rtl"
              lang="ur"
              className="font-urdu-serif text-xl leading-urdu-display text-primary"
            >
              نئی بکنگ اور ناپ
            </span>
          </div>
        </div>

        {/* ── Split-Pane Architecture: 12-Column Responsive Layout ── */}
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
              <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-2 bg-[#121418] p-1 sm:p-1.5 rounded-xl border border-white/5 h-auto mb-6">
                
                {/* Tab 1 Trigger */}
                <TabsTrigger
                  value="customer"
                  className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 border border-transparent transition-all min-w-0"
                >
                  <span className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-tight sm:tracking-wide truncate max-w-full">
                    1. Customer & Fabric
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-400 font-urdu-sans mt-0.5 truncate max-w-full">
                    گاہک اور کپڑا
                  </span>
                </TabsTrigger>

                {/* Tab 2 Trigger */}
                <TabsTrigger
                  value="measurements"
                  className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 border border-transparent transition-all min-w-0"
                >
                  <span className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-tight sm:tracking-wide truncate max-w-full">
                    2. Measurements
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-400 font-urdu-sans mt-0.5 truncate max-w-full">
                    ناپ اور کٹ
                  </span>
                </TabsTrigger>

                {/* Tab 3 Trigger */}
                <TabsTrigger
                  value="billing"
                  className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg data-[state=active]:bg-gold/15 data-[state=active]:text-gold data-[state=active]:border-gold/30 border border-transparent transition-all min-w-0"
                >
                  <span className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-tight sm:tracking-wide truncate max-w-full">
                    3. Billing & Assign
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-400 font-urdu-sans mt-0.5 truncate max-w-full">
                    بلنگ اور کاریگر
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* ================================================================
                  TAB 1: CUSTOMER & FABRIC DETAILS
                  ================================================================ */}
              <TabsContent value="customer" className="mt-0 flex flex-col gap-6">
                
                {/* Section 1: Customer Profile & Phone Lookup */}
                <SectionCard
                  title="Customer Profile & Lookup"
                  urTitle="گاہک کی تفصیلات"
                  icon={<User className="h-4 w-4" />}
                >
                  <div className="flex flex-col gap-4">
                    {/* Phone input with auto-lookup */}
                    <div className="flex flex-col gap-2">
                      <Input
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        label="Mobile Number / موبائل نمبر"
                        placeholder="03XX-XXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        leftIcon={<Phone className="h-4 w-4" />}
                        hint="Enter 10–11 digit Pakistani number to auto-lookup customer records"
                      />

                      {/* Profile Matched Badge */}
                      {foundCustomer && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-ready/30 bg-status-ready/10 p-3.5">
                          <div className="flex items-center gap-3">
                            <BadgeCheck className="h-5 w-5 shrink-0 text-status-ready" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-status-ready">
                                Existing Customer Profile Matched
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {foundCustomer.full_name} ·{' '}
                                <bdi dir="ltr">{formatPakistaniPhone(foundCustomer.phone)}</bdi>
                                {foundProfile && (
                                  <> · Profile: <span className="font-semibold text-foreground">{foundProfile.profile_name}</span></>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {foundCustomer.current_khata_balance > 0 && (
                              <Badge variant="status-overdue" className="text-[0.65rem]">
                                <bdi dir="ltr">Udhaar: Rs. {foundCustomer.current_khata_balance.toLocaleString()}</bdi>
                              </Badge>
                            )}
                            {foundCustomer.current_khata_balance < 0 && (
                              <Badge variant="status-ready" className="text-[0.65rem]">
                                <bdi dir="ltr">Credit: Rs. {Math.abs(foundCustomer.current_khata_balance).toLocaleString()}</bdi>
                              </Badge>
                            )}
                            {foundCustomer.current_khata_balance === 0 && (
                              <Badge variant="default" className="text-[0.65rem]">
                                Khata Settled
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
                                Unlock Measurements
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
                            New customer number — entered details and measurements will save as a fresh profile.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name & Address Inputs */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Customer Name / نام"
                        placeholder="e.g. Tariq Mehmood"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        leftIcon={<User className="h-4 w-4" />}
                        required
                      />
                      <Input
                        label="Address / پتہ"
                        placeholder="Street, Sector, Wah Cantt"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        leftIcon={<MapPin className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Section 2: Garment & Fabric Specifications */}
                <SectionCard
                  title="Garment & Fabric Specifications"
                  urTitle="لباس اور کپڑا"
                  icon={<Scissors className="h-4 w-4" />}
                >
                  <div className="flex flex-col gap-5">
                    {/* Garment Type & Quantity */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Garment Type / قسم
                        </label>
                        <div className="relative">
                          <select
                            value={garmentType}
                            onChange={(e) => handleGarmentTypeChange(e.target.value as GarmentType)}
                            className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-sm font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          >
                            {GARMENT_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.en} — {opt.ur}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Qty / تعداد
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
                        ? 'border-status-stitching/50 bg-status-stitching/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-status-stitching/30'
                        : 'border-border/70 bg-card-elevated/60'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all',
                          isUrgent
                            ? 'border-status-stitching/40 bg-status-stitching/20 text-status-stitching shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                            : 'border-border/60 bg-white/5 text-muted-foreground'
                        )}>
                          <Zap className={cn('h-4 w-4', isUrgent && 'animate-pulse')} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">Urgent Rush Order / ارجنٹ سلائی</span>
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
                              ? `Express turnaround in ${activeGarmentRate.urgent_delivery_days} days (Target: ${deliveryDate || 'N/A'})`
                              : activeGarmentRate
                              ? `Standard turnaround: ${activeGarmentRate.standard_delivery_days} days`
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
                            ? 'border-status-stitching/50 bg-status-stitching text-background shadow-md'
                            : 'border-border/80 bg-card/80 text-muted-foreground hover:text-foreground hover:border-border'
                        )}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>{isUrgent ? 'Urgent Rush Active' : 'Enable Urgent Rush'}</span>
                      </button>
                    </div>

                    {/* Delivery & Trial Dates */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        type="date"
                        label="Target Delivery Date / ڈیلیوری تاریخ"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        leftIcon={<CalendarDays className="h-4 w-4" />}
                        required
                      />
                      <Input
                        type="date"
                        label="Trial Date (optional) / ٹرائل تاریخ"
                        value={trialDate}
                        onChange={(e) => setTrialDate(e.target.value)}
                        leftIcon={<CalendarDays className="h-4 w-4" />}
                      />
                    </div>

                    {/* Fabric Source Toggle */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Fabric Source / کپڑا کس کا ہے؟
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        {(['CUSTOMER', 'SHOP'] as const).map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setFabricSource(src)}
                            className={cn(
                              'flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-semibold transition-all duration-150',
                              fabricSource === src
                                ? 'border-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(200,169,126,0.2)] ring-1 ring-primary/40'
                                : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground'
                            )}
                          >
                            {src === 'CUSTOMER' ? (
                              <>
                                <span>Customer Supplied</span>
                                <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.65rem] opacity-80">(گاہک کا کپڑا)</span>
                              </>
                            ) : (
                              <>
                                <span>Shop In-Stock</span>
                                <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.65rem] opacity-80">(دکان کا کپڑا)</span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fabric Brand & Color */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Fabric Brand / برانڈ"
                        placeholder="Pasha, Al-Karam, Grace, Cotton…"
                        value={fabricBrand}
                        onChange={(e) => setFabricBrand(e.target.value)}
                        leftIcon={<Package className="h-4 w-4" />}
                      />
                      <Input
                        label="Fabric Color / رنگ"
                        placeholder="Charcoal Grey, Off-White, Navy…"
                        value={fabricColor}
                        onChange={(e) => setFabricColor(e.target.value)}
                      />
                    </div>

                    {/* Fabric Notes */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Fabric Notes & Tag Instructions / کپڑے کے بارے میں نوٹ
                      </label>
                      <textarea
                        rows={2}
                        value={fabricNotes}
                        onChange={(e) => setFabricNotes(e.target.value)}
                        placeholder="Customer supplied 4.5m unstitched wash & wear. Needs soft collar fusing…"
                        className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Tab 1 Navigation Action Bar */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-4">
                  <div className="text-xs text-muted-foreground">
                    Next step: Enter client measurements & garment cut preferences.
                  </div>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('measurements')}
                    className="gap-2 font-medium"
                    size="sm"
                  >
                    <span>Proceed to Measurements →</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TabsContent>

              {/* ================================================================
                  TAB 2: MEASUREMENTS & STYLE PREFERENCES
                  ================================================================ */}
              <TabsContent value="measurements" className="mt-0 flex flex-col gap-6">
                <SectionCard
                  title="Tailor Measurements & Garment Style"
                  urTitle="پیمائش اور کٹ"
                  icon={<Ruler className="h-4 w-4" />}
                >
                  {/* Top toolbar */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <p className="text-xs text-muted-foreground">
                      Bilingual Kameez + Shalwar dense measurement grid with 1-tap fractional pills.
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
                          Hide Body Diagram
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          Show Body Diagram
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
                          Autofilled from saved profile:{' '}
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
                        Edit as Fresh Revision
                      </Button>
                    </div>
                  )}

                  {/* Form & Optional Mannequin Display */}
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    {/* Measurement Intake Form (Dense 3-column Grid) */}
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
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('customer')}
                    className="gap-2 text-xs"
                    size="sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>← Back to Customer</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setActiveTab('billing')}
                    className="gap-2 font-medium"
                    size="sm"
                  >
                    <span>Proceed to Billing →</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TabsContent>

              {/* ================================================================
                  TAB 3: BILLING & CONFIRMATION
                  ================================================================ */}
              <TabsContent value="billing" className="mt-0 flex flex-col gap-6">
                
                {/* Section 1: Itemized Pricing & Rate Modifiers */}
                <SectionCard
                  title="Pricing & Rate Modifiers"
                  urTitle="مالی حساب اور ریٹس"
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Stitching Rate (Per Suit) / سلائی ریٹ
                          </label>
                          {activeGarmentRate && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Catalog: Rs. {activeGarmentRate.base_stitching_rate}
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
                          Subtotal: <bdi dir="ltr">Rs. {(stitchingRate * quantity).toLocaleString('en-PK')}</bdi> ({quantity}x suit)
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Fabric Charges / کپڑے کے چارجز
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
                          {fabricSource === 'SHOP' ? 'Shop in-stock fabric price' : 'Customer supplied (Rs. 0)'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Custom Addons / اضافی کام
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
                          Special embroidery, pocket piping, or fancy buttons
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card-elevated/60 p-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Discount Amount / رعایت
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
                          Special discount or seasonal concession
                        </span>
                      </div>
                    </div>

                    {/* Urgent Rush Surcharge Live Notification Bar */}
                    {isUrgent && activeGarmentRate && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-status-stitching/40 bg-status-stitching/10 p-3 text-xs text-status-stitching">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 shrink-0 animate-pulse" />
                          <span className="font-semibold">
                            Urgent Rush Surcharge Applied: Rs. {activeGarmentRate.urgent_surcharge} × {quantity} = Rs. {urgentSurcharge.toLocaleString('en-PK')}
                          </span>
                        </div>
                        <span className="text-[11px] opacity-80">
                          Timeline compressed to {activeGarmentRate.urgent_delivery_days} days
                        </span>
                      </div>
                    )}

                    {/* Advance Payment Intake */}
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          Advance Deposit / بیعانہ
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Enter advance cash or bank transfer received at booking
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
                  title="Workshop Staff Assignment"
                  urTitle="ورکشاپ عملہ تفویض"
                  icon={<Scissors className="h-4 w-4" />}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Cutting Master */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Cutting Master / کٹر
                      </label>
                      <div className="relative">
                        <select
                          value={assignedCutterId}
                          onChange={(e) => setAssignedCutterId(e.target.value)}
                          className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                          <option value="">— Unassigned —</option>
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
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Stitcher */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Stitcher / درزی
                      </label>
                      <div className="relative">
                        <select
                          value={assignedStitcherId}
                          onChange={(e) => setAssignedStitcherId(e.target.value)}
                          className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                          <option value="">— Unassigned —</option>
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
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Section 3: Special Workshop Instructions */}
                <SectionCard
                  title="Workshop Special Instructions"
                  urTitle="خصوصی ہدایات"
                  icon={<FileText className="h-4 w-4" />}
                >
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Production Notes / ورکشاپ کے لیے خصوصی ہدایات
                    </label>
                    <textarea
                      rows={3}
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      placeholder="Special contrast stitching, urgent Eid priority, double turpai on borders, client prefers looser fit around chest…"
                      className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                </SectionCard>

                {/* Tab 3 Navigation Action Bar */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('measurements')}
                    className="gap-2 text-xs"
                    size="sm"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>← Back to Measurements</span>
                  </Button>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Review and finalize order in the Summary sidebar →
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
                      Order Summary
                    </span>
                    <h3 className="text-base font-bold text-foreground truncate max-w-[180px]">
                      {customerName.trim() || 'New Customer'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isUrgent && (
                      <Badge variant="status-stitching" className="text-[10px] gap-1 px-1.5 py-0.5">
                        <Zap className="h-3 w-3" />
                        Urgent
                      </Badge>
                    )}
                    <Badge variant="status-booked" className="text-[11px] font-mono font-semibold">
                      {selectedGarmentOption.en} × {quantity}
                    </Badge>
                  </div>
                </div>

                {/* Delivery Date preview */}
                <div className="flex items-center justify-between text-xs py-1 border-b border-border/40 pb-2.5">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    Target Delivery:
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    {deliveryDate ? (
                      <bdi dir="ltr">{deliveryDate}</bdi>
                    ) : (
                      <span className="text-muted-foreground/60 italic">Not set</span>
                    )}
                    {isUrgent && activeGarmentRate && (
                      <span className="text-[10px] text-status-stitching font-bold">
                        ({activeGarmentRate.urgent_delivery_days}d rush)
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Financial Ledger */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between pb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <CreditCard className="h-3.5 w-3.5" />
                      Financial Ledger
                    </span>
                    <span dir="rtl" lang="ur" className="font-urdu-serif text-xs text-primary">
                      مالی حساب
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-border/40">
                    <FinancialRow
                      label={`Stitching (× ${quantity})`}
                      urLabel="سلائی ریٹ"
                      value={stitchingRate * quantity}
                      readOnly
                    />
                    <FinancialRow
                      label="Fabric Charges"
                      urLabel="کپڑے کے اخراجات"
                      value={fabricCharges}
                      readOnly
                    />
                    {addonsCharges > 0 && (
                      <FinancialRow
                        label="Custom Addons"
                        urLabel="اضافی چارجز"
                        value={addonsCharges}
                        readOnly
                      />
                    )}
                    {urgentSurcharge > 0 && (
                      <FinancialRow
                        label="Urgent Rush Surcharge"
                        urLabel="ارجنٹ سلائی چارجز"
                        value={urgentSurcharge}
                        readOnly
                        highlight="amber"
                      />
                    )}
                    {addonsCharges === 0 && urgentSurcharge === 0 && (
                      <FinancialRow
                        label="Addon Charges"
                        urLabel="اضافی چارجز"
                        value={0}
                        readOnly
                      />
                    )}
                    {discountAmount > 0 && (
                      <FinancialRow
                        label="Discount"
                        urLabel="رعایت"
                        value={discountAmount}
                        readOnly
                        highlight="green"
                      />
                    )}

                    {/* Total Amount in bold Gold */}
                    <div className="py-2.5 flex items-center justify-between border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Total Amount
                        </span>
                        <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.6rem] text-muted-foreground">
                          کل رقم
                        </span>
                      </div>
                      <bdi dir="ltr" className="font-mono text-lg font-black tabular-nums text-primary">
                        Rs. {financials.total_amount.toLocaleString('en-PK')}
                      </bdi>
                    </div>

                    {/* Advance Paid */}
                    <FinancialRow
                      label="Advance Paid"
                      urLabel="ایڈوانس ادائیگی"
                      value={advancePaid}
                      readOnly
                    />

                    {/* Real-time Balance Due Card */}
                    <div className="mt-2 rounded-xl border border-border/80 bg-card-elevated/80 p-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {isOverpayment ? 'Credit Balance' : 'Balance Due'}
                          </span>
                          {financials.payment_status === 'FULLY_PAID' && !isOverpayment ? (
                            <Badge variant="status-ready" className="text-[10px] px-1.5 py-0 h-4.5">
                              Fully Paid
                            </Badge>
                          ) : isOverpayment ? (
                            <Badge variant="status-stitching" className="text-[10px] px-1.5 py-0 h-4.5">
                              Credit
                            </Badge>
                          ) : financials.advance_paid > 0 ? (
                            <Badge variant="status-cutting" className="text-[10px] px-1.5 py-0 h-4.5">
                              Partial
                            </Badge>
                          ) : (
                            <Badge variant="status-booked" className="text-[10px] px-1.5 py-0 h-4.5">
                              Unpaid
                            </Badge>
                          )}
                        </div>
                        <span dir="rtl" lang="ur" className="font-urdu-sans text-[0.6rem] text-muted-foreground mt-0.5">
                          {isOverpayment ? 'گاہک کا کریڈٹ' : 'بقیہ رقم'}
                        </span>
                      </div>

                      <bdi
                        dir="ltr"
                        className={cn(
                          'font-mono text-lg font-black tabular-nums',
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
                          Rs. {creditBalance.toLocaleString()} credit will be added to the customer&apos;s Khata account.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Workshop Assignment summary */}
                {(selectedCutter || selectedStitcher) && (
                  <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Assigned Operators
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedCutter && (
                        <div className="bg-white/5 border border-white/10 text-gray-200 px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5">
                          <Scissors className="h-3 w-3 text-primary" />
                          <span>Cutter: {selectedCutter.name || selectedCutter.email?.split('@')[0] || 'Assigned'}</span>
                        </div>
                      )}
                      {selectedStitcher && (
                        <div className="bg-white/5 border border-white/10 text-gray-200 px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-status-stitching" />
                          <span>Stitcher: {selectedStitcher.name || selectedStitcher.email?.split('@')[0] || 'Assigned'}</span>
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
                    <span>{isCheckingQuota ? 'Verifying Quota...' : '✨ Confirm & Book Suit'}</span>
                  </Button>

                  {!isFormValidToBook && (
                    <p className="text-center text-[11px] text-muted-foreground">
                      * Please enter customer name & delivery date to book.
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
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetForm}
                      className="text-xs text-muted-foreground hover:text-destructive gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ================================================================
            MOBILE FLOATING ACTION BAR (< lg)
            ================================================================ */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
              Total / Balance
            </span>
            <bdi dir="ltr" className="font-mono text-sm font-bold text-primary">
              Rs. {financials.total_amount.toLocaleString('en-PK')}
              <span className="text-xs font-normal text-muted-foreground"> (Bal: {financials.balance_due.toLocaleString()})</span>
            </bdi>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetForm}
              className="text-xs text-muted-foreground"
            >
              Reset
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!isFormValidToBook || isCheckingQuota}
              isLoading={isCheckingQuota}
              onClick={handleBookOrder}
              className="gap-1.5 text-xs font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isCheckingQuota ? 'Verifying...' : 'Book Order'}</span>
            </Button>
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

        {/* Monthly Quota Exceeded Luxury Obsidian Dark Dialog */}
        {isQuotaModalOpen && quotaDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/40 bg-[#0F1115]/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
              {/* Decorative radial top glow */}
              <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" />

              {/* Header */}
              <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">Monthly Quota Reached</h2>
                      <Badge variant="outline" className="border-gold/50 bg-gold/10 text-gold text-[10px] uppercase tracking-wider font-semibold">
                        {currentShop.subscription_status === 'TRIALING' ? 'Trial Expired' : 'Free Tier'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum monthly suit quota exhausted
                    </p>
                  </div>
                </div>
                <span dir="rtl" lang="ur" className="font-urdu-serif text-lg leading-urdu-display text-gold">
                  ماہانہ کوٹہ مکمل
                </span>
              </div>

              {/* Body */}
              <div className="relative z-10 space-y-5 py-5">
                {/* Progress meter */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-gray-300">Monthly Usage Consumption</span>
                    <span className="font-mono font-bold text-gold">
                      {quotaDetails.currentCount} / {quotaDetails.maxLimit} Suits ({Math.min(100, Math.round((quotaDetails.currentCount / quotaDetails.maxLimit) * 100))}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-gold to-yellow-300 shadow-[0_0_12px_rgba(212,175,55,0.6)] transition-all duration-500"
                      style={{ width: `${Math.min(100, (quotaDetails.currentCount / quotaDetails.maxLimit) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {currentShop.subscription_status === 'TRIALING'
                      ? 'Your promotional trial has concluded. The workspace is currently limited to the Free tier ceiling of 50 suits/month.'
                      : `Free tier accommodates up to 50 orders per calendar month. You have tailored ${quotaDetails.currentCount} suits this month.`}
                  </p>
                </div>

                {/* Feature comparison / upgrade value */}
                <div className="space-y-2.5 rounded-xl border border-gold/20 bg-gold/[0.04] p-4 text-xs">
                  <p className="font-semibold text-gold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Unlock Unlimited Growth with Pro Workshop:
                  </p>
                  <ul className="space-y-1.5 text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                      <span><strong>Unlimited Suits & Orders</strong> without monthly ceiling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                      <span><strong>Multi-Staff & Role Assignment</strong> (Cutters, Stitchers, Pressers)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                      <span><strong>Hardware Thermal ESC/POS</strong> direct receipt & tag printing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                      <span><strong>Custom WhatsApp & Slip Branding</strong> with Urdu typography</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer CTAs */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-white/10 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsQuotaModalOpen(false)}
                  className="w-full sm:w-auto text-xs"
                >
                  Dismiss / سمجھ گیا
                </Button>
                <Link href="/settings" className="w-full sm:w-auto">
                  <Button
                    type="button"
                    className="w-full sm:w-auto bg-gradient-to-r from-gold to-amber-500 text-black font-bold text-xs hover:opacity-90 shadow-[0_0_20px_rgba(212,175,55,0.4)] gap-1.5"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    <span>Upgrade to Pro Workshop →</span>
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
