import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../infra/prisma/prisma.service';

const SKIP_PATHS = [/^\/?health/i, /^\/?api\/webhooks/i, /^\/?api\/auth/i];
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Registra automaticamente um AuditLog para cada mutation HTTP bem-sucedida
 * que tenha `req.user` e `req.workspace`. Não loga webhooks nem /auth.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      user?: { id: string };
      workspace?: { id: string };
      params?: Record<string, string>;
    }>();

    return next.handle().pipe(
      tap((result) => {
        const method = req.method?.toUpperCase();
        if (!method || !MUTATION_METHODS.has(method)) return;

        const path = req.originalUrl ?? req.url ?? '';
        if (SKIP_PATHS.some((re) => re.test(path))) return;

        const userId = req.user?.id;
        const workspaceId = req.workspace?.id;
        if (!userId || !workspaceId) return;

        const controller = ctx.getClass().name.replace(/Controller$/, '');
        const handler = ctx.getHandler().name;
        const action = `${controller}.${handler}`.toLowerCase();
        const entityId =
          (result && typeof result === 'object' && 'id' in result
            ? (result as { id?: string }).id
            : undefined) ??
          req.params?.id ??
          null;

        this.prisma.auditLog
          .create({
            data: {
              workspaceId,
              userId,
              action,
              entity: controller.toLowerCase(),
              entityId,
              metadata: { method, path },
            },
          })
          .catch((err) => this.logger.warn(`audit log falhou: ${err.message}`));
      }),
    );
  }
}
