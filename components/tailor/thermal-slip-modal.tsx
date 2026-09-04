'use client';

import * as React from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  Tag,
  Receipt,
  RotateCcw,
  Sparkles,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarcodeRenderer } from '@/components/tailor/barcode-renderer';
import { printerDb } from '@/lib/db';
import {
  mapOrderToSlipData,
  generateFabricTagSlipText,
  generateCustomerInvoiceSlipText,
  buildFabricTagBinary,
  buildCustomerInvoiceBinary,
  downloadEscPosBinaryFile,
  formatCurrency,
  formatInch,
  formatDateDisplay,
  formatTimeDisplay,
  type EscPosSlipData,
} from '@/lib/escpos';
import type { GarmentOrder, Customer, Shop, PrinterSettings, PrinterPaperWidth } from '@/types/tailor';

export interface ThermalSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: GarmentOrder | null;
  customer?: Customer | null;
  shop?: Shop | null;
  initialFormat?: PrinterPaperWidth;
  settings?: Partial<PrinterSettings> | null;
}

export function ThermalSlipModal({
  open,
  onOpenChange,
  order,
  customer,
  shop,
  initialFormat,
  settings,
}: ThermalSlipModalProps) {
  const [format, setFormat] = React.useState<PrinterPaperWidth>(initialFormat || '80mm');
  const [isCopied, setIsCopied] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [loadedSettings, setLoadedSettings] = React.useState<PrinterSettings | null>(null);

  // Load shop printer settings on open if not explicitly supplied
  React.useEffect(() => {
    let isMounted = true;
    if (open) {
      if (shop?.id && !settings) {
        printerDb.getByShopId(shop.id).then((s) => {
          if (isMounted && s) {
            setLoadedSettings(s);
            if (!initialFormat) {
              setFormat(s.paper_width);
            }
          }
        }).catch(() => {});
      } else if (settings?.paper_width && !initialFormat) {
        setFormat(settings.paper_width);
      } else if (initialFormat) {
        setFormat(initialFormat);
      }
      setIsCopied(false);
    }
    return () => {
      isMounted = false;
    };
  }, [open, initialFormat, settings, shop?.id]);

  if (!order) return null;

  const effectiveSettings: Partial<PrinterSettings> = {
    paper_width: format,
    show_barcode: settings?.show_barcode ?? loadedSettings?.show_barcode ?? true,
    show_qr_tracking: settings?.show_qr_tracking ?? loadedSettings?.show_qr_tracking ?? true,
    show_urdu_labels: settings?.show_urdu_labels ?? loadedSettings?.show_urdu_labels ?? true,
    feed_lines: settings?.feed_lines ?? loadedSettings?.feed_lines ?? 3,
  };

  const slipData: EscPosSlipData = mapOrderToSlipData(order, customer || undefined, shop || undefined);
  const m = slipData.measurements || {};
  const is58 = format === '58mm';

  const plainText = is58
    ? generateFabricTagSlipText(slipData, effectiveSettings)
    : generateCustomerInvoiceSlipText(slipData, effectiveSettings);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
      setIsCopied(false);
    }
  };

  const handleDownloadBin = () => {
    const bytes = is58
      ? buildFabricTagBinary(slipData, effectiveSettings)
      : buildCustomerInvoiceBinary(slipData, effectiveSettings);
    const filename = `${slipData.orderNumber}-${format}.bin`;
    downloadEscPosBinaryFile(bytes, filename);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[92vh] max-w-2xl overflow-y-auto bg-card border-border">
        <DialogTitle className="sr-only">Order Action</DialogTitle>
        <DialogDescription className="sr-only">Order details and actions</DialogDescription>
        {/* Header with Format Switcher */}
        <DialogHeader className="space-y-3 pb-2 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Thermal Slip & Fabric Tag
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Order <span className="font-mono text-primary font-bold">{slipData.orderNumber}</span> • {slipData.customerName}
                </DialogDescription>
              </div>
            </div>

            {/* Paper Width Toggle Buttons */}
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setFormat('58mm')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  is58
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>58mm Fabric Tag</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('80mm')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  !is58
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>80mm Invoice</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Paper Info Ribbon */}
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/40 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold text-foreground">
              {is58 ? '58 mm (2-inch roll • 32 Chars)' : '80 mm (3-inch roll • 48 Chars)'}
            </span>
            <span>•</span>
            <span>{is58 ? 'Workshop Cut Tag (Cloth Staple)' : 'Customer Booking Receipt'}</span>
          </div>
          {slipData.isUrgent && (
            <Badge variant="status-overdue" className="text-[10px] px-1.5 py-0">
              Urgent Delivery
            </Badge>
          )}
        </div>

        {/* Interactive Thermal Paper Preview Container */}
        <div className="flex justify-center bg-muted/30 p-4 rounded-xl border border-border/60 overflow-x-auto">
          {/* Printable Thermal Receipt Card */}
          <div
            id="printable-slip-area"
            className={cn(
              'printable-thermal-slip bg-white text-black font-mono rounded shadow-sm border border-neutral-300 p-4 text-[11px] leading-snug transition-all select-text',
              is58 ? 'w-[280px] slip-58mm' : 'w-[380px] slip-80mm'
            )}
            style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
          >
            {is58 ? (
              /* ================= 58mm Fabric Tag Preview ================= */
              <div className="space-y-1.5">
                <div className="text-center font-bold tracking-tight">
                  <div>================================</div>
                  <div className="text-xs">SILAYE TAG</div>
                  <div className="text-sm tracking-wider font-extrabold">{slipData.shopName.toUpperCase()}</div>
                  <div>================================</div>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-bold">Order #:</span>
                    <span className="font-bold">{slipData.orderNumber}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700">
                    <span>Date: {slipData.bookingDate}</span>
                    <span>{slipData.bookingTime}</span>
                  </div>
                  <div>Cust: <span className="font-semibold">{slipData.customerName}</span></div>
                  <div>Phone: {slipData.customerPhone}</div>
                </div>

                <div className="border-t border-dashed border-black pt-1 space-y-0.5">
                  <div className="font-bold flex items-baseline justify-between gap-1">
                    <span>ITEM: {slipData.garmentType.toUpperCase()} ({slipData.quantity || 1} PR)</span>
                    {effectiveSettings.show_urdu_labels && slipData.garmentTypeUr && (
                      <span className="font-urdu-sans text-[10px] text-neutral-800" dir="rtl">
                        {slipData.garmentTypeUr}
                      </span>
                    )}
                  </div>
                  {slipData.trialDate && (
                    <div>TRIAL: {formatDateDisplay(slipData.trialDate)}</div>
                  )}
                  <div className="font-bold">
                    DELIVERY: {formatDateDisplay(slipData.deliveryDate)}
                    {slipData.isUrgent && ' [URGENT]'}
                  </div>
                </div>

                {/* 3x3 Measurement Grid */}
                <div className="border-t border-dashed border-black pt-1">
                  <div className="text-center font-bold text-[10px] pb-0.5">MEASUREMENTS (INCH)</div>
                  <div className="grid grid-cols-3 text-center border border-black font-semibold text-[11px] divide-x divide-black bg-neutral-50/50">
                    <div className="py-0.5">L: {formatInch(m.kameez_length)}</div>
                    <div className="py-0.5">C: {formatInch(m.chest)}</div>
                    <div className="py-0.5">W: {formatInch(m.waist)}</div>
                  </div>
                  <div className="grid grid-cols-3 text-center border-x border-b border-black font-semibold text-[11px] divide-x divide-black bg-neutral-50/50">
                    <div className="py-0.5">T: {formatInch(m.shoulder_teera)}</div>
                    <div className="py-0.5">B: {formatInch(m.sleeve_length)}</div>
                    <div className="py-0.5">G: {formatInch(m.neck_gala)}</div>
                  </div>
                  <div className="grid grid-cols-3 text-center border-x border-b border-black font-semibold text-[11px] divide-x divide-black bg-neutral-50/50">
                    <div className="py-0.5">P: {formatInch(m.paincha)}</div>
                    <div className="py-0.5">A: {formatInch(m.aasan)}</div>
                    <div className="py-0.5">D: {formatInch(m.daman_width)}</div>
                  </div>
                </div>

                {/* Cuts & Specs */}
                {(slipData.cutStyles?.length || slipData.pocketConfig || slipData.fabricColor) && (
                  <div className="border-t border-dashed border-black pt-1 text-[10px] space-y-0.5">
                    {slipData.cutStyles && slipData.cutStyles.length > 0 && (
                      <div>CUT: <span className="font-semibold">{slipData.cutStyles.join(' | ')}</span></div>
                    )}
                    {slipData.pocketConfig && (
                      <div>PKT: {slipData.pocketConfig}</div>
                    )}
                    {(slipData.fabricColor || slipData.fabricBrand) && (
                      <div>FAB: {[slipData.fabricColor, slipData.fabricBrand].filter(Boolean).join(' - ')}</div>
                    )}
                  </div>
                )}

                {/* Financials */}
                <div className="border-t border-dashed border-black pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Total: Rs. {formatCurrency(slipData.totalAmount)}</span>
                    <span>Adv: Rs. {formatCurrency(slipData.advancePaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black pt-0.5">
                    <span>BAL DUE:</span>
                    <span>Rs. {formatCurrency(slipData.balanceDue)}</span>
                  </div>
                </div>

                {/* Barcode (if enabled) */}
                {effectiveSettings.show_barcode !== false && (
                  <div className="border-t border-dashed border-black pt-2 text-center">
                    <BarcodeRenderer
                      value={slipData.orderNumber}
                      format="svg"
                      height={40}
                      moduleWidth={1.4}
                      displayValue={true}
                      barColor="#000000"
                      backgroundColor="transparent"
                    />
                    <div className="text-center text-[10px] pt-1">================================</div>
                  </div>
                )}
              </div>
            ) : (
              /* ================= 80mm Customer Invoice Preview ================= */
              <div className="space-y-2">
                <div className="text-center font-bold tracking-tight">
                  <div>================================================</div>
                  <div className="text-base font-black tracking-wider">{slipData.shopName.toUpperCase()}</div>
                  {slipData.shopAddress && <div className="text-[10px] font-normal">{slipData.shopAddress}</div>}
                  {slipData.shopPhone && <div className="text-[10px] font-normal">Tel: {slipData.shopPhone}</div>}
                  <div>================================================</div>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Receipt #: <strong className="font-bold">{slipData.orderNumber}</strong></span>
                    <span>Date: {slipData.bookingDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer: <strong className="font-bold">{slipData.customerName}</strong></span>
                    <span>Time: {slipData.bookingTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone: {slipData.customerPhone}</span>
                    <span>Status: <strong className="font-bold">{slipData.paymentStatus || 'BOOKED'}</strong></span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="border-t border-dashed border-black pt-1">
                  <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-black">
                    <span className="w-1/2">Item Description</span>
                    <span className="w-12 text-center">Qty</span>
                    <span className="w-16 text-right">Rate</span>
                    <span className="w-20 text-right">Amount</span>
                  </div>
                  <div className="pt-1 space-y-1 text-[11px]">
                    <div className="flex justify-between items-start">
                      <div className="w-1/2 min-w-0 pr-1">
                        <div className="truncate font-medium">{slipData.garmentType}</div>
                        {effectiveSettings.show_urdu_labels && slipData.garmentTypeUr && (
                          <div className="font-urdu-sans text-[10px] text-neutral-600 truncate" dir="rtl">
                            {slipData.garmentTypeUr}
                          </div>
                        )}
                      </div>
                      <span className="w-12 text-center">{slipData.quantity || 1}</span>
                      <span className="w-16 text-right">{formatCurrency(slipData.stitchingRate || slipData.totalAmount)}</span>
                      <span className="w-20 text-right font-medium">{formatCurrency((slipData.stitchingRate || slipData.totalAmount) * (slipData.quantity || 1))}.00</span>
                    </div>
                    {slipData.fabricCharges && slipData.fabricCharges > 0 && (
                      <div className="flex justify-between text-neutral-700">
                        <span className="w-1/2 truncate">Fabric Material Charges</span>
                        <span className="w-12 text-center">1</span>
                        <span className="w-16 text-right">{formatCurrency(slipData.fabricCharges)}</span>
                        <span className="w-20 text-right">{formatCurrency(slipData.fabricCharges)}.00</span>
                      </div>
                    )}
                    {slipData.addonsCharges && slipData.addonsCharges > 0 && (
                      <div className="flex justify-between text-neutral-700">
                        <span className="w-1/2 truncate">Styling & Addons</span>
                        <span className="w-12 text-center">1</span>
                        <span className="w-16 text-right">{formatCurrency(slipData.addonsCharges)}</span>
                        <span className="w-20 text-right">{formatCurrency(slipData.addonsCharges)}.00</span>
                      </div>
                    )}
                    {slipData.discountAmount && slipData.discountAmount > 0 && (
                      <div className="flex justify-between text-neutral-700">
                        <span className="w-1/2 truncate">Discount Applied</span>
                        <span className="w-12 text-center">1</span>
                        <span className="w-16 text-right">-{formatCurrency(slipData.discountAmount)}</span>
                        <span className="w-20 text-right">-{formatCurrency(slipData.discountAmount)}.00</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotal & Balance */}
                <div className="border-t border-dashed border-black pt-1 space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {formatCurrency(slipData.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Advance Deposit (Cash):</span>
                    <span>Rs. {formatCurrency(slipData.advancePaid)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                    <span>NET BALANCE DUE UPON PICKUP:</span>
                    <span>Rs. {formatCurrency(slipData.balanceDue)}</span>
                  </div>
                </div>

                {/* Deadlines */}
                <div className="border-t border-dashed border-black pt-1 text-[11px] space-y-0.5">
                  {slipData.trialDate && (
                    <div className="flex justify-between">
                      <span>Trial Date:</span>
                      <span className="font-semibold">{formatDateDisplay(slipData.trialDate)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Delivery Date:</span>
                    <span>{formatDateDisplay(slipData.deliveryDate)}{slipData.isUrgent && ' (URGENT)'}</span>
                  </div>
                </div>

                {/* Terms */}
                <div className="border-t border-dashed border-black pt-1 text-[9px] text-neutral-600 space-y-0.5 leading-tight">
                  <div>* NOTE: Please present this slip for trial/delivery.</div>
                  <div>* Clothes not claimed within 30 days are not our responsibility.</div>
                </div>

                {/* Barcode & Tracking */}
                {(effectiveSettings.show_qr_tracking !== false || effectiveSettings.show_barcode !== false) && (
                  <div className="border-t border-dashed border-black pt-2 text-center">
                    {effectiveSettings.show_qr_tracking !== false && (
                      <div className="text-[10px] text-neutral-700 pb-1">
                        Track Live: silaye.com/track/{slipData.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}
                      </div>
                    )}
                    {effectiveSettings.show_barcode !== false && (
                      <BarcodeRenderer
                        value={slipData.orderNumber}
                        format="svg"
                        height={46}
                        moduleWidth={1.8}
                        displayValue={true}
                        barColor="#000000"
                        backgroundColor="transparent"
                      />
                    )}
                    <div className="text-center text-[10px] pt-1">================================================</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="flex-1 sm:flex-none gap-1.5 text-xs"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-status-ready" />
                  <span>Copied Text!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadBin}
              className="flex-1 sm:flex-none gap-1.5 text-xs"
              title="Download raw binary stream for POS hardware"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ESC/POS (.bin)</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none text-muted-foreground"
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-none gap-1.5 font-bold shadow-md"
            >
              <Printer className="h-4 w-4" />
              <span>Print {is58 ? '58mm Tag' : '80mm Slip'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
