import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/auth-store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser, setWorkspaces } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await authService.login({ email, password });
      setTokens(tokens.accessToken, tokens.refreshToken);
      const { user, workspaces } = await authService.me();
      setUser(user);
      setWorkspaces(workspaces);
      navigate(workspaces.length > 0 ? '/app' : '/workspaces/new', { replace: true });
    } catch (err) {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        'Erro ao entrar';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg shadow-sm">
            C
          </div>
          <span className="text-sm font-semibold tracking-tight">CRM-WP</span>
        </div>

        <form
          onSubmit={onSubmit}
          className="w-full rounded-2xl border border-default bg-surface p-8 shadow-card"
        >
          <h1 className="text-xl font-semibold tracking-tight text-fg">Entrar</h1>
          <p className="mt-1 text-sm text-fg-muted">Acesse seu workspace.</p>

          <div className="mt-6 flex flex-col gap-4">
            <Field label="E-mail">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" loading={loading}>
              Entrar
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-fg-muted">
            Ainda não tem conta?{' '}
            <Link to="/signup" className="font-medium text-accent hover:underline">
              Criar workspace
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
