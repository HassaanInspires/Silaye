'use client';

import * as React from 'react';
import {
  Bookmark,
  Scissors,
  Layers,
  CircleDot,
  Flame,
  CheckCircle,
  PackageCheck,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GarmentOrder, Customer, Staff, OrderStatus, OrderStatusLog } from '@/types/tailor';
import { OrderCard } from './order-card';

export interface PipelineColumnDef {
  id: string;
  label: string;
  labelUrdu: string;
  statuses: OrderStatus[];
  nextStatus: OrderStatus;
  prevStatus: OrderStatus | null;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  accentBg: string;
}

export const PIPELINE_COLUMNS: PipelineColumnDef[] = [
  {
    id: 'booked',
    label: 'Booked',
    labelUrdu: 'بک شدہ',
    statuses: ['BOOKED', 'FABRIC_RECEIVED'],
    nextStatus: 'IN_CUTTING',
    prevStatus: null,
    icon: Bookmark,
    accentColor: 'text-status-booked border-status-booked/40',
    accentBg: 'bg-status-booked/10',
  },
  {
    id: 'cutting',
    label: 'Cutting',
    labelUrdu: 'کٹائی',
    statuses: ['IN_CUTTING'],
    nextStatus: 'IN_STITCHING',
    prevStatus: 'BOOKED',
    icon: Scissors,
    accentColor: 'text-status-cutting border-status-cutting/40',
    accentBg: 'bg-status-cutting/10',
  },
  {
    id: 'stitching',
    label: 'Stitching',
    labelUrdu: 'سلائی',
    statuses: ['IN_STITCHING'],
    nextStatus: 'KAJ_BUTTON',
    prevStatus: 'IN_CUTTING',
    icon: Layers,
    accentColor: 'text-status-stitching border-status-stitching/40',
    accentBg: 'bg-status-stitching/10',
  },
  {
    id: 'kaj_button',
    label: 'Kaj & Button',
    labelUrdu: 'کاج اور بٹن',
    statuses: ['KAJ_BUTTON'],
    nextStatus: 'PRESSING',
    prevStatus: 'IN_STITCHING',
    icon: CircleDot,
    accentColor: 'text-amber-400 border-amber-400/40',
    accentBg: 'bg-amber-400/10',
  },
  {
    id: 'pressing',
    label: 'Pressing',
    labelUrdu: 'استری و پیکنگ',
    statuses: ['PRESSING'],
    nextStatus: 'READY_FOR_DELIVERY',
    prevStatus: 'KAJ_BUTTON',
    icon: Flame,
    accentColor: 'text-indigo-400 border-indigo-400/40',
    accentBg: 'bg-indigo-400/10',
  },
  {
    id: 'ready',
    label: 'Ready for Delivery',
    labelUrdu: 'تیار شدہ',
    statuses: ['READY_FOR_TRIAL', 'READY_FOR_DELIVERY'],
    nextStatus: 'COMPLETED',
    prevStatus: 'PRESSING',
    icon: PackageCheck,
    accentColor: 'text-status-ready border-status-ready/40',
    accentBg: 'bg-status-ready/10',
  },
  {
    id: 'completed',
    label: 'Completed',
    labelUrdu: 'مکمل / حوالہ',
    statuses: ['COMPLETED'],
    nextStatus: 'COMPLETED',
    prevStatus: 'READY_FOR_DELIVERY',
    icon: CheckCircle,
    accentColor: 'text-emerald-400 border-emerald-400/40',
    accentBg: 'bg-emerald-400/10',
  },
];

export interface PipelineBoardProps {
  orders: GarmentOrder[];
  customers: Customer[];
  staff: Staff[];
  onOrdersChange?: (orders: GarmentOrder[]) => void;
  onStatusLogAppend?: (log: OrderStatusLog) => void;
  onOpenWhatsApp?: (order: GarmentOrder) => void;
  onOpenPrint?: (order: GarmentOrder) => void;
  className?: string;
}

