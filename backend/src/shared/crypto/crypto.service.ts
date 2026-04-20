import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = 'enc:v1:';

/**
 * Utilitário de criptografia simétrica (AES-256-GCM) + helpers de hash/HMAC
 * para uso em campos sensíveis (tokens Evolution, segredos de webhook, etc.).
 *
 * Chave deriva de ENCRYPTION_KEY (>= 32 bytes hex/base64/string) via scrypt.
 * Em dev, se ausente, usa uma chave derivada do JWT_ACCESS_SECRET (log de aviso).
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;
  private readonly hmacKey: Buffer;

  constructor(config: ConfigService) {
    const raw =
      config.get<string>('ENCRYPTION_KEY') ??
      config.get<string>('JWT_ACCESS_SECRET');
    if (!config.get<string>('ENCRYPTION_KEY')) {
      this.logger.warn(
        'ENCRYPTION_KEY não configurada — derivando de JWT_ACCESS_SECRET (defina em produção).',
      );
    }
    if (!raw || raw.length < 16) {
      throw new Error('CryptoService: chave insuficiente (>=16 chars)');
    }
    this.key = scryptSync(raw, 'crmwp:aes', 32);
    this.hmacKey = scryptSync(raw, 'crmwp:hmac', 32);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
  }

  decrypt(payload: string): string {
    if (!this.isEncrypted(payload)) return payload;
    const body = payload.slice(PREFIX.length);
    const [ivB, tagB, dataB] = body.split('.');
    if (!ivB || !tagB || !dataB) {
      throw new Error('CryptoService: payload inválido');
    }
    const iv = Buffer.from(ivB, 'base64url');
    const tag = Buffer.from(tagB, 'base64url');
    const data = Buffer.from(dataB, 'base64url');
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
      throw new Error('CryptoService: iv/tag com tamanho inesperado');
    }
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  }

  isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }

  /** Hash determinístico (para lookup/indexação — não reversível). */
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** HMAC-SHA256 com a chave derivada (para tokens públicos assinados). */
  hmac(value: string): string {
    return createHmac('sha256', this.hmacKey).update(value).digest('hex');
  }
}
