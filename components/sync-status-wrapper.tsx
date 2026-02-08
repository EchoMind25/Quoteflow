"use client";

import { useCallback, useState } from "react";
import { SyncStatus } from "@/components/sync-status";
import {
  SyncConflictDialog,
  type ConflictItem,
} from "@/components/sync-conflict-dialog";

export function SyncStatusWrapper() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleConflicts = useCallback((items: ConflictItem[]) => {
    setConflicts(items);
    setDialogOpen(true);
  }, []);

  return (
    <>
      <SyncStatus onConflicts={handleConflicts} />
      <SyncConflictDialog
        conflicts={conflicts}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