export function PipelineBoard({
  orders,
  customers,
  staff,
  onOrdersChange,
  onStatusLogAppend,
  onOpenWhatsApp,
  onOpenPrint,
  className,
}: PipelineBoardProps) {
  const [advancingOrderId, setAdvancingOrderId] = React.useState<string | null>(null);

  // Quick lookup helper maps
  const customerMap = React.useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const staffMap = React.useMemo(() => {
    const map = new Map<string, Staff>();
    staff.forEach((s) => map.set(s.id, s));
    return map;
  }, [staff]);

  const handleAdvance = React.useCallback(
    (orderId: string) => {
      const currentOrder = orders.find((o) => o.id === orderId);
      if (!currentOrder || currentOrder.status === 'COMPLETED') return;

      // Find which column this order currently belongs to
      const currentCol = PIPELINE_COLUMNS.find((col) =>
        col.statuses.includes(currentOrder.status)
      );
      if (!currentCol) return;

      const nextStatus = currentCol.nextStatus;
      if (nextStatus === currentOrder.status) return;

      setAdvancingOrderId(orderId);

      // 1. Optimistically update local orders list
      const updatedOrders = orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              actual_delivery_date:
                nextStatus === 'COMPLETED' ? new Date().toISOString() : o.actual_delivery_date,
              updated_at: new Date().toISOString(),
            }
          : o
      );

      onOrdersChange?.(updatedOrders);

      // 2. Append audit log entry
      const auditLog: OrderStatusLog = {
        id: `h${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        order_id: orderId,
        previous_status: currentOrder.status,
        new_status: nextStatus,
        changed_by: currentOrder.assigned_cutter_id || null,
        notes: `Stage advanced from ${currentOrder.status} to ${nextStatus} via Kanban Queue.`,
        created_at: new Date().toISOString(),
      };

      onStatusLogAppend?.(auditLog);

      setTimeout(() => {
        setAdvancingOrderId(null);
      }, 250);
    },
    [orders, onOrdersChange, onStatusLogAppend]
  );

  const handleRollback = React.useCallback(
    (orderId: string) => {
      const currentOrder = orders.find((o) => o.id === orderId);
      if (!currentOrder || currentOrder.status === 'BOOKED') return;

      const currentCol = PIPELINE_COLUMNS.find((col) =>
        col.statuses.includes(currentOrder.status)
      );
      if (!currentCol || !currentCol.prevStatus) return;

      const prevStatus = currentCol.prevStatus;

      setAdvancingOrderId(orderId);

      // 1. Optimistically update local orders list
      const updatedOrders = orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: prevStatus,
              actual_delivery_date: null,
              updated_at: new Date().toISOString(),
            }
          : o
      );

      onOrdersChange?.(updatedOrders);

      // 2. Append audit log entry
      const auditLog: OrderStatusLog = {
        id: `h${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        order_id: orderId,
        previous_status: currentOrder.status,
        new_status: prevStatus,
        changed_by: currentOrder.assigned_cutter_id || null,
        notes: `Stage rolled back from ${currentOrder.status} to ${prevStatus} via Kanban Queue.`,
        created_at: new Date().toISOString(),
      };

      onStatusLogAppend?.(auditLog);

      setTimeout(() => {
        setAdvancingOrderId(null);
      }, 250);
    },
    [orders, onOrdersChange, onStatusLogAppend]
  );

  return (
    <div
      className={cn(
        'flex w-full gap-4 overflow-x-auto pb-6 pt-2 select-none scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
        className
      )}
    >
      {PIPELINE_COLUMNS.map((col) => {
        const IconComponent = col.icon;
        const columnOrders = orders.filter((o) => col.statuses.includes(o.status));
        const totalPkr = columnOrders.reduce((sum, o) => sum + o.total_amount, 0);

        return (
          <div
            key={col.id}
            className="flex min-w-[310px] max-w-[310px] flex-col rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm"
          >
            {/* Column Header */}
            <div className="sticky top-0 z-10 rounded-t-2xl border-b border-border/70 bg-card/95 p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg border', col.accentColor, col.accentBg)}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-foreground tracking-tight">
                        {col.label}
                      </h3>
                      <span className="font-urdu-sans text-xs text-muted-foreground" dir="rtl">
                        {col.labelUrdu}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Count Badge */}
                <span className={cn('flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold border', col.accentColor, col.accentBg)}>
                  {columnOrders.length}
                </span>
              </div>

              {/* PKR Stage Summary */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                <span>Total Value:</span>
                <span className="font-mono font-semibold text-foreground">
                  Rs. {totalPkr.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Column Body: Order Cards Container */}
            <div className="flex flex-1 flex-col gap-3 p-3 min-h-[450px]">
              {columnOrders.length > 0 ? (
                columnOrders.map((order) => {
                  const customer = customerMap.get(order.customer_id);
                  const cutter = order.assigned_cutter_id
                    ? staffMap.get(order.assigned_cutter_id)
                    : null;
                  const stitcher = order.assigned_stitcher_id
                    ? staffMap.get(order.assigned_stitcher_id)
                    : null;

                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      customer={customer}
                      assignedCutter={cutter}
                      assignedStitcher={stitcher}
                      onAdvance={handleAdvance}
                      onRollback={handleRollback}
                      onOpenWhatsApp={onOpenWhatsApp}
                      onOpenPrint={onOpenPrint}
                      isAdvancing={advancingOrderId === order.id}
                    />
                  );
                })
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 p-6 text-center text-muted-foreground/60">
                  <Inbox className="h-8 w-8 stroke-[1.25] text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium">No orders in this stage</p>
                  <p className="font-urdu-sans text-[11px] text-muted-foreground/40 mt-0.5" dir="rtl">
                    کوئی آرڈر موجود نہیں
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PipelineBoard;
