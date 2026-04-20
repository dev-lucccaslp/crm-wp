import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export const CORRELATION_HEADER = 'x-request-id';

/**
 * Atribui um correlation id (X-Request-Id) para cada request.
 * Reaproveita o valor do cliente se presente, caso contrário gera UUID v4.
 * O mesmo id é escrito no header da response e propagado no logger (req.id).
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(CORRELATION_HEADER);
    const id =
      incoming && /^[a-zA-Z0-9._-]{6,128}$/.test(incoming)
        ? incoming
        : randomUUID();
    (req as Request & { id?: string }).id = id;
    res.setHeader(CORRELATION_HEADER, id);
    next();
  }
}
