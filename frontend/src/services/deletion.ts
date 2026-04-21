import { api } from './api';

export type DeletionType = 'WORKSPACE' | 'ACCOUNT';
export type DeletionStatus = 'PENDING' | 'CANCELED' | 'EXECUTED';

export interface DeletionRequest {
  id: string;
  workspaceId: string;
  userId: string;
  type: DeletionType;
  status: DeletionStatus;
  reason: string | null;
  scheduledFor: string;
  createdAt: string;
  canceledAt: string | null;
  executedAt: string | null;
}

export const deletionService = {
  list: () =>
    api
      .get<DeletionRequest[]>('/workspaces/current/deletion-requests')
      .then((r) => r.data),
  request: (payload: { type: DeletionType; reason?: string }) =>
    api
      .post<DeletionRequest>('/workspaces/current/deletion-requests', payload)
      .then((r) => r.data),
  cancel: (id: string) =>
    api
      .delete<DeletionRequest>(`/workspaces/current/deletion-requests/${id}`)
      .then((r) => r.data),
};
