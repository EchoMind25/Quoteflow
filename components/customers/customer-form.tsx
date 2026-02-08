"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import {
  createCustomer,
  updateCustomer,
  type CreateCustomerState,
  type UpdateCustomerState,
} from "@/lib/actions/customers";

// ============================================================================
// Types
// ============================================================================

type CustomerFormProps = {
  mode?: "create" | "edit";
  customerId?: string;
  defaultValues?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    company_name?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
    notes?: string | null;
  };
};

// ============================================================================
// Component
// ============================================================================

const initialCreateState: CreateCustomerState = {};
const initialUpdateState: UpdateCustomerState = {};

export function CustomerForm({
  mode = "create",
  customerId,
  defaultValues,
}: CustomerFormProps) {
  const router = useRouter();

  const [createState, createAction, isCreating] = useActionState(
    createCustomer,
    initialCreateState,
  );

  const [updateState, updateAction, isUpdating] = useActionState(
    updateCustomer,
    initialUpdateState,
  );

  const state = mode === "create" ? createState : updateState;
  const action = mode === "create" ? createAction : updateAction;
  const isPending = mode === "create" ? isCreating : isUpdating;

  // Navigate on success
  useEffect(() => {
    if (mode === "create" && createState.success && createState.customerId) {
      router.push(`/app/customers/${createState.customerId}`);
    } else if (mode === "edit" && updateState.success) {
      router.refresh();
    }
  }, [
    mode,
    createState.success,
    createState.customerId,
    updateState.success,
    router,
  ]);

  return (
    <div className="mx-auto max-w-lg">
      {mode === "create" && (
        <Link
          href="/app/customers"
          className="mb-4 flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>
      )}

      <form action={action} className="space-y-4">
        {mode === "edit" && customerId && (
          <input type="hidden" name="customer_id" value={customerId} />
        )}

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            name="first_name"
            label="First Name"
            defaultValue={defaultValues?.first_name}
          />
          <FormField
            name="last_name"
            label="Last Name"
            defaultValue={defaultValues?.last_name}
          />
        </div>

        {/* Contact */}
        <FormField
          name="email"
          label="Email"
          type="email"
          defaultValue={defaultValues?.email}
        />
        <FormField
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={defaultValues?.phone}
        />
        <FormField
          name="company_name"
          label="Company"
          defaultValue={defaultValues?.company_name}
        />

        {/* Address */}
        <FormField
          name="address_line1"
          label="Address Line 1"
          defaultValue={defaultValues?.address_line1}
        />
        <FormField
          name="address_line2"
          label="Address Line 2"
          defaultValue={defaultValues?.address_line2}
        />
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <FormField
              name="city"
              label="City"
              defaultValue={defaultValues?.city}
            />
          </div>
          <FormField
            name="state"
            label="State"
            defaultValue={defaultValues?.state}
          />
          <FormField
            name="zip_code"
            label="ZIP"
            defaultValue={defaultValues?.zip_code}
          />
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaultValues?.notes ?? ""}
            className="w-full resize-y rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>

        {/* Error */}
        {state.error && (
          <p className="text-sm text-[hsl(var(--destructive))]">
            {state.error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? "Create Customer" : "Save Changes"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FormField({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
      />
    </div>
  );
}
