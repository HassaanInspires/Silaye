'use client';

import * as React from 'react';
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Eye,
  CheckCheck,
  AlertCircle,
  Phone,
  User,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  sanitizePakistaniPhone,
  isValidPakistaniPhone,
  formatPakistaniPhoneDisplay,
  generateBookingReceiptMessage,
  generateOrderReadyMessage,
  generateKhataReminderMessage,
  createReceiptPayload,
  createKhataPayload,
  buildWhatsAppLink,
  openWhatsAppLink,
} from '@/lib/whatsapp';
import { mockShop } from '@/lib/mock-data';
import type { GarmentOrder, Customer, Shop } from '@/types/tailor';

export type WhatsAppTemplateType = 'booking' | 'ready' | 'khata';

export interface WhatsAppReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: GarmentOrder | null;
  customer?: Customer | null;
  shop?: Shop | null;
  initialTemplate?: WhatsAppTemplateType;
}

export function WhatsAppReceiptModal({
  open,
  onOpenChange,
  order,
  customer,
  shop = mockShop,
  initialTemplate = 'booking',
}: WhatsAppReceiptModalProps) {
  const [activeTab, setActiveTab] = React.useState<WhatsAppTemplateType>(initialTemplate);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [customMessage, setCustomMessage] = React.useState<string>('');
  const [customPhone, setCustomPhone] = React.useState<string>('');
  const [copied, setCopied] = React.useState<boolean>(false);
  const [isDispatching, setIsDispatching] = React.useState<boolean>(false);

  // Sync initial tab when props or opening state changes
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTemplate);
      setIsEditing(false);
      setCustomMessage('');
      setCopied(false);
      setIsDispatching(false);
      if (customer?.phone) {
        setCustomPhone(customer.phone);
      }
    }
  }, [open, initialTemplate, customer]);

  // Derived effective customer and order entities
  const effectiveCustomer: Customer = React.useMemo(() => {
    if (customer) return customer;
    return {
      id: 'cust-temp',
      shop_id: shop?.id || 'shop-1',
      full_name: 'Valued Customer',
      phone: '03001234567',
      alternate_phone: null,
      address: 'Wah Cantt',
      city: 'Wah Cantt',
      notes: null,
      total_orders_count: 1,
      total_spent: order?.total_amount || 0,
      current_khata_balance: order?.balance_due || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [customer, shop, order]);

  const effectiveOrder: GarmentOrder = React.useMemo(() => {
    if (order) return order;
    return {
      id: 'ord-temp',
      order_number: 'DP-2026-0001',
      shop_id: shop?.id || 'shop-1',
      customer_id: effectiveCustomer.id,
      measurement_profile_id: null,
      status: 'BOOKED',
      garment_type: 'MEN_SHALWAR_KAMEEZ',
      quantity: 1,
      booking_date: new Date().toISOString(),
      trial_date: null,
      delivery_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      actual_delivery_date: null,
      fabric_provided_by: 'CUSTOMER',
      fabric_color: 'Navy Blue',
      fabric_brand: 'Grace Fabrics',
      fabric_pieces_count: 1,
      fabric_notes: null,
      stitching_rate: 2500,
      fabric_charges: 0,
      addons_charges: 0,
      discount_amount: 0,
      total_amount: 2500,
      advance_paid: 1000,
      balance_due: 1500,
      payment_status: 'PARTIALLY_PAID',
      assigned_cutter_id: null,
      assigned_stitcher_id: null,
      snapshot_measurements: {
        kameez_length: 42,
        chest: 40,
        waist: 38,
        shoulder_teera: 17.5,
        sleeve_length: 24,
        neck_gala: 15.5,
        daman_width: 22,
        shalwar_length: 39,
        paincha: 8.5,
        aasan: 17,
      },
      snapshot_styles: {
        collar_style: 'FULL_BAN',
        daman_style: 'CHORAS_DAMAN',
        pocket_config: 'FRONT_ONE_SIDE',
        front_patti: 'GUM_PATTI',
        bottom_type: 'SHALWAR_TRADITIONAL',
        stitch_type: 'DOUBLE_SILAI',
      },
      barcode_token: 'BC-2026-0001',
      public_tracking_key: 'track-demo-key-0001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [order, effectiveCustomer, shop]);

  // Generate template payloads
  const receiptPayload = React.useMemo(() => {
    return createReceiptPayload(effectiveOrder, effectiveCustomer, shop);
  }, [effectiveOrder, effectiveCustomer, shop]);

  const khataPayload = React.useMemo(() => {
    return createKhataPayload(effectiveCustomer, shop);
  }, [effectiveCustomer, shop]);

  // Compute default template text
  const defaultMessage = React.useMemo(() => {
    switch (activeTab) {
      case 'booking':
        return generateBookingReceiptMessage(receiptPayload);
      case 'ready':
        return generateOrderReadyMessage(receiptPayload);
      case 'khata':
        return generateKhataReminderMessage(khataPayload);
      default:
        return generateBookingReceiptMessage(receiptPayload);
    }
  }, [activeTab, receiptPayload, khataPayload]);

  const activeMessage = isEditing ? customMessage : defaultMessage;

  // Phone number resolution and validation
  const effectivePhone = customPhone.trim() || effectiveCustomer.phone;
  const isPhoneValid = isValidPakistaniPhone(effectivePhone);
  const sanitizedPhone = sanitizePakistaniPhone(effectivePhone);
  const formattedPhone = formatPakistaniPhoneDisplay(effectivePhone);

  // Deep-link URL
  const whatsAppUrl = React.useMemo(() => {
    return buildWhatsAppLink(effectivePhone, activeMessage);
  }, [effectivePhone, activeMessage]);

  // Handle Tab Switch
  const handleTabChange = (val: string) => {
    const nextTab = val as WhatsAppTemplateType;
    setActiveTab(nextTab);
    setIsEditing(false);
    setCustomMessage('');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Dispatch WhatsApp link
  const handleSendWhatsApp = async () => {
    if (!isPhoneValid) return;
    setIsDispatching(true);
    try {
      await openWhatsAppLink(whatsAppUrl);
    } finally {
      setTimeout(() => setIsDispatching(false), 1200);
    }
  };

  const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 bg-card border-border sm:rounded-2xl shadow-2xl">
        {/* ================================================================
            MODAL HEADER
            ================================================================ */}
        <div className="border-b border-border/80 bg-muted/30 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-inner">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span>WhatsApp Receipt & Alert Engine</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                    wa.me
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  1-Click zero-cost digital receipt, pickup alert & Khata ledger reminder
                </DialogDescription>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span
                dir="rtl"
                lang="ur"
                className="font-urdu-serif text-sm leading-urdu-display text-primary block"
              >
                واٹس ایپ رسید و اطلاع
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                #{effectiveOrder.order_number}
              </span>
            </div>
          </div>

          {/* Customer & Recipient Banner */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border/60 bg-card/60 p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{effectiveCustomer.full_name}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-foreground font-medium">{formattedPhone}</span>
              {isPhoneValid ? (
                <Badge variant="status-ready" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                  Valid PK
                </Badge>
              ) : (
                <Badge variant="status-overdue" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                  Invalid Phone
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">Bal Due:</span>
              <span
                className={cn(
                  'font-mono font-semibold',
                  effectiveOrder.balance_due > 0 ? 'text-amber-400' : 'text-emerald-400'
                )}
              >
                Rs. {effectiveOrder.balance_due.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================
            TEMPLATE SELECTOR TABS
            ================================================================ */}
        <div className="px-6 pt-4 pb-2">
          <Tabs
            defaultValue={initialTemplate}
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-xl">
              <TabsTrigger
                value="booking"
                className="text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm gap-1.5"
              >
                <span>📋 Booking</span>
                <span className="hidden sm:inline font-urdu-sans text-[10px]">(بکنگ)</span>
              </TabsTrigger>
              <TabsTrigger
                value="ready"
                className="text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm gap-1.5"
              >
                <span>🔔 Ready Alert</span>
                <span className="hidden sm:inline font-urdu-sans text-[10px]">(تیار)</span>
              </TabsTrigger>
              <TabsTrigger
                value="khata"
                className="text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm gap-1.5"
              >
                <span>💰 Khata Balance</span>
                <span className="hidden sm:inline font-urdu-sans text-[10px]">(کھاتہ)</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ================================================================
            MESSAGE PREVIEW AREA (WHATSAPP CHAT BUBBLE SIMULATION)
            ================================================================ */}
        <div className="px-6 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Message Preview
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                ({activeMessage.length} chars)
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!isEditing) {
                  setCustomMessage(defaultMessage);
                }
                setIsEditing(!isEditing);
              }}
              className="h-7 text-xs text-muted-foreground hover:text-primary gap-1 px-2"
            >
              {isEditing ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Customize</span>
                </>
              )}
            </Button>
          </div>

          {/* Chat Container */}
          <div className="relative rounded-xl border border-emerald-900/40 bg-[#0c1317] p-4 shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar">
            {/* Background subtle doodle pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(#25D366 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            />

            {isEditing ? (
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={9}
                dir="rtl"
                className="w-full rounded-lg border border-emerald-500/30 bg-[#005c4b]/20 p-3 font-urdu-sans text-xs leading-relaxed text-emerald-100 placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="پیغام یہاں ترمیم کریں..."
              />
            ) : (
              <div className="relative ml-auto max-w-[92%] rounded-2xl rounded-tr-none bg-[#005c4b] border border-emerald-500/20 p-3.5 text-emerald-50 shadow-md">
                <div
                  dir="rtl"
                  lang="ur"
                  className="font-urdu-sans text-xs leading-urdu-data whitespace-pre-wrap select-text selection:bg-emerald-700 text-emerald-50"
                >
                  {activeMessage}
                </div>

                {/* WhatsApp Chat Bubble Tail & Meta info */}
                <div className="mt-2.5 flex items-center justify-end gap-1.5 text-[10px] text-emerald-200/70 select-none">
                  <span>{currentTimeStr}</span>
                  <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================
            PHONE NUMBER EDIT / FALLBACK WARNING
            ================================================================ */}
        {!isPhoneValid && (
          <div className="px-6 py-1">
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <span>Enter valid Pakistani mobile number to enable direct WhatsApp dispatch:</span>
              </div>
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="03001234567"
                className="h-7 w-36 rounded border border-rose-500/40 bg-card px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>
        )}

        {/* ================================================================
            MODAL ACTION FOOTER
            ================================================================ */}
        <div className="border-t border-border/80 bg-muted/20 px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="w-full sm:w-auto text-xs gap-1.5 hover:border-primary/50"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copy Message</span>
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground w-full sm:w-auto"
            >
              Close
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!isPhoneValid || isDispatching}
              onClick={handleSendWhatsApp}
              className={cn(
                'w-full sm:w-auto text-xs font-semibold gap-1.5 shadow-lg transition-all',
                'bg-[#25D366] hover:bg-[#20ba59] text-black hover:text-black border-none'
              )}
            >
              {isDispatching ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span>Opening WhatsApp...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send on WhatsApp</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WhatsAppReceiptModal;
