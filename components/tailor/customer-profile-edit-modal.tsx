'use client';

import * as React from 'react';
import {
  User,
  Phone,
  MapPin,
  FileText,
  Ruler,
  Scissors,
  Check,
  X,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/lib/language-provider';
import { MeasurementIntakeForm } from '@/components/tailor/measurement-intake-form';
import { GarmentStyleChips } from '@/components/tailor/garment-style-chips';
import { db, customersDb, measurementsDb } from '@/lib/db';
import { syncEngine } from '@/lib/sync/sync-engine';
import type {
  Customer,
  MeasurementProfile,
  ShalwarKameezMeasurements,
  StylePreferences,
  Shop,
} from '@/types/tailor';

const DEFAULT_MEASUREMENTS: ShalwarKameezMeasurements = {
  kameez_length: 40.0,
  chest: 38.0,
  waist: 36.0,
  shoulder_teera: 18.0,
  sleeve_length: 24.0,
  neck_gala: 15.5,
  daman_width: 22.0,
  shalwar_length: 38.0,
  paincha: 8.5,
  aasan: 16.0,
};

const DEFAULT_STYLES: StylePreferences = {
  collar_style: 'FULL_BAN',
  daman_style: 'CHORAS_DAMAN',
  pocket_config: 'FRONT_ONE_SIDE',
  pockets: ['FRONT_CHEST', 'RIGHT_SIDE'],
  front_patti: 'GUM_PATTI',
  bottom_type: 'SHALWAR_TRADITIONAL',
  stitch_type: 'DOUBLE_SILAI',
};

export interface CustomerProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  shop: Shop;
  onSaved: (customer: Customer, profile?: MeasurementProfile) => void;
}

