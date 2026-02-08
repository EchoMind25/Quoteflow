"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  type CatalogActionState,
} from "@/lib/actions/settings";
import { useToast } from "@/components/toast-provider";
import type { PricingCatalogItem } from "@/types/database";
import { formatCents } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = ["All", "HVAC", "Plumbing", "Electrical", "Other"] as const;
const UNITS = ["ea", "hr", "sqft", "ft", "job"] as const;
const initialState: CatalogActionState = {};

// ============================================================================
// Component
// ============================================================================

export function CatalogList({
  items: initialItems,
}: {
  items: PricingCatalogItem[];
}) {
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<string>("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (filter === "All") return items;
    return items.filter(
      (i) => (i.category ?? "Other").toLowerCase() === filter.toLowerCase(),
    );
  }, [items, filter]);

  // ---- Create action ----
  const [createState, createAction, isCreating] = useActionState(
    createCatalogItem,
    initialState,
  );

  useEffect(() => {
    if (createState.success && createState.itemId) {
      toast("Item added");
      setShowForm(false);
      // Optimistic add — refresh will get real data
      const form = document.getElementById(
        "create-form",
      ) as HTMLFormElement | null;
      if (form) {
        const fd = new FormData(form);
        setItems((prev) => [
          ...prev,
          {
            id: createState.itemId!,
            business_id: "",
            title: (fd.get("title") as string) || "",
            description: (fd.get("description") as string) || null,
            category: (fd.get("category") as string) || null,
            unit: (fd.get("unit") as string) || "ea",
            unit_price_cents: parseInt(
              (fd.get("unit_price_cents") as string) || "0",
              10,
            ),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }
    }
    if (createState.error) toast(createState.error, "error");
  }, [createState, toast]);

  // ---- Update action ----
  const [updateState, updateAction, isUpdating] = useActionState(
    updateCatalogItem,
    initialState,
  );

  useEffect(() => {
    if (updateState.success) {
      toast("Item updated");
      setEditingId(null);
    }
    if (updateState.error) toast(updateState.error, "error");
  }, [updateState, toast]);

  // ---- Delete action ----
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteCatalogItem,
    initialState,
  );

  useEffect(() => {
    if (deleteState.success) {
      toast("Item removed");
    }
    if (deleteState.error) toast(deleteState.error, "error");
  }, [deleteState, toast]);

  const handleDelete = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      const formData = new FormData();
      formData.append("id", id);
      deleteAction(formData);
    },
    [deleteAction],
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">Service Catalog</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* ---- Category tabs ---- */}
      <div className="flex gap-1.5 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-brand-600 text-white"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ---- Add form ---- */}
      {showForm && (
        <CatalogForm
          formId="create-form"
          action={createAction}
          isPending={isCreating}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ---- Items list ---- */}
      {filteredItems.length === 0 && !showForm && (
        <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No items yet. Add your first service or material.
        </p>
      )}

      <div className="space-y-2">
        {filteredItems.map((item) =>
          editingId === item.id ? (
            <CatalogForm
              key={item.id}
              formId={`edit-${item.id}`}
              action={updateAction}
              isPending={isUpdating}
              defaultValues={item}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <CatalogCard
              key={item.id}
              item={item}
              onEdit={() => {
                setEditingId(item.id);
                setShowForm(false);
              }}
              onDelete={() => handleDelete(item.id)}
              isDeleting={isDeleting}
            />
          ),
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function CatalogCard({
  item,
  onEdit,
  onDelete,
  isDeleting,
}: {
  item: PricingCatalogItem;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item.title}</p>
          {item.category && (
            <span className="shrink-0 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-medium">
              {item.category}
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            {item.description}
          </p>
        )}
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
          {formatCents(item.unit_price_cents)} / {item.unit}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--destructive))]"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CatalogForm({
  formId,
  action,
  isPending,
  defaultValues,
  onCancel,
}: {
  formId: string;
  action: (formData: FormData) => void;
  isPending: boolean;
  defaultValues?: PricingCatalogItem;
  onCancel: () => void;
}) {
  const [priceDisplay, setPriceDisplay] = useState(
    defaultValues ? (defaultValues.unit_price_cents / 100).toFixed(2) : "",
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      // Convert dollar display to cents
      const dollars = parseFloat(priceDisplay) || 0;
      formData.set("unit_price_cents", String(Math.round(dollars * 100)));
      if (defaultValues) {
        formData.set("id", defaultValues.id);
      }
      action(formData);
    },
    [action, defaultValues, priceDisplay],
  );

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/30"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {defaultValues ? "Edit Item" : "New Item"}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 w-7 items-center justify-center rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        name="title"
        placeholder="Service or material name"
        defaultValue={defaultValues?.title}
        required
        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
      />
      <input
        name="description"
        placeholder="Description (optional)"
        defaultValue={defaultValues?.description ?? ""}
        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
      />

      <div className="grid grid-cols-3 gap-3">
        <select
          name="category"
          defaultValue={defaultValues?.category ?? ""}
          className="h-10 rounded-lg border border-[hsl(var(--border))] bg-transparent px-2 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
        >
          <option value="">Category</option>
          <option value="HVAC">HVAC</option>
          <option value="Plumbing">Plumbing</option>
          <option value="Electrical">Electrical</option>
          <option value="Other">Other</option>
        </select>

        <select
          name="unit"
          defaultValue={defaultValues?.unit ?? "ea"}
          className="h-10 rounded-lg border border-[hsl(var(--border))] bg-transparent px-2 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent pl-7 pr-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : defaultValues ? (
            "Save Changes"
          ) : (
            "Add Item"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

