"use client";

import { useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

export type ConflictItem = {
  item_id: string;
  quote_id: string;
  server_updated_at: string;
};

type SyncConflictDialogProps = {
  conflicts: ConflictItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ============================================================================
// Component
// ============================================================================

export function SyncConflictDialog({
  conflicts,
  open,
  onOpenChange,
}: SyncConflictDialogProps) {
  const router = useRouter();

  const handleReloadServerData = useCallback(() => {
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router]);

  const handleKeepMyChanges = useCallback(() => {
    // Last-write-wins was already applied — just dismiss
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold">
                Sync Conflicts
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {conflicts.length} quote{conflicts.length !== 1 ? "s were" : " was"}{" "}
                modified on another device. Your changes were applied (last-write-wins).
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Conflict list */}
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
            {conflicts.map((c) => (
              <li
                key={c.item_id}
                className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2"
              >
                <p className="truncate text-sm font-medium">
                  Quote {c.quote_id.slice(0, 8)}...
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Server updated:{" "}
                  {new Date(c.server_updated_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleKeepMyChanges}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Keep My Changes
            </button>
            <button
              type="button"
              onClick={handleReloadServerData}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-[hsl(var(--border))] text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
            >
              Reload Server Data
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
