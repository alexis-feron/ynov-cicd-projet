import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
  PrometheusModule,
} from "@willsoto/nestjs-prometheus";
import { HttpMetricsInterceptor } from "./interceptors/http-metrics.interceptor";

@Module({
  imports: [
    PrometheusModule.register({
      path: "/metrics",
      // Default metrics: CPU, memory, event-loop lag, GC pause, etc.
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    // ── HTTP request counter ─────────────────────────────────
    makeCounterProvider({
      name: "http_requests_total",
      help: "Total number of HTTP requests.",
      labelNames: ["method", "route", "status_code"] as const,
    }),

    // ── HTTP request duration histogram ──────────────────────
    makeHistogramProvider({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds.",
      labelNames: ["method", "route", "status_code"] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),

    // ── In-flight requests gauge ──────────────────────────────
    makeGaugeProvider({
      name: "http_requests_in_flight",
      help: "Number of HTTP requests currently being processed.",
      labelNames: ["method"] as const,
    }),

    // Register interceptor via DI so it can inject the metric providers
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class MetricsModule {}
