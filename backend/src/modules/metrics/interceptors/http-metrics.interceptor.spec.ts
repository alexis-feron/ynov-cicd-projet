import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { HttpMetricsInterceptor } from "./http-metrics.interceptor";
import type { Counter, Gauge, Histogram } from "prom-client";

// ── Minimal metric mocks ───────────────────────────────────────────────────

const makeCounter = (): Counter<string> =>
  ({ inc: vi.fn() }) as unknown as Counter<string>;

const stopTimer = vi.fn();
const makeHistogram = (): Histogram<string> =>
  ({
    startTimer: vi.fn().mockReturnValue(stopTimer),
  }) as unknown as Histogram<string>;

const makeGauge = (): Gauge<string> =>
  ({ inc: vi.fn(), dec: vi.fn() }) as unknown as Gauge<string>;

// ── Execution context helpers ──────────────────────────────────────────────

const makeContext = (
  method: string,
  routerPath: string,
  statusCode: number,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ method, routerPath, url: routerPath }),
      getResponse: () => ({ statusCode }),
    }),
  }) as unknown as ExecutionContext;

const makeHandler = (observable = of({})) =>
  ({ handle: () => observable }) as CallHandler;

// ── Tests ──────────────────────────────────────────────────────────────────

describe("HttpMetricsInterceptor", () => {
  let interceptor: HttpMetricsInterceptor;
  let counter: Counter<string>;
  let histogram: Histogram<string>;
  let gauge: Gauge<string>;

  beforeEach(() => {
    counter = makeCounter();
    histogram = makeHistogram();
    gauge = makeGauge();
    interceptor = new HttpMetricsInterceptor(counter, histogram, gauge);
    vi.clearAllMocks();
    stopTimer.mockClear();
  });

  it("records counter and stops histogram timer on success", async () => {
    const ctx = makeContext("GET", "/posts", 200);
    await new Promise<void>((resolve) =>
      interceptor
        .intercept(ctx, makeHandler())
        .subscribe({ complete: resolve }),
    );

    expect(histogram.startTimer).toHaveBeenCalledWith({
      method: "GET",
      route: "/posts",
    });
    expect(stopTimer).toHaveBeenCalledWith({ status_code: "200" });
    expect(counter.inc).toHaveBeenCalledWith({
      method: "GET",
      route: "/posts",
      status_code: "200",
    });
  });

  it("increments in-flight gauge on start and decrements on complete", async () => {
    const ctx = makeContext("POST", "/posts", 201);
    await new Promise<void>((resolve) =>
      interceptor
        .intercept(ctx, makeHandler())
        .subscribe({ complete: resolve }),
    );

    expect(gauge.inc).toHaveBeenCalledWith({ method: "POST" });
    expect(gauge.dec).toHaveBeenCalledWith({ method: "POST" });
  });

  it("records 500 status code on error", async () => {
    const ctx = makeContext("GET", "/posts/:id", 500);
    const handler = makeHandler(throwError(() => new Error("boom")));

    await new Promise<void>((resolve) =>
      interceptor.intercept(ctx, handler).subscribe({ error: () => resolve() }),
    );

    expect(stopTimer).toHaveBeenCalledWith({ status_code: "500" });
    expect(counter.inc).toHaveBeenCalledWith(
      expect.objectContaining({ status_code: "500" }),
    );
    expect(gauge.dec).toHaveBeenCalled();
  });

  it("uses err.status when present on error", async () => {
    const ctx = makeContext("GET", "/posts/:id", 404);
    const handler = makeHandler(
      throwError(() => ({ status: 404, message: "Not Found" })),
    );

    await new Promise<void>((resolve) =>
      interceptor.intercept(ctx, handler).subscribe({ error: () => resolve() }),
    );

    expect(stopTimer).toHaveBeenCalledWith({ status_code: "404" });
  });

  it("skips /metrics route to avoid recursion", () => {
    const ctx = makeContext("GET", "/metrics", 200);
    interceptor.intercept(ctx, makeHandler());

    expect(histogram.startTimer).not.toHaveBeenCalled();
    expect(counter.inc).not.toHaveBeenCalled();
  });
});
