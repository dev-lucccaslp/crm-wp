import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { kanbanService, type BoardFull, type Lead } from '../services/kanban';
import { KanbanColumn } from '../features/kanban/KanbanColumn';
import { LeadCard } from '../features/kanban/LeadCard';
import { LeadDrawer } from '../features/kanban/LeadDrawer';
import { useBoardSync } from '../features/kanban/useBoardSync';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function KanbanPage() {
  const qc = useQueryClient();
  const { data: boards } = useQuery({
    queryKey: ['boards'],
    queryFn: kanbanService.listBoards,
  });
  const [boardId, setBoardId] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId && boards?.length) {
      setBoardId(boards.find((b) => b.isDefault)?.id ?? boards[0].id);
    }
  }, [boards, boardId]);

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => kanbanService.getBoard(boardId!),
    enabled: !!boardId,
  });

  useBoardSync(boardId ?? undefined);

  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const allLeads = useMemo(() => {
    const map = new Map<string, Lead>();
    board?.columns.forEach((c) => c.leads.forEach((l) => map.set(l.id, l)));
    return map;
  }, [board]);

  const moveMutation = useMutation({
    mutationFn: ({
      leadId,
      toColumnId,
      toPosition,
    }: {
      leadId: string;
      toColumnId: string;
      toPosition: number;
    }) => kanbanService.moveLead(leadId, toColumnId, toPosition),
    onMutate: async ({ leadId, toColumnId, toPosition }) => {
      await qc.cancelQueries({ queryKey: ['board', boardId] });
      const prev = qc.getQueryData<BoardFull>(['board', boardId]);
      if (!prev) return { prev };
      qc.setQueryData<BoardFull>(['board', boardId], applyMove(prev, leadId, toColumnId, toPosition));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['board', boardId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  const createMutation = useMutation({
    mutationFn: (input: { columnId: string; title: string }) =>
      kanbanService.createLead({ boardId: boardId!, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', boardId] }),
  });

  function onDragStart(e: DragStartEvent) {
    const lead = allLeads.get(String(e.active.id));
    if (lead) setActiveLead(lead);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = e;
    if (!over || !board) return;
    const leadId = String(active.id);
    const activeLead = allLeads.get(leadId);
    if (!activeLead) return;

    const overData = over.data.current as
      | { type: 'column'; columnId: string }
      | { type: 'lead'; columnId: string }
      | undefined;
    if (!overData) return;

    let toColumnId: string;
    let toPosition: number;

    if (overData.type === 'column') {
      toColumnId = overData.columnId;
      const col = board.columns.find((c) => c.id === toColumnId)!;
      toPosition = col.leads.filter((l) => l.id !== leadId).length;
    } else {
      toColumnId = overData.columnId;
      const col = board.columns.find((c) => c.id === toColumnId)!;
      const idx = col.leads.findIndex((l) => l.id === over.id);
      toPosition = idx < 0 ? col.leads.length : idx;
    }

    if (toColumnId === activeLead.columnId && toPosition === activeLead.position) return;

    moveMutation.mutate({ leadId, toColumnId, toPosition });
  }

  function handleAdd(columnId: string) {
    setAddingInColumn(columnId);
    setNewTitle('');
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addingInColumn || !newTitle.trim()) return;
    createMutation.mutate({ columnId: addingInColumn, title: newTitle.trim() });
    setAddingInColumn(null);
  }

  return (
    <div className="flex h-[calc(100vh-56px-3rem)] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          {board && (
            <p className="text-xs text-neutral-500">{board.name}</p>
          )}
        </div>
        {boards && boards.length > 1 && (
          <select
            value={boardId ?? ''}
            onChange={(e) => setBoardId(e.target.value)}
            className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading || !board ? (
        <p className="text-sm text-neutral-500">Carregando pipeline...</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
            {board.columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                onOpenLead={setOpenLeadId}
                onAddLead={handleAdd}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} onOpen={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {addingInColumn && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setAddingInColumn(null)}
          />
          <form
            onSubmit={submitAdd}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h3 className="text-sm font-semibold">Novo lead</h3>
            <Input
              autoFocus
              className="mt-3"
              placeholder="Título"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setAddingInColumn(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Criar
              </Button>
            </div>
          </form>
        </>
      )}

      <LeadDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </div>
  );
}

function applyMove(
  board: BoardFull,
  leadId: string,
  toColumnId: string,
  toPosition: number,
): BoardFull {
  let moved: Lead | null = null;
  const stripped = {
    ...board,
    columns: board.columns.map((c) => ({
      ...c,
      leads: c.leads.filter((l) => {
        if (l.id === leadId) {
          moved = l;
          return false;
        }
        return true;
      }),
    })),
  };
  if (!moved) return board;
  return {
    ...stripped,
    columns: stripped.columns.map((c) => {
      if (c.id !== toColumnId) {
        return { ...c, leads: c.leads.map((l, i) => ({ ...l, position: i })) };
      }
      const next = [...c.leads];
      const clamped = Math.max(0, Math.min(toPosition, next.length));
      next.splice(clamped, 0, { ...(moved as Lead), columnId: toColumnId });
      return { ...c, leads: next.map((l, i) => ({ ...l, position: i })) };
    }),
  };
}
