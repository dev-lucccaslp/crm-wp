import { api } from './api';

export type TriggerType = 'lead.created' | 'lead.moved' | 'message.received';

export type AutomationTrigger =
  | { type: 'lead.created'; columnId?: string }
  | { type: 'lead.moved'; toColumnId?: string; fromColumnId?: string }
  | { type: 'message.received'; contains?: string };

export type AutomationAction =
  | { type: 'send_message'; text: string }
  | { type: 'move_to_column'; columnId: string }
  | { type: 'add_tag'; tag: string };

export interface Automation {
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationInput {
  name: string;
  enabled?: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
}

export const automationService = {
  async list(): Promise<Automation[]> {
    const { data } = await api.get('/automations');
    return data;
  },
  async create(input: AutomationInput): Promise<Automation> {
    const { data } = await api.post('/automations', input);
    return data;
  },
  async update(id: string, input: Partial<AutomationInput>): Promise<Automation> {
    const { data } = await api.patch(`/automations/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/automations/${id}`);
  },
};
