import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/cn';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Algo deu errado',
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const msg =
    description ??
    (error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Tente novamente em instantes.');
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-default bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--danger)/0.12)] text-danger">
        <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 max-w-sm text-xs text-fg-muted">{msg}</div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
