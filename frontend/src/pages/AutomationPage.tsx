import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Zap } from 'lucide-react';
import {
  automationService,
  type Automation,
  type AutomationAction,
  type AutomationInput,
  type AutomationTrigger,
  type TriggerType,
} from '../services/automation';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Switch } from '../components/ui/Switch';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/Dialog';

const TRIGGER_LABEL: Record<TriggerType, string> = {
  'lead.created': 'Lead criado',
  'lead.moved': 'Lead movido',
  'message.received': 'Mensagem recebida',
};

const ACTION_LABEL: Record<AutomationAction['type'], string> = {
  send_message: 'Enviar mensagem',
  move_to_column: 'Mover para coluna',
  add_tag: 'Adicionar tag',
};

export default function AutomationPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Automation | 'new' | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: automationService.list,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      automationService.update(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => automationService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 items-center justify-between border-b border-default bg-surface px-6 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-fg">Automações</h1>
          <p className="text-xs text-fg-muted">
            Regras de gatilho → ação executadas automaticamente.
          </p>
        </div>
        <Button onClick={() => setEditing('new')} size="sm" className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Nova regra
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-default bg-surface p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.12)]">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <p className="text-sm font-medium text-fg">Nenhuma regra configurada</p>
            <p className="mt-1 text-xs text-fg-muted">
              Crie uma regra para automatizar respostas e movimentações.
            </p>
            <Button onClick={() => setEditing('new')} size="sm" className="mt-4 gap-2">
              <Plus className="h-3.5 w-3.5" />
              Nova regra
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-4 rounded-xl border border-default bg-surface p-4 shadow-card transition hover:border-strong"
              >
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(v) => toggleMut.mutate({ id: r.id, enabled: v })}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                    <Badge variant="accent">{TRIGGER_LABEL[r.trigger.type]}</Badge>
                    <span>→</span>
                    {r.actions.length > 0 ? (
                      r.actions.map((a, i) => (
                        <Badge key={i} variant="outline">
                          {ACTION_LABEL[a.type]}
                        </Badge>
                      ))
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => confirm(`Remover "${r.name}"?`) && removeMut.mutate(r.id)}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing && (
          <RuleEditor
            rule={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['automations'] });
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function RuleEditor({
  rule,
  onClose,
  onSaved,
}: {
  rule: Automation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? '');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [triggerType, setTriggerType] = useState<TriggerType>(
    rule?.trigger.type ?? 'message.received',
  );
  const [contains, setContains] = useState(
    rule?.trigger.type === 'message.received' ? rule.trigger.contains ?? '' : '',
  );
  const [toColumnId, setToColumnId] = useState(
    rule?.trigger.type === 'lead.moved' ? rule.trigger.toColumnId ?? '' : '',
  );
  const [actions, setActions] = useState<AutomationAction[]>(
    rule?.actions ?? [{ type: 'send_message', text: '' }],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const trigger: AutomationTrigger =
        triggerType === 'message.received'
          ? { type: 'message.received', contains: contains.trim() || undefined }
          : triggerType === 'lead.moved'
            ? { type: 'lead.moved', toColumnId: toColumnId.trim() || undefined }
            : { type: 'lead.created' };
      const payload: AutomationInput = { name, enabled, trigger, actions };
      if (rule) return automationService.update(rule.id, payload);
      return automationService.create(payload);
    },
    onSuccess: onSaved,
  });

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (actions.length === 0) return false;
    return actions.every((a) => {
      if (a.type === 'send_message') return a.text.trim().length > 0;
      if (a.type === 'move_to_column') return a.columnId.trim().length > 0;
      if (a.type === 'add_tag') return a.tag.trim().length > 0;
      return false;
    });
  }, [name, actions]);

  function updateAction(i: number, patch: Partial<AutomationAction>) {
    setActions((prev) =>
      prev.map((a, idx) => (idx === i ? ({ ...a, ...patch } as AutomationAction) : a)),
    );
  }

  function changeActionType(i: number, type: AutomationAction['type']) {
    const next: AutomationAction =
      type === 'send_message'
        ? { type, text: '' }
        : type === 'move_to_column'
          ? { type, columnId: '' }
          : { type, tag: '' };
    setActions((prev) => prev.map((a, idx) => (idx === i ? next : a)));
  }

  const selectCls =
    'w-full rounded-md border border-default bg-surface px-3 py-2 text-sm text-fg outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.4)]';

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{rule ? 'Editar regra' : 'Nova regra'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-default bg-bg-subtle p-3">
          <span className="text-sm text-fg">Regra ativa</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">Nome</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Boas-vindas"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">Gatilho</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            className={selectCls}
          >
            <option value="message.received">Mensagem recebida</option>
            <option value="lead.created">Lead criado</option>
            <option value="lead.moved">Lead movido</option>
          </select>
          {triggerType === 'message.received' && (
            <Input
              value={contains}
              onChange={(e) => setContains(e.target.value)}
              placeholder="Contém (opcional) — ex.: preço"
              className="mt-2"
            />
          )}
          {triggerType === 'lead.moved' && (
            <Input
              value={toColumnId}
              onChange={(e) => setToColumnId(e.target.value)}
              placeholder="ID da coluna destino (opcional)"
              className="mt-2"
            />
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-fg-muted">Ações</label>
            <button
              type="button"
              onClick={() =>
                setActions((p) => [...p, { type: 'send_message', text: '' }])
              }
              className="text-xs font-medium text-accent hover:underline"
            >
              + adicionar
            </button>
          </div>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-default bg-bg-subtle p-2"
              >
                <select
                  value={a.type}
                  onChange={(e) =>
                    changeActionType(i, e.target.value as AutomationAction['type'])
                  }
                  className="rounded border border-default bg-surface px-2 py-1.5 text-xs text-fg outline-none"
                >
                  <option value="send_message">Enviar mensagem</option>
                  <option value="move_to_column">Mover p/ coluna</option>
                  <option value="add_tag">Adicionar tag</option>
                </select>
                <div className="flex-1">
                  {a.type === 'send_message' && (
                    <Textarea
                      rows={2}
                      value={a.text}
                      onChange={(e) => updateAction(i, { text: e.target.value })}
                      placeholder="Texto da mensagem"
                    />
                  )}
                  {a.type === 'move_to_column' && (
                    <Input
                      value={a.columnId}
                      onChange={(e) => updateAction(i, { columnId: e.target.value })}
                      placeholder="ID da coluna"
                    />
                  )}
                  {a.type === 'add_tag' && (
                    <Input
                      value={a.tag}
                      onChange={(e) => updateAction(i, { tag: e.target.value })}
                      placeholder="Tag"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setActions((p) => p.filter((_, idx) => idx !== i))}
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!canSave}
          loading={saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
