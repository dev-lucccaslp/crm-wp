import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getSocket } from '../../services/socket';
import type { BoardFull, Lead } from '../../services/kanban';

type MoveEvent = {
  leadId: string;
  fromColumnId: string | null;
  toColumnId: string;
  toPosition: number;
  lead: Lead;
};

export function useBoardSync(boardId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!boardId) return;
    const socket = getSocket();
    if (!socket) return;

    const key = ['board', boardId];

    const patchLeadInBoard = (b: BoardFull, lead: Lead, targetColId: string) => {
      return {
        ...b,
        columns: b.columns.map((c) => {
          const filtered = c.leads.filter((l) => l.id !== lead.id);
          if (c.id === targetColId) {
            const next = [...filtered];
            const pos = Math.min(Math.max(lead.position, 0), next.length);
            next.splice(pos, 0, lead);
            return { ...c, leads: next.map((l, i) => ({ ...l, position: i })) };
          }
          return { ...c, leads: filtered.map((l, i) => ({ ...l, position: i })) };
        }),
      };
    };

    const onMoved = (e: MoveEvent) => {
      qc.setQueryData<BoardFull | undefined>(key, (old) =>
        old ? patchLeadInBoard(old, e.lead, e.toColumnId) : old,
      );
    };

    const onCreatedOrUpdated = (lead: Lead) => {
      if (lead.boardId !== boardId) return;
      qc.setQueryData<BoardFull | undefined>(key, (old) =>
        old ? patchLeadInBoard(old, lead, lead.columnId) : old,
      );
    };

    const onDeleted = ({ id }: { id: string }) => {
      qc.setQueryData<BoardFull | undefined>(key, (old) =>
        old
          ? {
              ...old,
              columns: old.columns.map((c) => ({
                ...c,
                leads: c.leads.filter((l) => l.id !== id),
              })),
            }
          : old,
      );
    };

    socket.on('lead.moved', onMoved);
    socket.on('lead.created', onCreatedOrUpdated);
    socket.on('lead.updated', onCreatedOrUpdated);
    socket.on('lead.deleted', onDeleted);
    socket.on('column.changed', () => qc.invalidateQueries({ queryKey: key }));

    return () => {
      socket.off('lead.moved', onMoved);
      socket.off('lead.created', onCreatedOrUpdated);
      socket.off('lead.updated', onCreatedOrUpdated);
      socket.off('lead.deleted', onDeleted);
      socket.off('column.changed');
    };
  }, [boardId, qc]);
}
