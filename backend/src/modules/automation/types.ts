export type AutomationTrigger =
  | { type: 'lead.created'; columnId?: string }
  | { type: 'lead.moved'; toColumnId?: string; fromColumnId?: string }
  | { type: 'message.received'; contains?: string };

export type AutomationAction =
  | { type: 'send_message'; text: string }
  | { type: 'move_to_column'; columnId: string }
  | { type: 'add_tag'; tag: string };

export type AutomationEventPayload =
  | {
      type: 'lead.created';
      workspaceId: string;
      leadId: string;
      columnId: string;
      contactId: string | null;
    }
  | {
      type: 'lead.moved';
      workspaceId: string;
      leadId: string;
      fromColumnId: string | null;
      toColumnId: string;
      contactId: string | null;
    }
  | {
      type: 'message.received';
      workspaceId: string;
      conversationId: string;
      contactId: string;
      leadId: string | null;
      content: string;
    };
