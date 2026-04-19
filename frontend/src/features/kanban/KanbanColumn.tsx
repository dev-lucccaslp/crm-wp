import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, MoreHorizontal } from 'lucide-react';
import type { Column } from '../../services/kanban';
import { SortableLeadCard } from './LeadCard';
import { cn } from '../../lib/cn';

export function KanbanColumn({
  column,
  onOpenLead,
  onAddLead,
}: {
  column: Column;
  onOpenLead: (id: string) => void;
  onAddLead: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  return (
    <div className="flex w-[288px] shrink-0 flex-col rounded-xl bg-bg-subtle">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: column.color }}
          />
          <h3 className="truncate text-sm font-semibold tracking-tight text-fg">
            {column.name}
          </h3>
          <span className="rounded-md bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-fg-muted tabular-nums">
            {column.leads.length}
          </span>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => onAddLead(column.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg"
            title="Adicionar lead"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg"
            title="Opções"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'mx-2 mb-2 flex min-h-[80px] flex-col gap-2 rounded-lg p-1 transition-colors',
          isOver && 'bg-[hsl(var(--accent)/0.08)] ring-2 ring-inset ring-[hsl(var(--accent)/0.3)]',
        )}
      >
        <SortableContext
          items={column.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onOpen={onOpenLead} />
          ))}
        </SortableContext>
        {column.leads.length === 0 && !isOver && (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-default text-[11px] text-fg-subtle">
            Arraste leads aqui
          </div>
        )}
      </div>

      <button
        onClick={() => onAddLead(column.id)}
        className="mx-2 mb-2 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-fg-muted transition hover:bg-surface-hover hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar card
      </button>
    </div>
  );
}
