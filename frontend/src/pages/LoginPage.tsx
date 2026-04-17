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
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-neutral-500">Acesse seu workspace.</p>

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
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" loading={loading}>
            Entrar
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Ainda não tem conta?{' '}
          <Link to="/signup" className="font-medium text-neutral-900 hover:underline dark:text-white">
            Criar workspace
          </Link>
        </p>
      </form>
    </div>
  );
}
