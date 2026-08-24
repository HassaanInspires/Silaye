'use client';

import * as React from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MeasurementIntakeForm } from '@/components/tailor/measurement-intake-form';
import { VisualMannequinPad } from '@/components/tailor/visual-mannequin-pad';
import {
  mockCustomers,
  mockMeasurementProfiles,
  mockStaff,
} from '@/lib/mock-data';
import { calculateOrderFinancials, formatPakistaniPhone } from '@/lib/validations/tailor';
import type {
  Customer,
  MeasurementProfile,
  ShalwarKameezMeasurements,
  StylePreferences,
  GarmentType,
  FabricSource,
} from '@/types/tailor';

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
    <Card className={cn('flex flex-col gap-0', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">{icon}</span>
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        </div>
        <span
          dir="rtl"
          lang="ur"
          className="font-urdu-serif text-sm leading-urdu-display text-primary"
        >
          {urTitle}
        </span>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
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
    <div className="flex items-center justify-between gap-4 py-2">
      {/* Labels */}
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            'text-sm leading-tight',
            isBold ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        <span
          dir="rtl"
          lang="ur"
          className="font-urdu-sans text-[0.62rem] leading-urdu-data text-muted-foreground"
        >
          {urLabel}
        </span>
      </div>

      {/* Input or display */}
      {readOnly ? (
        <bdi
          className={cn(
            'font-mono text-base tabular-nums',
            isBold ? 'font-bold' : 'font-medium',
            highlight ? colorMap[highlight] : 'text-foreground'
          )}
        >
          {prefix} {value.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </bdi>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{prefix}</span>
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
            className="h-9 w-32 rounded-lg border border-input bg-card-elevated px-3 text-right text-sm font-medium text-foreground tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
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

  // ── Measurements & styles ─────────────────────────────────────────────
  const [measurements, setMeasurements] = React.useState<ShalwarKameezMeasurements>(DEFAULT_MEASUREMENTS);
  const [stylePreferences, setStylePreferences] = React.useState<StylePreferences>(DEFAULT_STYLES);

  // ── Mannequin visibility & focus ──────────────────────────────────────
  const [showMannequin, setShowMannequin] = React.useState<boolean>(false);
  const [activeField, setActiveField] = React.useState<keyof ShalwarKameezMeasurements | null>(null);

  // ── Financials ─────────────────────────────────────────────────────────
  const [stitchingRate, setStitchingRate] = React.useState<number>(3000);
  const [fabricCharges, setFabricCharges] = React.useState<number>(0);
  const [addonsCharges, setAddonsCharges] = React.useState<number>(0);
  const [discountAmount, setDiscountAmount] = React.useState<number>(0);
  const [advancePaid, setAdvancePaid] = React.useState<number>(0);

  // ── Staff assignment (optional) ────────────────────────────────────────
  const [assignedCutterId, setAssignedCutterId] = React.useState<string>('');
  const [assignedStitcherId, setAssignedStitcherId] = React.useState<string>('');

  // ── Special notes ──────────────────────────────────────────────────────
  const [specialNotes, setSpecialNotes] = React.useState<string>('');

  // --------------------------------------------------------------------------
  // Customer auto-lookup: fires when phone reaches 10–11 digits
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
      const match = mockCustomers.find(
        (c) =>
          c.phone.replace(/\D/g, '') === digits ||
          (c.alternate_phone?.replace(/\D/g, '') === digits)
      );
      if (match) {
        setFoundCustomer(match);
        setCustomerName(match.full_name);
        setCustomerAddress(match.address ?? '');

        const defaultProfile = mockMeasurementProfiles.find(
          (p) => p.customer_id === match.id && p.is_default
        ) ?? null;

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
    } else {
      // Partial phone — clear match
      if (digits.length < 10) {
        setFoundCustomer(null);
        setFoundProfile(null);
        setIsProfileLocked(false);
      }
    }
  }, [phone]);

  // --------------------------------------------------------------------------
  // Real-time financial derivation (memoised)
  // --------------------------------------------------------------------------
  const financials = React.useMemo(
    () =>
      calculateOrderFinancials({
        stitching_rate: stitchingRate,
        quantity:       quantity,
        fabric_charges: fabricCharges,
        addons_charges: addonsCharges,
        discount_amount: discountAmount,
        advance_paid:   advancePaid,
      }),
    [stitchingRate, quantity, fabricCharges, addonsCharges, discountAmount, advancePaid]
  );

  // Credit balance when advance exceeds total (overpayment)
  const isOverpayment = advancePaid > financials.total_amount && financials.total_amount > 0;
  const creditBalance = isOverpayment ? advancePaid - financials.total_amount : 0;

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
    setDeliveryDate('');
    setTrialDate('');
    setFabricSource('CUSTOMER');
    setFabricColor('');
    setFabricBrand('');
    setFabricNotes('');
    setMeasurements(DEFAULT_MEASUREMENTS);
    setStylePreferences(DEFAULT_STYLES);
    setStitchingRate(3000);
    setFabricCharges(0);
    setAddonsCharges(0);
    setDiscountAmount(0);
    setAdvancePaid(0);
    setAssignedCutterId('');
    setAssignedStitcherId('');
    setSpecialNotes('');
    setActiveField(null);
  };

  const cuttingMasters = mockStaff.filter((s) => s.role === 'CUTTING_MASTER' && s.is_active);
  const stitchers = mockStaff.filter((s) => s.role === 'STITCHER' && s.is_active);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <AppShell activeRoute="/orders/new">
      <div className="mx-auto max-w-5xl pb-24">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">New Booking</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create a garment order and capture measurements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              dir="rtl"
              lang="ur"
              className="font-urdu-serif text-lg leading-urdu-display text-primary"
            >
              نئی بکنگ
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* ================================================================
              SECTION 1: CUSTOMER DETAILS
              ================================================================ */}
          <SectionCard
            title="Customer Details"
            urTitle="گاہک کی معلومات"
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
                  hint="Enter 10–11 digit Pakistani number to auto-lookup customer profile"
                />

                {/* Profile Found badge */}
                {foundCustomer && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-status-ready/30 bg-status-ready/10 px-4 py-3">
                    <BadgeCheck className="h-4 w-4 shrink-0 text-status-ready" />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-status-ready">
                        Profile Found
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {foundCustomer.full_name} ·{' '}
                        <bdi dir="ltr">{formatPakistaniPhone(foundCustomer.phone)}</bdi>
                        {foundProfile && (
                          <> · Profile: {foundProfile.profile_name}</>
                        )}
                      </span>
                    </div>
                    {/* Khata balance indicator */}
                    <div>
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
                          Settled
                        </Badge>
                      )}
                    </div>
                    {isProfileLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCreateFreshRevision}
                        className="h-7 gap-1.5 text-xs text-muted-foreground"
                      >
                        <RefreshCw className="h-3 w-3" />
                        New Revision
                      </Button>
                    )}
                  </div>
                )}

                {/* Unknown number indicator */}
                {!foundCustomer && phone.replace(/\D/g, '').length >= 10 && (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card-elevated px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      New customer — measurements will be saved as a fresh profile.
                    </span>
                  </div>
                )}
              </div>

              {/* Name & Address */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Customer Name / نام"
                  placeholder="Muhammad Usman"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  leftIcon={<User className="h-4 w-4" />}
                />
                <Input
                  label="Address / پتہ"
                  placeholder="Street, Colony, City"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  leftIcon={<MapPin className="h-4 w-4" />}
                />
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              SECTION 2: GARMENT & FABRIC DETAILS
              ================================================================ */}
          <SectionCard
            title="Garment & Fabric"
            urTitle="لباس اور کپڑا"
            icon={<Scissors className="h-4 w-4" />}
          >
            <div className="flex flex-col gap-5">
              {/* Garment type + quantity row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Garment type selector */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Garment Type / قسم
                  </label>
                  <div className="relative">
                    <select
                      value={garmentType}
                      onChange={(e) => setGarmentType(e.target.value as GarmentType)}
                      className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    >
                      {GARMENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.en} / {opt.ur}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Qty / تعداد
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-center text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  />
                </div>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  type="date"
                  label="Delivery Date / ڈیلیوری تاریخ"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  leftIcon={<CalendarDays className="h-4 w-4" />}
                />
                <Input
                  type="date"
                  label="Trial Date (optional) / ٹرائل تاریخ"
                  value={trialDate}
                  onChange={(e) => setTrialDate(e.target.value)}
                  leftIcon={<CalendarDays className="h-4 w-4" />}
                />
              </div>

              {/* Fabric source toggle */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  Fabric Source / کپڑا کس کا؟
                </span>
                <div className="flex gap-2">
                  {(['CUSTOMER', 'SHOP'] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setFabricSource(src)}
                      className={cn(
                        'flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        fabricSource === src
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                      )}
                    >
                      {src === 'CUSTOMER' ? (
                        <span>Customer Fabric <span className="font-urdu-sans text-[0.65rem]">گاہک کا کپڑا</span></span>
                      ) : (
                        <span>Shop Stock <span className="font-urdu-sans text-[0.65rem]">دکان کا کپڑا</span></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fabric details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Fabric Brand / برانڈ"
                  placeholder="Pasha Fabrics, Al-Karam…"
                  value={fabricBrand}
                  onChange={(e) => setFabricBrand(e.target.value)}
                  leftIcon={<Package className="h-4 w-4" />}
                />
                <Input
                  label="Fabric Color / رنگ"
                  placeholder="Charcoal Grey, Off-White…"
                  value={fabricColor}
                  onChange={(e) => setFabricColor(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Fabric Notes / کپڑے کے بارے میں نوٹ
                </label>
                <textarea
                  rows={2}
                  value={fabricNotes}
                  onChange={(e) => setFabricNotes(e.target.value)}
                  placeholder="Customer-supplied 4.5m luxury unstitched fabric…"
                  className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                />
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              SECTION 3: MEASUREMENTS + MANNEQUIN
              ================================================================ */}
          <SectionCard
            title="Measurements"
            urTitle="پیمائش"
            icon={<Ruler className="h-4 w-4" />}
          >
            {/* Mannequin toggle */}
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Bilingual Kameez + Shalwar measurement grid with fractional steppers.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMannequin((prev) => !prev)}
                className="h-8 gap-2 text-xs"
              >
                {showMannequin ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide Diagram
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Body Diagram
                  </>
                )}
              </Button>
            </div>

            {/* Profile lock banner */}
            {isProfileLocked && foundProfile && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Autofilled from{' '}
                  <span className="font-semibold text-primary">
                    {foundProfile.profile_name}
                  </span>
                  . Edit below or{' '}
                  <button
                    type="button"
                    onClick={handleCreateFreshRevision}
                    className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
                  >
                    create a fresh revision
                  </button>
                  .
                </span>
              </div>
            )}

            <div className="flex gap-6">
              {/* Measurement form */}
              <div className={cn('flex-1 min-w-0', showMannequin && 'sm:max-w-[calc(100%-200px)]')}>
                <MeasurementIntakeForm
                  measurements={measurements}
                  stylePreferences={stylePreferences}
                  onMeasurementChange={handleMeasurementChange}
                  onStyleChange={handleStyleChange}
                  activeMeasurementField={activeField}
                  onFieldFocus={setActiveField}
                />
              </div>

              {/* Visual Mannequin Pad */}
              {showMannequin && (
                <div className="hidden sm:block w-48 shrink-0">
                  <div className="sticky top-20">
                    <VisualMannequinPad activeField={activeField} />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ================================================================
              SECTION 4: WORKSHOP STAFF ASSIGNMENT
              ================================================================ */}
          <SectionCard
            title="Workshop Assignment"
            urTitle="ورکشاپ تفویض"
            icon={<Scissors className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Cutting Master */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Cutting Master / ماسٹر کٹر
                </label>
                <div className="relative">
                  <select
                    value={assignedCutterId}
                    onChange={(e) => setAssignedCutterId(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  >
                    <option value="">— Not Assigned —</option>
                    {cuttingMasters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Stitcher */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Stitcher / درزی
                </label>
                <div className="relative">
                  <select
                    value={assignedStitcherId}
                    onChange={(e) => setAssignedStitcherId(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  >
                    <option value="">— Not Assigned —</option>
                    {stitchers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Special notes */}
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Special Instructions / خصوصی ہدایات
              </label>
              <textarea
                rows={3}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Double chest stitching with contrast thread, extra-wide collar band…"
                className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              />
            </div>
          </SectionCard>

          {/* ================================================================
              SECTION 5: FINANCIAL LEDGER
              Real-time: Total = (Stitching × Qty + Fabric + Addons) − Discount
              Balance Due = Total − Advance (floored at 0, never negative)
              ================================================================ */}
          <SectionCard
            title="Payment Ledger"
            urTitle="مالی حساب"
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            <div className="flex flex-col gap-0 divide-y divide-border">
              <FinancialRow
                label={`Stitching Rate (× ${quantity})`}
                urLabel="سلائی ریٹ"
                value={stitchingRate}
                onChange={setStitchingRate}
              />
              <FinancialRow
                label="Fabric Charges"
                urLabel="کپڑے کے اخراجات"
                value={fabricCharges}
                onChange={setFabricCharges}
              />
              <FinancialRow
                label="Addon Charges"
                urLabel="اضافی چارجز"
                value={addonsCharges}
                onChange={setAddonsCharges}
              />
              <FinancialRow
                label="Discount"
                urLabel="رعایت"
                value={discountAmount}
                onChange={setDiscountAmount}
              />

              {/* Divider */}
              <div className="py-1" />

              {/* Total Amount (computed) */}
              <FinancialRow
                label="Total Amount"
                urLabel="کل رقم"
                value={financials.total_amount}
                readOnly
                highlight="gold"
                isBold
              />
              <FinancialRow
                label="Advance Paid"
                urLabel="ایڈوانس ادائیگی"
                value={advancePaid}
                onChange={setAdvancePaid}
              />

              {/* Balance Due / Fully Paid / Credit */}
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {isOverpayment ? 'Credit Balance' : 'Balance Due'}
                  </span>
                  <span
                    dir="rtl"
                    lang="ur"
                    className="font-urdu-sans text-[0.62rem] leading-urdu-data text-muted-foreground"
                  >
                    {isOverpayment ? 'کریڈٹ بیلنس' : 'بقیہ رقم'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Payment status badge */}
                  {financials.payment_status === 'FULLY_PAID' && !isOverpayment ? (
                    <Badge variant="status-ready" className="text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Fully Paid
                    </Badge>
                  ) : isOverpayment ? (
                    <Badge variant="status-stitching" className="text-xs">
                      Credit
                    </Badge>
                  ) : financials.advance_paid > 0 ? (
                    <Badge variant="status-cutting" className="text-xs">
                      Partial
                    </Badge>
                  ) : (
                    <Badge variant="status-booked" className="text-xs">
                      Unpaid
                    </Badge>
                  )}
                  <bdi
                    className={cn(
                      'font-mono text-xl font-bold tabular-nums',
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
              </div>

              {/* Overpayment advisory note */}
              {isOverpayment && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-status-stitching/30 bg-status-stitching/10 px-4 py-3 text-xs text-status-stitching">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Advance exceeds total. A credit of{' '}
                    <bdi dir="ltr" className="font-bold">
                      Rs. {creditBalance.toLocaleString()}
                    </bdi>{' '}
                    will be added to the customer&apos;s Khata as advance deposit.
                  </span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ================================================================
            STICKY ACTION BAR
            ================================================================ */}
        <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card/90 px-6 py-4 shadow-lg backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetForm}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {/* Running total in action bar */}
            <div className="hidden text-right sm:block">
              <p className="text-xs text-muted-foreground">Total</p>
              <bdi
                dir="ltr"
                className="font-mono text-sm font-bold tabular-nums text-primary"
              >
                Rs. {financials.total_amount.toLocaleString('en-PK')}
              </bdi>
            </div>
            <Button variant="outline" size="sm">
              Save Draft
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!customerName.trim() || !deliveryDate}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Book Order
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
