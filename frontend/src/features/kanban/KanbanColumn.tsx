import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Column } from '../../services/kanban';
import { LeadCard } from './LeadCard';

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
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-neutral-100/60 p-2 dark:bg-neutral-900/60">
      <div className="mb-2 flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: column.color }}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
            {column.name}
          </h3>
          <span className="text-[11px] text-neutral-500">{column.leads.length}</span>
        </div>
        <button
          onClick={() => onAddLead(column.id)}
          className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          title="Adicionar lead"
        >
          +
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={
          'flex min-h-[120px] flex-col gap-2 rounded-lg p-1 transition ' +
          (isOver ? 'bg-neutral-200/50 dark:bg-neutral-800/50' : '')
        }
      >
        <SortableContext
          items={column.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={onOpenLead} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
