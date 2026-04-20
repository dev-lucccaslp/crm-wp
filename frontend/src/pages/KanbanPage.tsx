import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { kanbanService, type BoardFull, type Lead } from '../services/kanban';
import { KanbanColumn } from '../features/kanban/KanbanColumn';
import { LeadCard, SortableLeadCard } from '../features/kanban/LeadCard';
import { LeadDrawer } from '../features/kanban/LeadDrawer';
import { useBoardSync } from '../features/kanban/useBoardSync';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/DropdownMenu';
import { Check, ChevronDown, Kanban as KanbanIcon } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

void SortableLeadCard;

export default function KanbanPage() {
  const qc = useQueryClient();
  const {
    data: boards,
    isLoading: boardsLoading,
    error: boardsError,
    refetch: refetchBoards,
  } = useQuery({
    queryKey: ['boards'],
    queryFn: kanbanService.listBoards,
  });
  const [boardId, setBoardId] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId && boards?.length) {
      setBoardId(boards.find((b) => b.isDefault)?.id ?? boards[0].id);
    }
  }, [boards, boardId]);

  const {
    data: board,
    isLoading,
    error: boardError,
    refetch: refetchBoard,
  } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => kanbanService.getBoard(boardId!),
    enabled: !!boardId,
  });

  const createDefaultBoardMut = useMutation({
    mutationFn: () =>
      kanbanService
        .listBoards // força o lazy-seed do backend: basta pedir a lista
        (),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  });

  useBoardSync(boardId ?? undefined);

  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      qc.setQueryData<BoardFull>(
        ['board', boardId],
        applyMove(prev, leadId, toColumnId, toPosition),
      );
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
    const activeLeadLocal = allLeads.get(leadId);
    if (!activeLeadLocal) return;

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

    if (
      toColumnId === activeLeadLocal.columnId &&
      toPosition === activeLeadLocal.position
    )
      return;

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

  const totalLeads =
    board?.columns.reduce((acc, c) => acc + c.leads.length, 0) ?? 0;
  const totalValue =
    board?.columns.reduce(
      (acc, c) =>
        acc + c.leads.reduce((a, l) => a + (Number(l.value) || 0), 0),
      0,
    ) ?? 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-default bg-surface px-6 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Pipeline</h1>
          {board && (
            <p className="text-xs text-fg-muted">
              {board.name} · {totalLeads} leads ·{' '}
              <span className="tabular-nums">
                R$ {totalValue.toLocaleString('pt-BR')}
              </span>
            </p>
          )}
        </div>
        {boards && boards.length > 1 && board && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {board.name}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {boards.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onSelect={() => setBoardId(b.id)}
                  className="justify-between"
                >
                  {b.name}
                  {b.id === boardId && <Check className="h-3.5 w-3.5 text-accent" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {boardsError ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <ErrorState
            error={boardsError}
            onRetry={() => refetchBoards()}
            title="Não foi possível carregar os boards"
          />
        </div>
      ) : boardError ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <ErrorState
            error={boardError}
            onRetry={() => refetchBoard()}
            title="Não foi possível carregar o board"
          />
        </div>
      ) : !boardsLoading && boards && boards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={KanbanIcon}
            title="Nenhum board ainda"
            description="Vamos criar um pipeline padrão com colunas Novo → Ganho para você começar."
            action={
              <Button
                size="sm"
                loading={createDefaultBoardMut.isPending}
                onClick={() => createDefaultBoardMut.mutate()}
              >
                Criar pipeline padrão
              </Button>
            }
          />
        </div>
      ) : isLoading || !board ? (
        <div className="flex flex-1 gap-3 overflow-hidden p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[288px] shrink-0 space-y-3 rounded-xl bg-bg-subtle p-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveLead(null)}
        >
          <div className="flex flex-1 gap-3 overflow-x-auto overflow-y-hidden p-4">
            {board.columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                onOpenLead={setOpenLeadId}
                onAddLead={handleAdd}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.16,1,.3,1)' }}>
            {activeLead ? (
              <div className="w-[272px]">
                <LeadCard lead={activeLead} onOpen={() => {}} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog
        open={!!addingInColumn}
        onOpenChange={(open) => !open && setAddingInColumn(null)}
      >
        <DialogContent className="max-w-sm">
          <form onSubmit={submitAdd}>
            <DialogHeader>
              <DialogTitle>Novo lead</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Título do lead"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setAddingInColumn(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
