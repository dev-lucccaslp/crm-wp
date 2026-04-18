import { api } from './api';

export interface Conversation {
  id: string;
  workspaceId: string;
  instanceId: string;
  contactId: string;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  unreadCount: number;
  archivedAt: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string | null;
    phone: string;
    avatarUrl: string | null;
  };
  instance: { id: string; name: string; status: string };
}

export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type MessageMediaType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'DOCUMENT'
  | 'STICKER';

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  status: MessageStatus;
  content: string | null;
  mediaType: MessageMediaType;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  externalId: string | null;
  createdAt: string;
}

export const chatService = {
  async listConversations(): Promise<Conversation[]> {
    const { data } = await api.get('/chat/conversations');
    return data;
  },
  async listMessages(id: string, before?: string): Promise<Message[]> {
    const { data } = await api.get(`/chat/conversations/${id}/messages`, {
      params: before ? { before } : {},
    });
    return data;
  },
  async markRead(id: string): Promise<void> {
    await api.post(`/chat/conversations/${id}/read`);
  },
};
