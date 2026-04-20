import type { Prisma } from '@prisma/client';

/**
 * Colunas-padrão aplicadas a todo workspace recém-criado.
 * Mantém o Kanban utilizável já no primeiro login (antes disso a tela
 * ficava travada no skeleton quando a listagem retornava vazia).
 */
const DEFAULT_COLUMNS = [
  { name: 'Novo', color: '#64748b' },
  { name: 'Em contato', color: '#3b82f6' },
  { name: 'Negociação', color: '#f59e0b' },
  { name: 'Ganho', color: '#10b981' },
  { name: 'Perdido', color: '#ef4444' },
];

export async function seedDefaultBoard(
  tx: Prisma.TransactionClient,
  workspaceId: string,
): Promise<void> {
  const board = await tx.kanbanBoard.create({
    data: { workspaceId, name: 'Pipeline', isDefault: true },
  });
  await tx.kanbanColumn.createMany({
    data: DEFAULT_COLUMNS.map((c, i) => ({
      workspaceId,
      boardId: board.id,
      name: c.name,
      color: c.color,
      position: i,
    })),
  });
}
