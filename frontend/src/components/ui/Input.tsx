import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-accent focus:ring-2 focus:ring-accent/10 dark:border-white/10 dark:bg-neutral-900 dark:placeholder:text-neutral-500 dark:focus:border-accent dark:focus:ring-accent/15',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';
