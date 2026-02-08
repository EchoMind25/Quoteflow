"use client";

import { useActionState } from "react";
import {
  signupWithMagicLink,
  type AuthState,
} from "@/app/actions/auth";
import {
  Mail,
  Building2,
  User,
  ArrowRight,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const initialState: AuthState = {};

const INDUSTRIES = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "general", label: "General / Other" },
] as const;

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signupWithMagicLink,
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
          We sent a magic link to your inbox. Click the link to finish
          setting up your account.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="first_name"
            className="mb-1.5 block text-sm font-medium"
          >
            First name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="Jane"
              className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="last_name"
            className="mb-1.5 block text-sm font-medium"
          >
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            autoComplete="family-name"
            placeholder="Smith"
            className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>
      </div>

      {/* Email */}
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

      {/* Business name */}
      <div>
        <label
          htmlFor="business_name"
          className="mb-1.5 block text-sm font-medium"
        >
          Business name
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            id="business_name"
            name="business_name"
            type="text"
            required
            minLength={2}
            placeholder="Acme HVAC Services"
            className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>
      </div>

      {/* Industry */}
      <div>
        <label
          htmlFor="industry"
          className="mb-1.5 block text-sm font-medium"
        >
          Industry
        </label>
        <select
          id="industry"
          name="industry"
          defaultValue="general"
          className="h-11 w-full appearance-none rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
        >
          {INDUSTRIES.map((ind) => (
            <option key={ind.value} value={ind.value}>
              {ind.label}
            </option>
          ))}
        </select>
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
            Create account
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
