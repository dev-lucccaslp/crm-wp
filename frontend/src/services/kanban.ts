import { api } from './api';

export interface ContactMini {
  id: string;
  name: string | null;
  phone: string;
  avatarUrl: string | null;
}

export interface AssigneeMini {
  id: string;
  name: string;
  email: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  boardId: string;
  columnId: string;
  contactId: string | null;
  assigneeId: string | null;
  title: string;
  value: string | null;
  tags: string[];
  position: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contact: ContactMini | null;
  assignee: AssigneeMini | null;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  color: string;
  position: number;
  leads: Lead[];
}

export interface BoardFull {
  id: string;
  name: string;
  isDefault: boolean;
  columns: Column[];
}

export interface BoardListItem {
  id: string;
  name: string;
  isDefault: boolean;
}

export const kanbanService = {
  async listBoards() {
    const { data } = await api.get<BoardListItem[]>('/kanban/boards');
    return data;
  },
  async getBoard(boardId: string) {
    const { data } = await api.get<BoardFull>(`/kanban/boards/${boardId}`);
    return data;
  },
  async createLead(input: {
    boardId: string;
    columnId: string;
    title: string;
    contactId?: string;
    value?: string;
    tags?: string[];
  }) {
    const { data } = await api.post<Lead>('/kanban/leads', input);
    return data;
  },
  async updateLead(leadId: string, input: Partial<Pick<Lead, 'title' | 'notes' | 'tags'>> & { value?: string }) {
    const { data } = await api.patch<Lead>(`/kanban/leads/${leadId}`, input);
    return data;
  },
  async deleteLead(leadId: string) {
    await api.delete(`/kanban/leads/${leadId}`);
  },
  async moveLead(leadId: string, toColumnId: string, toPosition: number) {
    const { data } = await api.post<Lead>(`/kanban/leads/${leadId}/move`, {
      toColumnId,
      toPosition,
    });
    return data;
  },
  async getLead(leadId: string) {
    const { data } = await api.get(`/kanban/leads/${leadId}`);
    return data as Lead & {
      movements: Array<{
        id: string;
        fromColumn: { id: string; name: string } | null;
        toColumn: { id: string; name: string };
        movedBy: { id: string; name: string } | null;
        createdAt: string;
      }>;
    };
  },
};
