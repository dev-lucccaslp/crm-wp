import { BarChart2 } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

/**
 * Stub da página de Relatórios — placeholder até ganharmos endpoints dedicados
 * (conversão por board, funil, produtividade por agente). Evita o bounce para
 * o Dashboard que acontecia antes.
 */
export default function ReportsPage() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Relatórios
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Visão consolidada de performance — em construção.
          </p>
        </div>

        <div className="mt-6">
          <EmptyState
            icon={BarChart2}
            title="Relatórios ainda em construção"
            description="Em breve: conversão por board, tempo médio de resposta por agente, heatmap de volume e funil de mensagens."
          />
        </div>
      </div>
    </div>
  );
}
