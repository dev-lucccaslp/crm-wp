import { api } from './api';

export type WhatsappStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'QR'
  | 'CONNECTED'
  | 'FAILED';

export interface WhatsappInstance {
  id: string;
  name: string;
  status: WhatsappStatus;
  phoneNumber: string | null;
  createdAt: string;
}

export const whatsappService = {
  async list(): Promise<WhatsappInstance[]> {
    const { data } = await api.get('/whatsapp/instances');
    return data;
  },
  async create(name: string): Promise<WhatsappInstance> {
    const { data } = await api.post('/whatsapp/instances', { name });
    return data;
  },
  async qr(id: string): Promise<{ qrBase64: string | null; status: WhatsappStatus }> {
    const { data } = await api.get(`/whatsapp/instances/${id}/qr`);
    return data;
  },
  async status(id: string): Promise<{ status: WhatsappStatus }> {
    const { data } = await api.get(`/whatsapp/instances/${id}/status`);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/whatsapp/instances/${id}`);
  },
  async sendText(conversationId: string, text: string) {
    const { data } = await api.post('/whatsapp/messages', { conversationId, text });
    return data;
  },
};
