import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
  {
    variants: {
      variant: {
        default: 'bg-surface-hover text-fg-muted',
        accent: 'bg-[hsl(var(--accent)/0.15)] text-accent',
        success: 'bg-[hsl(var(--success)/0.15)] text-success',
        warning: 'bg-[hsl(var(--warning)/0.18)] text-[hsl(var(--warning))]',
        danger: 'bg-[hsl(var(--danger)/0.15)] text-danger',
        outline: 'border border-default text-fg-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
