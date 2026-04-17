import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '../../services/kanban';
import { cn } from '../../lib/cn';

export function LeadCard({
  lead,
  onOpen,
}: {
  lead: Lead;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { type: 'lead', columnId: lead.columnId } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group cursor-grab rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-900',
        isDragging && 'opacity-40',
      )}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onOpen(lead.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{lead.title}</p>
        {lead.value && (
          <span className="whitespace-nowrap rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            R$ {Number(lead.value).toLocaleString('pt-BR')}
          </span>
        )}
      </div>
      {lead.contact && (
        <p className="mt-1 truncate text-xs text-neutral-500">
          {lead.contact.name ?? lead.contact.phone}
        </p>
      )}
      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
