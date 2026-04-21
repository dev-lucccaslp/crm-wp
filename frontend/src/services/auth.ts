import { api } from './api';
import type { AuthUser, Workspace } from '../store/auth-store';

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'BLOCKED'
  | 'CANCELED'
  | 'INCOMPLETE';

export type PlanId = 'TRIAL' | 'PRO' | 'BUSINESS';

export interface WorkspaceSubscription {
  plan: PlanId;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  blockedAt: string | null;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  isSuperAdmin?: boolean;
  memberships: Array<{
    role: 'ADMIN' | 'USER' | 'AGENT';
    workspace: {
      id: string;
      name: string;
      slug: string;
      blockedAt: string | null;
      subscription: WorkspaceSubscription | null;
    };
  }>;
}

export const authService = {
  async signup(data: {
    email: string;
    name: string;
    password: string;
    workspaceName: string;
    stripePaymentMethodId?: string;
  }) {
    const res = await api.post<TokensResponse>('/auth/signup', data);
    return res.data;
  },

  async login(data: { email: string; password: string }) {
    const res = await api.post<TokensResponse>('/auth/login', data);
    return res.data;
  },

  async logout(refreshToken: string) {
    await api.post('/auth/logout', { refreshToken });
  },

  async me(): Promise<{ user: AuthUser; workspaces: Workspace[] }> {
    const { data } = await api.get<MeResponse>('/auth/me');
    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        isSuperAdmin: data.isSuperAdmin ?? false,
      },
      workspaces: data.memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        blockedAt: m.workspace.blockedAt,
        subscription: m.workspace.subscription,
      })),
    };
  },
};
