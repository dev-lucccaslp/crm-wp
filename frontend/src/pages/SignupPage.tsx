import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/auth-store';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setTokens, setUser, setWorkspaces } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    workspaceName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await authService.signup(form);
      setTokens(tokens.accessToken, tokens.refreshToken);
      const { user, workspaces } = await authService.me();
      setUser(user);
      setWorkspaces(workspaces);
      navigate('/app', { replace: true });
    } catch (err) {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        'Erro ao criar conta';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-default bg-surface p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Criar conta</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Começar com um novo workspace.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              minLength={2}
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field label="Nome do workspace">
            <Input
              value={form.workspaceName}
              onChange={(e) => update('workspaceName', e.target.value)}
              required
              minLength={2}
              placeholder="Minha Empresa"
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" loading={loading}>
            Criar conta
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-fg-muted">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-fg hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
