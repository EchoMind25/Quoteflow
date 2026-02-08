"use client";

import { Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type TranscriptEditorProps = {
  transcript: string;
  confidence: number;
  onTranscriptChange: (text: string) => void;
  isLoading?: boolean;
};

// ============================================================================
// Component
// ============================================================================

export function TranscriptEditor({
  transcript,
  confidence,
  onTranscriptChange,
  isLoading = false,
}: TranscriptEditorProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Transcribing your voice note...
        </div>
        {/* Skeleton */}
        <div className="animate-pulse space-y-2 rounded-lg border border-[hsl(var(--border))] p-4">
          <div className="h-3 w-full rounded bg-[hsl(var(--muted))]" />
          <div className="h-3 w-4/5 rounded bg-[hsl(var(--muted))]" />
          <div className="h-3 w-3/5 rounded bg-[hsl(var(--muted))]" />
        </div>
      </div>
    );
  }

  const badge = getConfidenceBadge(confidence);

  return (
    <div className="space-y-3">
      {/* Header with confidence badge */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="transcript"
          className="text-sm font-medium"
        >
          Transcript
        </label>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
          title={`Confidence: ${Math.round(confidence * 100)}%`}
        >
          {badge.label}
        </span>
      </div>

      {/* Editable textarea */}
      <textarea
        id="transcript"
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        rows={6}
        className="w-full resize-y rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
        placeholder="Transcript will appear here..."
      />

      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        You can edit the transcript above to correct any mistakes before
        proceeding.
      </p>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.85) {
    return {
      label: `${Math.round(confidence * 100)}% accurate`,
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
  }
  if (confidence >= 0.6) {
    return {
      label: `${Math.round(confidence * 100)}% — review suggested`,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  }
  return {
    label: `${Math.round(confidence * 100)}% — please review`,
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
}
