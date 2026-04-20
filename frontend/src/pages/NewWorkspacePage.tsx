import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth-store';
import type { Workspace } from '../store/auth-store';

export default function NewWorkspacePage() {
  const navigate = useNavigate();
  const { workspaces, setWorkspaces, setCurrentWorkspace } = useAuthStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<Workspace>('/workspaces', { name });
      const next = [...workspaces, data];
      setWorkspaces(next);
      setCurrentWorkspace(data.id);
      navigate('/app', { replace: true });
    } catch (err) {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        'Erro ao criar workspace';
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
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Novo workspace</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Cada workspace é isolado — seus dados não vazam entre eles.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Nome">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Minha Empresa"
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" loading={loading}>
            Criar workspace
          </Button>
        </div>
      </form>
    </div>
  );
}
