import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Gauge, Histogram } from "prom-client";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

/**
 * Global interceptor - records Prometheus metrics for every HTTP request:
 *   • http_requests_total          (counter,   labels: method, route, status_code)
 *   • http_request_duration_seconds (histogram, labels: method, route, status_code)
 *   • http_requests_in_flight      (gauge,      labels: method)
 *
 * Route label is normalised to the router pattern (e.g. "/posts/:id") so
 * high-cardinality URLs don't create unbounded metric series.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric("http_requests_total")
    private readonly requestsTotal: Counter<string>,
    @InjectMetric("http_request_duration_seconds")
    private readonly requestDuration: Histogram<string>,
    @InjectMetric("http_requests_in_flight")
    private readonly inFlight: Gauge<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method ?? "UNKNOWN";

    // Fastify exposes the router pattern on routerPath (fallback to raw URL)
    const route: string =
      (req.routerPath as string | undefined) ??
      (req.routeOptions?.url as string | undefined) ??
      req.url ??
      "unknown";

    // Skip /metrics itself to avoid meta-recursion
    if (route === "/metrics") {
      return next.handle();
    }

    this.inFlight.inc({ method });
    const stopTimer = this.requestDuration.startTimer({ method, route });

    const record = (statusCode: number): void => {
      const status_code = String(statusCode);
      stopTimer({ status_code });
      this.requestsTotal.inc({ method, route, status_code });
      this.inFlight.dec({ method });
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          record(res.statusCode as number);
        },
        error: (err: { status?: number }) => {
          record(err.status ?? 500);
        },
      }),
    );
  }
}
