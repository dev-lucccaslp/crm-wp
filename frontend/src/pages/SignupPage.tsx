import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/auth-store';

const STRIPE_PUBLISHABLE = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined;

// Promise singleton — evita recarregar o script a cada render.
let _stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!STRIPE_PUBLISHABLE) return null;
  if (!_stripePromise) _stripePromise = loadStripe(STRIPE_PUBLISHABLE);
  return _stripePromise;
}

export default function SignupPage() {
  const stripePromise = useMemo(() => getStripe(), []);
  // Sem chave pública configurada, cai no fluxo legacy sem cartão (dev).
  if (!stripePromise) return <SignupForm stripeEnabled={false} />;
  return (
    <Elements stripe={stripePromise}>
      <SignupForm stripeEnabled />
    </Elements>
  );
}

function SignupForm({ stripeEnabled }: { stripeEnabled: boolean }) {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
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
      let stripePaymentMethodId: string | undefined;
      if (stripeEnabled) {
        if (!stripe || !elements) {
          throw new Error('Stripe ainda carregando — tente novamente.');
        }
        const card = elements.getElement(CardElement);
        if (!card) throw new Error('Informe os dados do cartão.');
        const { paymentMethod, error: pmError } =
          await stripe.createPaymentMethod({
            type: 'card',
            card,
            billing_details: { name: form.name, email: form.email },
          });
        if (pmError) throw new Error(pmError.message ?? 'Cartão inválido.');
        stripePaymentMethodId = paymentMethod.id;
      }

      const tokens = await authService.signup({ ...form, stripePaymentMethodId });
      setTokens(tokens.accessToken, tokens.refreshToken);
      const { user, workspaces } = await authService.me();
      setUser(user);
      setWorkspaces(workspaces);
      navigate('/app', { replace: true });
    } catch (err) {
      const axiosMsg = (err as AxiosError<{ message?: string | string[] }>)
        .response?.data?.message;
      const msg =
        (Array.isArray(axiosMsg) ? axiosMsg.join(', ') : axiosMsg) ??
        (err as Error).message ??
        'Erro ao criar conta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-default bg-surface p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Criar conta
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          7 dias grátis · sem cobrança durante o período de teste.
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

          {stripeEnabled && (
            <Field label="Cartão de crédito">
              <div className="rounded-md border border-default bg-bg px-3 py-3">
                <CardElement
                  options={{
                    style: {
                      base: {
                        color: 'hsl(var(--fg))',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        '::placeholder': { color: 'hsl(var(--fg-muted))' },
                      },
                      invalid: { color: 'hsl(var(--danger))' },
                    },
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-fg-subtle">
                Não cobramos durante os 7 dias de teste. Cancele a qualquer momento.
              </p>
            </Field>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" loading={loading}>
            Iniciar trial de 7 dias
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
