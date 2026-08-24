import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'status-booked'
  | 'status-cutting'
  | 'status-stitching'
  | 'status-ready'
  | 'status-overdue'
  | 'status-advance-credit'
  | 'status-udhaar-pending';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'border-border text-foreground bg-transparent',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
  'status-booked': 'border-transparent bg-status-booked/20 text-status-booked',
  'status-cutting': 'border-transparent bg-status-cutting/20 text-status-cutting',
  'status-stitching': 'border-transparent bg-status-stitching/20 text-status-stitching',
  'status-ready': 'border-transparent bg-status-ready/20 text-status-ready',
  'status-overdue': 'border-transparent bg-status-overdue/20 text-status-overdue',
  'status-advance-credit': 'border-transparent bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'status-udhaar-pending': 'border-transparent bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export { Badge };
export default Badge;
