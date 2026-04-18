import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreateInstancePayload {
  instanceName: string;
  webhookUrl: string;
}

export interface SendTextPayload {
  instanceName: string;
  number: string;
  text: string;
}

@Injectable()
export class EvolutionApiClient {
  private readonly logger = new Logger(EvolutionApiClient.name);

  constructor(private readonly config: ConfigService) {}

  private baseUrl() {
    return this.config.getOrThrow<string>('EVOLUTION_BASE_URL');
  }
  private apiKey() {
    return this.config.getOrThrow<string>('EVOLUTION_API_KEY');
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl()}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        this.logger.warn(`Evolution ${method} ${path} → ${res.status} ${text}`);
        throw new ServiceUnavailableException(
          `Evolution API error: ${res.status}`,
        );
      }
      return data as T;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Evolution request failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Evolution API indisponível');
    }
  }

  async createInstance(payload: CreateInstancePayload) {
    return this.request('POST', '/instance/create', {
      instanceName: payload.instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: payload.webhookUrl,
        byEvents: false,
        base64: false,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE',
        ],
      },
    });
  }

  async getQrCode(instanceName: string) {
    return this.request<{ base64?: string; code?: string }>(
      'GET',
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );
  }

  async getConnectionState(instanceName: string) {
    return this.request<{ instance?: { state?: string } }>(
      'GET',
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );
  }

  async logout(instanceName: string) {
    return this.request('DELETE', `/instance/logout/${encodeURIComponent(instanceName)}`);
  }

  async deleteInstance(instanceName: string) {
    return this.request('DELETE', `/instance/delete/${encodeURIComponent(instanceName)}`);
  }

  async sendText(payload: SendTextPayload) {
    return this.request<{ key?: { id?: string } }>(
      'POST',
      `/message/sendText/${encodeURIComponent(payload.instanceName)}`,
      { number: payload.number, text: payload.text },
    );
  }
}
