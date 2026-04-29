import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

/**
 * Logs every inbound HTTP request and its outcome using PinoLogger.
 *
 * Structured fields emitted per request:
 *   method, url, statusCode, durationMs, requestId
 *
 * In production the output is one JSON line per request, collected by
 * the Docker log driver (json-file) and shippable to Loki / ELK.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(LoggingInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      id: string; // requestId set by pino-http genReqId
    }>();
    const { method, url } = req;
    const requestId = req.id;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context
            .switchToHttp()
            .getResponse<{ statusCode: number }>();
          const durationMs = Date.now() - start;

          this.logger.info(
            { method, url, statusCode: res.statusCode, durationMs, requestId },
            `${method} ${url} ${res.statusCode} +${durationMs}ms`,
          );
        },
        error: (err: { status?: number; message?: string }) => {
          const statusCode = err.status ?? 500;
          const message = err.message ?? "Internal error";
          const durationMs = Date.now() - start;

          this.logger.error(
            { method, url, statusCode, durationMs, requestId, error: message },
            `${method} ${url} ${statusCode} +${durationMs}ms - ${message}`,
          );
        },
      }),
    );
  }
}
