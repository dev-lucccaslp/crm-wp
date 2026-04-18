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
import { cn } from '../lib/cn';

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
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0b141a] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Automações</h1>
          <p className="text-xs text-white/40">
            Regras de gatilho → ação executadas automaticamente.
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          <Plus size={15} />
          Nova regra
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-white/40">Carregando...</div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-10 text-center">
          <Zap size={28} className="mx-auto mb-2 text-white/20" />
          <p className="text-sm text-white/50">Nenhuma regra configurada.</p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-4 rounded-lg border border-white/5 bg-[#111b21] p-4"
            >
              <button
                onClick={() => toggleMut.mutate({ id: r.id, enabled: !r.enabled })}
                className={cn(
                  'h-6 w-11 shrink-0 rounded-full p-0.5 transition',
                  r.enabled ? 'bg-emerald-500' : 'bg-white/10',
                )}
                title={r.enabled ? 'Ativa' : 'Desativada'}
              >
                <span
                  className={cn(
                    'block h-5 w-5 rounded-full bg-white transition-transform',
                    r.enabled && 'translate-x-5',
                  )}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white/90">{r.name}</div>
                <div className="text-xs text-white/40">
                  <span className="text-accent">
                    {TRIGGER_LABEL[r.trigger.type]}
                  </span>{' '}
                  → {r.actions.map((a) => ACTION_LABEL[a.type]).join(', ') || '—'}
                </div>
              </div>
              <button
                onClick={() => setEditing(r)}
                className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/5 hover:text-white"
              >
                Editar
              </button>
              <button
                onClick={() => confirm(`Remover "${r.name}"?`) && removeMut.mutate(r.id)}
                className="rounded-md p-2 text-white/40 hover:bg-white/5 hover:text-rose-400"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-4 rounded-xl bg-[#111b21] p-5 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {rule ? 'Editar regra' : 'Nova regra'}
          </h2>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Ativa
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
            placeholder="Ex.: Boas-vindas"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Gatilho</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none"
          >
            <option value="message.received">Mensagem recebida</option>
            <option value="lead.created">Lead criado</option>
            <option value="lead.moved">Lead movido</option>
          </select>
          {triggerType === 'message.received' && (
            <input
              value={contains}
              onChange={(e) => setContains(e.target.value)}
              placeholder="Contém (opcional) — ex.: preço"
              className="mt-2 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none"
            />
          )}
          {triggerType === 'lead.moved' && (
            <input
              value={toColumnId}
              onChange={(e) => setToColumnId(e.target.value)}
              placeholder="ID da coluna destino (opcional)"
              className="mt-2 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none"
            />
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-white/50">Ações</label>
            <button
              onClick={() =>
                setActions((p) => [...p, { type: 'send_message', text: '' }])
              }
              className="text-xs text-accent hover:underline"
            >
              + adicionar
            </button>
          </div>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-white/5 p-2">
                <select
                  value={a.type}
                  onChange={(e) =>
                    changeActionType(i, e.target.value as AutomationAction['type'])
                  }
                  className="rounded bg-white/5 px-2 py-1 text-xs outline-none"
                >
                  <option value="send_message">Enviar mensagem</option>
                  <option value="move_to_column">Mover p/ coluna</option>
                  <option value="add_tag">Adicionar tag</option>
                </select>
                <div className="flex-1">
                  {a.type === 'send_message' && (
                    <textarea
                      rows={2}
                      value={a.text}
                      onChange={(e) => updateAction(i, { text: e.target.value })}
                      className="w-full rounded bg-white/5 px-2 py-1 text-xs outline-none"
                      placeholder="Texto da mensagem"
                    />
                  )}
                  {a.type === 'move_to_column' && (
                    <input
                      value={a.columnId}
                      onChange={(e) => updateAction(i, { columnId: e.target.value })}
                      className="w-full rounded bg-white/5 px-2 py-1 text-xs outline-none"
                      placeholder="ID da coluna"
                    />
                  )}
                  {a.type === 'add_tag' && (
                    <input
                      value={a.tag}
                      onChange={(e) => updateAction(i, { tag: e.target.value })}
                      className="w-full rounded bg-white/5 px-2 py-1 text-xs outline-none"
                      placeholder="Tag"
                    />
                  )}
                </div>
                <button
                  onClick={() => setActions((p) => p.filter((_, idx) => idx !== i))}
                  className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-rose-400"
                  title="Remover"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-white/60 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            disabled={!canSave || saveMut.isPending}
            onClick={() => saveMut.mutate()}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-40"
          >
            {saveMut.isPending ? '...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
