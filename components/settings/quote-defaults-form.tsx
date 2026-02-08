"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  updateQuoteDefaults,
  type SettingsActionState,
} from "@/lib/actions/settings";
import { useToast } from "@/components/toast-provider";

// ============================================================================
// Types
// ============================================================================

type QuoteDefaultsFormProps = {
  quotePrefix: string;
  defaultExpiryDays: number;
  defaultTaxRate: number;
  defaultTerms: string | null;
};

const EXPIRY_OPTIONS = [7, 14, 30, 60, 90];
const initialState: SettingsActionState = {};

// ============================================================================
// Component
// ============================================================================

export function QuoteDefaultsForm({
  quotePrefix,
  defaultExpiryDays,
  defaultTaxRate,
  defaultTerms,
}: QuoteDefaultsFormProps) {
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, formAction, isPending] = useActionState(
    updateQuoteDefaults,
    initialState,
  );

  useEffect(() => {
    if (state.success) toast("Quote defaults saved");
    if (state.error) toast(state.error, "error");
  }, [state, toast]);

  const triggerSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const form = document.getElementById(
        "defaults-form",
      ) as HTMLFormElement | null;
      if (form) {
        const formData = new FormData(form);
        formAction(formData);
      }
    }, 1000);
  }, [formAction]);

  const handleImmediateSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const form = document.getElementById(
      "defaults-form",
    ) as HTMLFormElement | null;
    if (form) {
      const formData = new FormData(form);
      formAction(formData);
    }
  }, [formAction]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[hsl(var(--muted))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Quote Defaults</h1>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />}
      </div>

      <form id="defaults-form" action={formAction} className="space-y-5">
        {/* ---- Quote Prefix ---- */}
        <div className="rounded-xl border border-[hsl(var(--border))] p-4">
          <label
            htmlFor="quote_prefix"
            className="mb-1 block text-sm font-medium"
          >
            Quote Number Prefix
          </label>
          <input
            id="quote_prefix"
            name="quote_prefix"
            defaultValue={quotePrefix}
            maxLength={10}
            onChange={triggerSave}
            onBlur={triggerSave}
            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
          <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            Preview: <span className="font-mono font-medium">{quotePrefix}-00001</span>
          </p>
        </div>

        {/* ---- Expiration ---- */}
        <div className="rounded-xl border border-[hsl(var(--border))] p-4">
          <label
            htmlFor="default_expiry_days"
            className="mb-1 block text-sm font-medium"
          >
            Default Expiration
          </label>
          <select
            id="default_expiry_days"
            name="default_expiry_days"
            defaultValue={defaultExpiryDays}
            onChange={handleImmediateSave}
            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          >
            {EXPIRY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            Quotes expire this many days after being sent.
          </p>
        </div>

        {/* ---- Tax Rate ---- */}
        <div className="rounded-xl border border-[hsl(var(--border))] p-4">
          <label
            htmlFor="default_tax_rate"
            className="mb-1 block text-sm font-medium"
          >
            Default Tax Rate
          </label>
          <div className="flex items-center gap-2">
            <input
              id="default_tax_rate"
              name="default_tax_rate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              defaultValue={defaultTaxRate}
              onChange={triggerSave}
              onBlur={triggerSave}
              className="h-10 w-28 rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
            />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              %
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            Applied automatically to new quotes. Can be adjusted per quote.
          </p>
        </div>

        {/* ---- Default Terms ---- */}
        <div className="rounded-xl border border-[hsl(var(--border))] p-4">
          <label
            htmlFor="default_terms"
            className="mb-1 block text-sm font-medium"
          >
            Default Terms &amp; Conditions
          </label>
          <textarea
            id="default_terms"
            name="default_terms"
            rows={5}
            defaultValue={defaultTerms ?? ""}
            onChange={triggerSave}
            onBlur={triggerSave}
            placeholder="e.g., Payment due within 30 days of acceptance. Warranty covers labor for 12 months..."
            className="w-full resize-y rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
          <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            Included at the bottom of every quote. Whitespace is preserved.
          </p>
        </div>
      </form>
    </div>
  );
}
