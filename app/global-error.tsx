"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Quotestream] Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            An unexpected error occurred. Please try again.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Try again
            </button>
            <Link
              href="/"
              className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium transition-colors hover:bg-gray-100"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
