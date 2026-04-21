import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ADMIN' | 'USER' | 'AGENT';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin?: boolean;
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

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: Role;
  blockedAt?: string | null;
  subscription?: WorkspaceSubscription | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  workspaces: Workspace[];
  currentWorkspaceId: string | null;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (id: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      workspaces: [],
      currentWorkspaceId: null,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setWorkspaces: (workspaces) =>
        set((s) => ({
          workspaces,
          currentWorkspaceId:
            s.currentWorkspaceId &&
            workspaces.some((w) => w.id === s.currentWorkspaceId)
              ? s.currentWorkspaceId
              : (workspaces[0]?.id ?? null),
        })),
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      reset: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          workspaces: [],
          currentWorkspaceId: null,
        }),
    }),
    { name: 'crmwp-auth' },
  ),
);
