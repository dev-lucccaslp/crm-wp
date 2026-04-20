import { BarChart2 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-default bg-surface px-6 py-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-fg">Relatórios</h1>
          <p className="text-xs text-fg-muted">
            Análises e métricas do workspace.
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)]">
            <BarChart2 className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-semibold text-fg">Relatórios</h2>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">
            Dashboard de métricas em desenvolvimento. Em breve você poderá visualizar
            conversão, tempo de resposta e performance dos atendentes.
          </p>
        </div>
      </div>
    </div>
  );
}
