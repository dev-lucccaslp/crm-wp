import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-default bg-surface/40 px-6 py-10 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.12)] text-accent">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
      )}
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {description && (
          <div className="mt-1 max-w-sm text-xs text-fg-muted">
            {description}
          </div>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
