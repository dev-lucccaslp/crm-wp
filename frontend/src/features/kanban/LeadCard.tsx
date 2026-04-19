import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, User2 } from 'lucide-react';
import type { Lead } from '../../services/kanban';
import { cn } from '../../lib/cn';
import { Badge } from '../../components/ui/Badge';

interface LeadCardProps {
  lead: Lead;
  onOpen: (id: string) => void;
}

export function SortableLeadCard({ lead, onOpen }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: lead.id,
      data: { type: 'lead', columnId: lead.columnId },
    });

  return (
    <LeadCard
      ref={setNodeRef}
      lead={lead}
      onOpen={onOpen}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      listeners={listeners}
      attributes={attributes}
    />
  );
}

interface LeadCardInternalProps extends LeadCardProps {
  style?: React.CSSProperties;
  dragging?: boolean;
  overlay?: boolean;
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
}

export const LeadCard = forwardRef<HTMLDivElement, LeadCardInternalProps>(
  (
    { lead, onOpen, style, dragging, overlay, listeners, attributes },
    ref,
  ) => {
    const value = lead.value ? Number(lead.value) : null;
    const contactName = lead.contact?.name ?? lead.contact?.phone;
    const initials = contactName
      ? contactName.slice(0, 2).toUpperCase()
      : '??';

    return (
      <div
        ref={ref}
        style={style}
        {...attributes}
        className={cn(
          'group relative rounded-lg border border-default bg-surface p-3 text-left shadow-card transition-all',
          'hover:border-strong hover:shadow-elevated',
          dragging && !overlay && 'opacity-30',
          overlay && 'rotate-[2deg] cursor-grabbing shadow-drag ring-1 ring-[hsl(var(--accent)/0.4)]',
        )}
        onDoubleClick={() => onOpen(lead.id)}
      >
        <div
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab rounded p-1 text-fg-subtle opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <div className="pl-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight text-fg line-clamp-2">
              {lead.title}
            </p>
            {value !== null && (
              <Badge variant="success" className="shrink-0 tabular-nums">
                R$ {value.toLocaleString('pt-BR')}
              </Badge>
            )}
          </div>

          {lead.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {lead.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="lowercase">
                  {t}
                </Badge>
              ))}
              {lead.tags.length > 3 && (
                <Badge variant="outline">+{lead.tags.length - 3}</Badge>
              )}
            </div>
          )}

          {(contactName || lead.assignee) && (
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-default pt-2">
              {contactName && (
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.15)] text-[9px] font-semibold text-accent">
                    {initials}
                  </div>
                  <span className="truncate">{contactName}</span>
                </div>
              )}
              {lead.assignee && (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-hover text-fg-muted"
                  title={lead.assignee.name}
                >
                  <User2 className="h-3 w-3" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);
LeadCard.displayName = 'LeadCard';
