"use client";

import { useActionState } from "react";
import { loginWithMagicLink, type AuthState } from "@/app/actions/auth";
import { Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginWithMagicLink,
    initialState,
  );

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          We sent a magic link to your inbox. Click the link to sign in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-[hsl(var(--destructive))]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Send magic link
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
