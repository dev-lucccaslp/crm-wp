import { api } from './api';

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  blockedAt: string | null;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  members: number;
  instances: number;
  leads: number;
  conversations: number;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  isSuperAdmin: boolean;
  createdAt: string;
  memberships: {
    role: string;
    workspace: { id: string; name: string };
  }[];
}

export interface AdminMetrics {
  totals: {
    workspaces: number;
    users: number;
    leads: number;
    messages: number;
  };
  leads: { last30: number; last7: number; won30: number };
  messages: { inbound30: number; outbound30: number };
  avgResponseMs: number;
  conversionRate: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
  workspace: { id: string; name: string } | null;
}

export const adminService = {
  workspaces: () =>
    api.get<AdminWorkspace[]>('/admin/workspaces').then((r) => r.data),
  users: () => api.get<AdminUser[]>('/admin/users').then((r) => r.data),
  metrics: () => api.get<AdminMetrics>('/admin/metrics').then((r) => r.data),
  auditLogs: (limit = 100) =>
    api
      .get<AdminAuditLog[]>('/admin/audit-logs', { params: { limit } })
      .then((r) => r.data),

  blockWorkspace: (id: string, reason?: string) =>
    api.post(`/admin/workspaces/${id}/block`, { reason }).then((r) => r.data),
  unblockWorkspace: (id: string) =>
    api.post(`/admin/workspaces/${id}/unblock`).then((r) => r.data),
  forceDeleteWorkspace: (id: string) =>
    api.delete(`/admin/workspaces/${id}`).then((r) => r.data),
};
