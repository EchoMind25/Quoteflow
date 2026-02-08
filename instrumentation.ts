export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string },
) => {
  // Only report if Sentry is configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(err, {
    tags: {
      route_path: context.routePath,
      route_type: context.routeType,
      router_kind: context.routerKind,
    },
    extra: {
      request_path: request.path,
      request_method: request.method,
      digest: err.digest,
    },
  });
};
