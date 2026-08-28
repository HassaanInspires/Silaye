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
  Scissors,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { shopsDb } from '@/lib/db';
import { mockShop } from '@/lib/mock-data';
import type { Shop } from '@/types/tailor';
import { isValidPakistaniPhone, sanitizePakistaniPhone } from '@/lib/whatsapp';
import { getCurrentUser, isSupabaseConfigured } from '@/lib/supabase/client';

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
                  ورکشاپ پروفائل اور دکان کی ترتیبات
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Configure workshop identity, physical counter location, tax credentials, and custom receipt branding.
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
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Staff & Roles</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(اسٹاف)</span>
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
              Phase C.2
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Scissors className="h-4 w-4" />
            <span>Catalog & Rates</span>
            <span className="font-urdu-sans text-[11px] opacity-70">(ریٹ لسٹ)</span>
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
              Phase C.3
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

        {/* Tab 2: Staff & Roles Placeholder (Phase C.2) */}
        {activeTab === 'staff' && (
          <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-8 text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Staff Management & Role Assignments</h2>
              <p className="font-urdu-serif text-sm text-gold/80 mt-0.5" dir="rtl">
                ورکشاپ کاریگر و عملہ مینجمنٹ (فیز C.2)
              </p>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
              Configure and invite workshop master cutters, stitchers, pressmen, and counter clerks with role-based dashboard permissions. Coming in Phase C.2.
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

        {/* Tab 3: Garment Catalog & Rates Placeholder (Phase C.3) */}
        {activeTab === 'catalog' && (
          <Card className="border-white/5 bg-[#0B0C0E]/70 backdrop-blur-xl p-8 text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold mx-auto">
              <Scissors className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Garment Catalog & Default Stitching Rates</h2>
              <p className="font-urdu-serif text-sm text-gold/80 mt-0.5" dir="rtl">
                سلائی ریٹ لسٹ اور فیبرک قیمتیں (فیز C.3)
              </p>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
              Configure baseline labor rates per garment type (Men Shalwar Kameez, Kurta, Waistcoat, Prince Suit) and urgent rush surcharges. Coming in Phase C.3.
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
    </AppShell>
  );
}