export function CustomerProfileEditModal({
  open,
  onOpenChange,
  customer,
  shop,
  onSaved,
}: CustomerProfileEditModalProps) {
  const { customersT, language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const [activeTab, setActiveTab] = React.useState<'contact' | 'measurements' | 'styles'>('contact');
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [alternatePhone, setAlternatePhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [city, setCity] = React.useState('Wah Cantt');
  const [notes, setNotes] = React.useState('');

  const [measurements, setMeasurements] = React.useState<ShalwarKameezMeasurements>(DEFAULT_MEASUREMENTS);
  const [stylePreferences, setStylePreferences] = React.useState<StylePreferences>(DEFAULT_STYLES);
  const [existingProfile, setExistingProfile] = React.useState<MeasurementProfile | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Hydrate state when modal opens or customer changes
  React.useEffect(() => {
    if (!open) return;

    if (customer) {
      setFullName(customer.full_name || '');
      setPhone(customer.phone || '');
      setAlternatePhone(customer.alternate_phone || '');
      setAddress(customer.address || '');
      setCity(customer.city || 'Wah Cantt');
      setNotes(customer.notes || '');

      // Load existing measurement profile
      measurementsDb
        .getByCustomerId(customer.id)
        .then((profiles) => {
          if (profiles && profiles.length > 0) {
            const defaultProf = profiles.find((p) => p.is_default) || profiles[0];
            setExistingProfile(defaultProf);
            if (defaultProf.measurements) {
              setMeasurements({ ...DEFAULT_MEASUREMENTS, ...defaultProf.measurements });
            }
            if (defaultProf.style_preferences) {
              setStylePreferences({ ...DEFAULT_STYLES, ...defaultProf.style_preferences });
            }
          } else {
            setExistingProfile(null);
            setMeasurements(DEFAULT_MEASUREMENTS);
            setStylePreferences(DEFAULT_STYLES);
          }
        })
        .catch(() => {
          setExistingProfile(null);
        });
    } else {
      // Create new customer mode
      setFullName('');
      setPhone('');
      setAlternatePhone('');
      setAddress('');
      setCity('Wah Cantt');
      setNotes('');
      setExistingProfile(null);
      setMeasurements(DEFAULT_MEASUREMENTS);
      setStylePreferences(DEFAULT_STYLES);
    }
    setActiveTab('contact');
    setErrorMsg(null);
  }, [open, customer]);

  const handleMeasurementChange = (key: keyof ShalwarKameezMeasurements, value: number) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const handleStyleChange = <K extends keyof StylePreferences>(key: K, value: StylePreferences[K]) => {
    setStylePreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMsg(language === 'ur' ? 'براہ کرم گاہک کا نام درج کریں' : 'Please enter customer name');
      setActiveTab('contact');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg(language === 'ur' ? 'براہ کرم موبائل نمبر درج کریں' : 'Please enter mobile number');
      setActiveTab('contact');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const customerId = customer?.id || crypto.randomUUID();
      const profileId = existingProfile?.id || crypto.randomUUID();

      const effectiveCustomer: Customer = {
        id: customerId,
        shop_id: shop.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        alternate_phone: alternatePhone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || 'Wah Cantt',
        notes: notes.trim() || null,
        total_orders_count: customer?.total_orders_count || 0,
        total_spent: customer?.total_spent || 0,
        current_khata_balance: customer?.current_khata_balance || 0,
        created_at: customer?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const effectiveProfile: MeasurementProfile = {
        id: profileId,
        shop_id: shop.id,
        customer_id: effectiveCustomer.id,
        profile_name: existingProfile?.profile_name || `${fullName.trim()} - Standard Fit`,
        garment_type: existingProfile?.garment_type || 'MEN_SHALWAR_KAMEEZ',
        measurements,
        style_preferences: stylePreferences,
        is_default: true,
        created_at: existingProfile?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Commit to local IndexedDB (Dexie)
      await db.transaction('rw', [db.customers, db.measurements], async () => {
        await db.customers.put({
          ...effectiveCustomer,
          sync_status: 'pending',
          sync_retry_count: 0,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        });

        await db.measurements.put({
          ...effectiveProfile,
          sync_status: 'pending',
          sync_retry_count: 0,
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        });
      });

      // 2. Trigger non-blocking cloud synchronization
      syncEngine.processQueue().catch(console.error);

      // 3. Callback and close
      onSaved(effectiveCustomer, effectiveProfile);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to save customer profile:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="customer-profile-edit-modal"
        className="w-[95vw] max-w-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col overflow-hidden"
        hideCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-foreground font-urdu-sans leading-tight">
                  {customer ? customersT.editCustomerTitle : customersT.addCustomerBtn}
                </h2>
                {customer && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/60">
                    <bdi dir="ltr">{`#CUST-${(customer.phone.replace(/\D/g, '') || customer.id.replace(/-/g, '')).slice(-4)}`}</bdi>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-urdu-sans mt-0.5">
                {customer ? customer.full_name : customersT.saveProfileOnlySub}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 font-urdu-sans">
            {errorMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="pt-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-background/80 p-1 border border-border">
            <button
              type="button"
              data-testid="modal-tab-contact"
              onClick={() => setActiveTab('contact')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold font-urdu-sans transition-all ${
                activeTab === 'contact'
                  ? 'bg-card text-primary shadow-xs border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>{customersT.tabContact}</span>
            </button>

            <button
              type="button"
              data-testid="modal-tab-measurements"
              onClick={() => setActiveTab('measurements')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold font-urdu-sans transition-all ${
                activeTab === 'measurements'
                  ? 'bg-card text-primary shadow-xs border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>{customersT.tabMeasurements}</span>
            </button>

            <button
              type="button"
              data-testid="modal-tab-styles"
              onClick={() => setActiveTab('styles')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold font-urdu-sans transition-all ${
                activeTab === 'styles'
                  ? 'bg-card text-primary shadow-xs border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>{customersT.tabStyles}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* TAB 1: Contact & Personal Info */}
          {activeTab === 'contact' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-urdu-sans flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>نام گاہک (Customer Name) *</span>
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: طارق محمود"
                    className="h-10 text-sm font-urdu-sans"
                    data-testid="customer-name-edit-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-urdu-sans flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>موبائل نمبر (Mobile Number) *</span>
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                    inputMode="tel"
                    className="h-10 text-sm font-mono"
                    data-testid="customer-phone-edit-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-urdu-sans flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>متبادل فون (Alternate Phone)</span>
                  </label>
                  <Input
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    placeholder="0321..."
                    inputMode="tel"
                    className="h-10 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-urdu-sans flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>شہر (City)</span>
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Wah Cantt"
                    className="h-10 text-sm font-urdu-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-urdu-sans flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>مکمل پتہ (Address & Sector)</span>
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="محلہ، گلی نمبر، سیکٹر وغیرہ..."
                  className="h-10 text-sm font-urdu-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-urdu-sans flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>خصوصی نوٹس و ہدایات (Special Notes)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: ڈھیلا ناپ پسند ہے، کالر پر دوہری سلائی وغیرہ..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-urdu-sans focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Measurement Matrix */}
          {activeTab === 'measurements' && (
            <div className="animate-fade-in space-y-3">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary font-urdu-sans">
                سائز کی تبدیلی کے لیے متعلقہ خانے میں انچ درج کریں اور سوتر کے لیے (¼، ½، ¾) بٹن دبائیں۔
              </div>
              <MeasurementIntakeForm
                measurements={measurements}
                stylePreferences={stylePreferences}
                onMeasurementChange={handleMeasurementChange}
                onStyleChange={handleStyleChange}
              />
            </div>
          )}

          {/* TAB 3: Style Preferences */}
          {activeTab === 'styles' && (
            <div className="animate-fade-in space-y-4">
              <GarmentStyleChips
                collarStyle={stylePreferences.collar_style}
                damanStyle={stylePreferences.daman_style}
                frontPatti={stylePreferences.front_patti}
                pockets={stylePreferences.pockets}
                onChange={(key, val) => {
                  const mappedKey =
                    key === 'collarStyle'
                      ? 'collar_style'
                      : key === 'damanStyle'
                      ? 'daman_style'
                      : key === 'frontPatti'
                      ? 'front_patti'
                      : key;
                  setStylePreferences((prev) => ({ ...prev, [mappedKey]: val }));
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/70 pt-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-urdu-sans"
          >
            <X className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
            <span>{customersT.cancel}</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            className="text-xs font-bold font-urdu-sans bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            data-testid="customer-save-modal-btn"
          >
            <Check className="h-3.5 w-3.5 mr-1 rtl:ml-1 rtl:mr-0" />
            <span>{customersT.saveChanges}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
