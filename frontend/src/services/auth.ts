import { api } from './api';
import type { AuthUser, Workspace } from '../store/auth-store';

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  memberships: Array<{
    role: 'ADMIN' | 'USER' | 'AGENT';
    workspace: { id: string; name: string; slug: string };
  }>;
}

export const authService = {
  async signup(data: {
    email: string;
    name: string;
    password: string;
    workspaceName: string;
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
      user: { id: data.id, email: data.email, name: data.name },
      workspaces: data.memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
      })),
    };
  },
};
