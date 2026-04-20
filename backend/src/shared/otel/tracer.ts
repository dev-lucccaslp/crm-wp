/**
 * Shim de OpenTelemetry — no-op por padrão.
 *
 * Deixa o código pronto para ativar tracing real (OTLP) sem mudanças no
 * call-site. Basta instalar `@opentelemetry/sdk-node` + exporter e substituir
 * a implementação de `initTracing()` para registrar o `NodeSDK`.
 *
 * Uso:
 *   import { initTracing } from './shared/otel/tracer';
 *   initTracing(); // chamar ANTES de NestFactory.create em main.ts
 */

let initialized = false;

export function initTracing(serviceName = 'crm-wp-backend'): void {
  if (initialized) return;
  initialized = true;
  if (process.env.OTEL_ENABLED !== 'true') {
    // no-op em dev/test — mantém footprint zero
    return;
  }
  // eslint-disable-next-line no-console
  console.log(
    `[otel] tracing requested for ${serviceName} — SDK não instalado (stub no-op)`,
  );
}

export function noopSpan<T>(_name: string, fn: () => T): T {
  return fn();
}
