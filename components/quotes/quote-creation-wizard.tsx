"use client";

import dynamic from "next/dynamic";
import { formatCents } from "@/lib/utils";
import { useActionState, useCallback, useState } from "react";
import {
  Mic,
  FileText,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Loader2,
  Sparkles,
  RefreshCw,
  Pencil,
  Trash2,
  Users,
  ImageIcon,
} from "lucide-react";
import { PhotoCapture } from "@/components/quotes/photo-capture";
import {
  CustomerSearch,
  type CustomerResult,
} from "@/components/customers/customer-search";
import {
  transcribeVoiceNote,
  generateQuoteFromAI,
  type TranscribeState,
  type GenerateQuoteState,
  type GeneratedLineItem,
} from "@/lib/actions/ai";
import {
  uploadQuotePhotos,
  saveQuotePhotos,
  type UploadedPhoto,
  type UploadPhotosResult,
} from "@/lib/storage/upload-photos";
import { cacheAudio } from "@/lib/db/indexed-db";
import { isOnline } from "@/lib/sync/offline-sync";
import { createQuoteOptimistic } from "@/lib/sync/optimistic-quote";
import type { IndustryType } from "@/types/database";

// Lazy-load heavy components (not needed on first render / customer step)
const VoiceRecorder = dynamic(
  () =>
    import("@/components/quotes/voice-recorder").then(
      (mod) => mod.VoiceRecorder,
    ),
  {
    loading: () => (
      <div className="flex h-32 items-center justify-center rounded-lg border border-[hsl(var(--border))]">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    ),
  },
);

const TranscriptEditor = dynamic(
  () =>
    import("@/components/quotes/transcript-editor").then(
      (mod) => mod.TranscriptEditor,
    ),
  {
    loading: () => (
      <div className="h-24 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
    ),
  },
);

// ============================================================================
// Types
// ============================================================================

type WizardStep =
  | "customer"
  | "photos"
  | "voice"
  | "transcript"
  | "generating"
  | "review";

type SelectedCustomer = {
  id: string;
  name: string;
};

type WizardState = {
  selectedCustomer: SelectedCustomer | null;
  audioBlob: Blob | null;
  audioDuration: number;
  transcript: string;
  confidence: number;
  skipVoice: boolean;
  photoUrls: string[];
  industry: IndustryType;
  generatedTitle: string;
  scopeOfWork: string;
  lineItems: GeneratedLineItem[];
  overallConfidence: number;
};

type QuoteCreationWizardProps = {
  photoUrls?: string[];
  industry?: IndustryType;
  businessId?: string;
  userId?: string;
  defaultTaxRate?: number;
  defaultExpiryDays?: number;
};

// ============================================================================
// Component
// ============================================================================

const initialTranscribeState: TranscribeState = {};
const initialGenerateState: GenerateQuoteState = {};

export function QuoteCreationWizard({
  photoUrls = [],
  industry = "general",
  businessId,
  userId,
  defaultTaxRate = 0,
  defaultExpiryDays,
}: QuoteCreationWizardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [showInlineCustomerForm, setShowInlineCustomerForm] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [step, setStep] = useState<WizardStep>("customer");
  const [wizardState, setWizardState] = useState<WizardState>({
    selectedCustomer: null,
    audioBlob: null,
    audioDuration: 0,
    transcript: "",
    confidence: 0,
    skipVoice: false,
    photoUrls,
    industry,
    generatedTitle: "",
    scopeOfWork: "",
    lineItems: [],
    overallConfidence: 0,
  });

  // ---- Transcription action ----
  const [transcribeState, transcribeAction, isTranscribing] = useActionState(
    async (_prev: TranscribeState, formData: FormData) => {
      const result = await transcribeVoiceNote(_prev, formData);
      if (result.transcript) {
        setWizardState((s) => ({
          ...s,
          transcript: result.transcript ?? "",
          confidence: result.confidence ?? 0,
        }));
      }
      return result;
    },
    initialTranscribeState,
  );

  // ---- Quote generation action ----
  const [generateState, generateAction, isGenerating] = useActionState(
    async (_prev: GenerateQuoteState, formData: FormData) => {
      const result = await generateQuoteFromAI(_prev, formData);
      if (result.lineItems) {
        setWizardState((s) => ({
          ...s,
          lineItems: result.lineItems ?? [],
          generatedTitle: result.title ?? "",
          scopeOfWork: result.scopeOfWork ?? "",
          overallConfidence: result.confidence ?? 0,
        }));
        setStep("review");
      }
      return result;
    },
    initialGenerateState,
  );

  // ---- Handle recording complete ----
  const handleRecordingComplete = useCallback(
    async (blob: Blob, durationSeconds: number) => {
      setWizardState((s) => ({
        ...s,
        audioBlob: blob,
        audioDuration: durationSeconds,
      }));

      try {
        await cacheAudio("pending", blob, durationSeconds, blob.type);
      } catch {
        // Non-fatal
      }

      setStep("transcript");

      const formData = new FormData();
      formData.append(
        "audio",
        new File([blob], "voice-note.webm", { type: blob.type }),
      );
      transcribeAction(formData);
    },
    [transcribeAction],
  );

  // ---- Handle skip ----
  const handleSkip = useCallback(() => {
    setWizardState((s) => ({ ...s, skipVoice: true }));
    setStep("transcript");
  }, []);

  // ---- Handle transcript change ----
  const handleTranscriptChange = useCallback((text: string) => {
    setWizardState((s) => ({ ...s, transcript: text }));
  }, []);

  // ---- Handle generate ----
  const handleGenerate = useCallback(() => {
    setStep("generating");
    const formData = new FormData();
    formData.append("transcript", wizardState.transcript);
    formData.append("industry", wizardState.industry);
    formData.append(
      "photo_urls",
      JSON.stringify(wizardState.photoUrls),
    );
    generateAction(formData);
  }, [
    generateAction,
    wizardState.transcript,
    wizardState.industry,
    wizardState.photoUrls,
  ]);

  // ---- Handle regenerate ----
  const handleRegenerate = useCallback(() => {
    setWizardState((s) => ({
      ...s,
      lineItems: [],
      generatedTitle: "",
      scopeOfWork: "",
      overallConfidence: 0,
    }));
    handleGenerate();
  }, [handleGenerate]);

  // ---- Handle line item edit ----
  const handleLineItemChange = useCallback(
    (index: number, updates: Partial<GeneratedLineItem>) => {
      setWizardState((s) => ({
        ...s,
        lineItems: s.lineItems.map((item, i) =>
          i === index ? { ...item, ...updates } : item,
        ),
      }));
    },
    [],
  );

  // ---- Handle line item removal ----
  const handleRemoveLineItem = useCallback((index: number) => {
    setWizardState((s) => ({
      ...s,
      lineItems: s.lineItems.filter((_, i) => i !== index),
    }));
  }, []);

  // ---- Handle save quote (online or offline) ----
  const handleSaveQuote = useCallback(async () => {
    if (!businessId || !userId) return;
    if (wizardState.lineItems.length === 0) return;

    setIsSaving(true);
    const expiresAt = defaultExpiryDays
      ? new Date(
          Date.now() + defaultExpiryDays * 24 * 60 * 60 * 1000,
        ).toISOString()
      : undefined;

    const quoteInput = {
      businessId,
      userId,
      title: wizardState.generatedTitle || "Untitled Quote",
      description: wizardState.scopeOfWork || undefined,
      customerId: wizardState.selectedCustomer?.id,
      lineItems: wizardState.lineItems.map((li, idx) => ({
        title: li.title,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unit_price_cents: li.unitPriceCents,
        line_total_cents: li.unitPriceCents * li.quantity,
        item_type: li.itemType,
        sort_order: idx,
      })),
      voiceTranscript: wizardState.transcript || undefined,
      voiceConfidence: wizardState.confidence || undefined,
      taxRate: defaultTaxRate,
      expiresAt,
    };

    try {
      const { tempId } = await createQuoteOptimistic(quoteInput);

      // Save photo records linked to the new quote
      if (uploadedPhotos.length > 0 && isOnline()) {
        await saveQuotePhotos(tempId, uploadedPhotos);
      }

      window.location.href = "/app/quotes";
    } finally {
      setIsSaving(false);
    }
  }, [businessId, userId, wizardState, defaultTaxRate, defaultExpiryDays, uploadedPhotos]);

  // ---- Customer selection handlers ----
  const handleSelectCustomer = useCallback((customer: CustomerResult) => {
    const name = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ") || "Unnamed";
    setWizardState((s) => ({
      ...s,
      selectedCustomer: { id: customer.id, name },
    }));
    setStep("photos");
  }, []);

  const handleSkipCustomer = useCallback(() => {
    setStep("photos");
  }, []);

  // ---- Handle photo upload to Supabase Storage (server-side compression) ----
  const handlePhotosNext = useCallback(async () => {
    if (photoFiles.length === 0) {
      setStep("voice");
      return;
    }

    setIsUploadingPhotos(true);
    try {
      const formData = new FormData();
      formData.append("business_id", businessId ?? "");
      for (const file of photoFiles) {
        formData.append("photos", file);
      }

      const result: UploadPhotosResult = await uploadQuotePhotos(
        {},
        formData,
      );

      if (result.error) {
        // eslint-disable-next-line no-console
        console.error("Photo upload failed:", result.error);
        return;
      }

      if (result.photos) {
        setUploadedPhotos(result.photos);
        setWizardState((s) => ({
          ...s,
          photoUrls: result.photos!.map((p) => p.publicUrl),
        }));
      }

      setStep("voice");
    } catch {
      // eslint-disable-next-line no-console
      console.error("Failed to upload photos");
    } finally {
      setIsUploadingPhotos(false);
    }
  }, [photoFiles, businessId]);

  // ---- Computed values ----
  const isStepCompleted = (s: WizardStep): boolean => {
    const order: WizardStep[] = [
      "customer",
      "photos",
      "voice",
      "transcript",
      "generating",
      "review",
    ];
    return order.indexOf(s) < order.indexOf(step);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <StepPill
          icon={Users}
          label="Customer"
          active={step === "customer"}
          completed={isStepCompleted("customer")}
        />
        <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        <StepPill
          icon={ImageIcon}
          label="Photos"
          active={step === "photos"}
          completed={isStepCompleted("photos")}
        />
        <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        <StepPill
          icon={Mic}
          label="Voice"
          active={step === "voice"}
          completed={isStepCompleted("voice")}
        />
        <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        <StepPill
          icon={FileText}
          label="Review"
          active={step === "transcript"}
          completed={isStepCompleted("transcript")}
        />
        <div className="h-px flex-1 bg-[hsl(var(--border))]" />
        <StepPill
          icon={Sparkles}
          label="AI Quote"
          active={step === "generating" || step === "review"}
          completed={false}
        />
      </div>

      {/* ---- Customer step ---- */}
      {step === "customer" && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Select a customer</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Search for an existing customer or create a new one.
            </p>
          </div>

          {!showInlineCustomerForm ? (
            <>
              <CustomerSearch
                onSelect={handleSelectCustomer}
                onCreateNew={() => setShowInlineCustomerForm(true)}
                autoFocus
              />

              {wizardState.selectedCustomer && (
                <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-950">
                  <Users className="h-5 w-5 text-brand-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {wizardState.selectedCustomer.name}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Selected customer
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep("photos")}
                disabled={!wizardState.selectedCustomer}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSkipCustomer}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              >
                <SkipForward className="h-4 w-4" />
                Skip — add customer later
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <InlineCustomerForm
                onCreated={(customer) => {
                  handleSelectCustomer(customer);
                  setShowInlineCustomerForm(false);
                }}
                onCancel={() => setShowInlineCustomerForm(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* ---- Photos step ---- */}
      {step === "photos" && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Add job site photos</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Take or upload photos of the job site. AI will analyze them to
              generate more accurate line items.
            </p>
          </div>

          <PhotoCapture onPhotosChange={setPhotoFiles} />

          <button
            type="button"
            onClick={handlePhotosNext}
            disabled={isUploadingPhotos}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {isUploadingPhotos ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {photoFiles.length > 0 ? "Upload & Continue" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStep("voice")}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          >
            <SkipForward className="h-4 w-4" />
            Skip photos
          </button>
        </div>
      )}

      {/* ---- Voice step ---- */}
      {step === "voice" && !wizardState.skipVoice && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Record a voice note</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Describe the job in your own words. Our AI will use your
              description to generate line items.
            </p>
          </div>

          <VoiceRecorder onRecordingComplete={handleRecordingComplete} />

          <button
            type="button"
            onClick={handleSkip}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          >
            <SkipForward className="h-4 w-4" />
            Skip voice note
          </button>
        </div>
      )}

      {/* ---- Transcript step ---- */}
      {step === "transcript" && (
        <div className="space-y-6">
          {wizardState.skipVoice ? (
            <>
              <div className="text-center">
                <h2 className="text-lg font-semibold">Describe the job</h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Type a description of the work to generate line items.
                </p>
              </div>
              <textarea
                value={wizardState.transcript}
                onChange={(e) => handleTranscriptChange(e.target.value)}
                rows={6}
                placeholder="e.g., Replace 3-ton AC condenser unit, install new thermostat, flush refrigerant lines..."
                className="w-full resize-y rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-lg font-semibold">Review transcript</h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Check the transcript below and fix any errors before
                  continuing.
                </p>
              </div>

              {transcribeState.error && (
                <p className="text-sm text-[hsl(var(--destructive))]">
                  {transcribeState.error}
                </p>
              )}

              <TranscriptEditor
                transcript={wizardState.transcript}
                confidence={wizardState.confidence}
                onTranscriptChange={handleTranscriptChange}
                isLoading={isTranscribing}
              />
            </>
          )}

          {/* Generate with AI button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={
              isTranscribing || wizardState.transcript.trim().length === 0
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </>
            )}
          </button>

          {/* Back to voice */}
          {!wizardState.skipVoice && (
            <button
              type="button"
              onClick={() => {
                setStep("voice");
                setWizardState((s) => ({
                  ...s,
                  audioBlob: null,
                  audioDuration: 0,
                  transcript: "",
                  confidence: 0,
                }));
              }}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              <Mic className="h-4 w-4" />
              Record again
            </button>
          )}
        </div>
      )}

      {/* ---- Generating step ---- */}
      {step === "generating" && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Generating your quote</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              AI is analyzing your{" "}
              {wizardState.photoUrls.length > 0 ? "photos and " : ""}
              description to create line items...
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-brand-600" />
              <Sparkles className="h-6 w-6 text-brand-600" />
            </div>
            <ProgressIndicator isGenerating={isGenerating} />
          </div>

          {generateState.error && (
            <div className="space-y-3">
              <p className="text-center text-sm text-[hsl(var(--destructive))]">
                {generateState.error}
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => setStep("transcript")}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to description
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- Review step ---- */}
      {step === "review" && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Review AI suggestions</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Edit, remove, or adjust any line items before saving.
            </p>
          </div>

          {/* Overall confidence */}
          <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3">
            <div>
              <p className="text-sm font-medium">{wizardState.generatedTitle}</p>
              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                {wizardState.lineItems.length} line item
                {wizardState.lineItems.length !== 1 ? "s" : ""} generated
              </p>
            </div>
            <ConfidenceBadge confidence={wizardState.overallConfidence} />
          </div>

          {/* Scope of work */}
          {wizardState.scopeOfWork && (
            <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
              <p className="mb-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                Scope of Work
              </p>
              <p className="text-sm">{wizardState.scopeOfWork}</p>
            </div>
          )}

          {/* Line items */}
          <div className="space-y-3">
            {wizardState.lineItems.map((item, index) => (
              <LineItemCard
                key={`${item.title}-${index}`}
                item={item}
                index={index}
                onChange={handleLineItemChange}
                onRemove={handleRemoveLineItem}
              />
            ))}
          </div>

          {/* Total */}
          {wizardState.lineItems.length > 0 && (
            <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-3">
              <span className="text-sm font-semibold">Estimated Total</span>
              <span className="text-lg font-bold tabular-nums">
                {formatCents(
                  wizardState.lineItems.reduce(
                    (sum, li) => sum + li.unitPriceCents * li.quantity,
                    0,
                  ),
                )}
              </span>
            </div>
          )}

          {/* Actions */}
          <button
            type="button"
            disabled={wizardState.lineItems.length === 0 || isSaving}
            onClick={handleSaveQuote}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {isOnline() ? "Save Quote" : "Save Offline"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => setStep("transcript")}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <ArrowLeft className="h-4 w-4" />
              Edit description
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StepPill({
  icon: Icon,
  label,
  active,
  completed,
}: {
  icon: typeof Mic;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  const base =
    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors";
  const style = active
    ? "bg-brand-600 text-white"
    : completed
      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]";

  return (
    <span className={`${base} ${style}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let className: string;

  if (confidence >= 0.85) {
    className =
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  } else if (confidence >= 0.6) {
    className =
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  } else {
    className =
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {pct}% confidence
    </span>
  );
}

function ProgressIndicator({ isGenerating }: { isGenerating: boolean }) {
  if (!isGenerating) return null;

  return (
    <div className="space-y-1 text-center">
      <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
        Analyzing photos and description...
      </p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        This typically takes 10-15 seconds
      </p>
    </div>
  );
}

function LineItemCard({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: GeneratedLineItem;
  index: number;
  onChange: (index: number, updates: Partial<GeneratedLineItem>) => void;
  onRemove: (index: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const lineTotal = item.unitPriceCents * item.quantity;
  const typeLabel = item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1);

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={item.title}
              onChange={(e) => onChange(index, { title: e.target.value })}
              className="w-full rounded border border-[hsl(var(--border))] bg-transparent px-2 py-1 text-sm font-medium outline-none focus:border-[hsl(var(--ring))]"
            />
          ) : (
            <p className="text-sm font-medium">{item.title}</p>
          )}
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            {item.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ConfidenceBadge confidence={item.confidence} />
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex h-7 w-7 items-center justify-center rounded text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            aria-label={isEditing ? "Done editing" : "Edit line item"}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="flex h-7 w-7 items-center justify-center rounded text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--destructive))]"
            aria-label="Remove line item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Pricing row */}
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 font-medium">
          {typeLabel}
        </span>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={item.quantity}
              min={0}
              step={0.5}
              onChange={(e) =>
                onChange(index, { quantity: parseFloat(e.target.value) || 0 })
              }
              className="w-16 rounded border border-[hsl(var(--border))] bg-transparent px-1.5 py-0.5 text-xs outline-none focus:border-[hsl(var(--ring))]"
            />
            <span className="text-[hsl(var(--muted-foreground))]">
              {item.unit} @
            </span>
            <input
              type="text"
              value={formatCents(item.unitPriceCents)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const cents = Math.round(parseFloat(val) * 100) || 0;
                onChange(index, { unitPriceCents: cents });
              }}
              className="w-20 rounded border border-[hsl(var(--border))] bg-transparent px-1.5 py-0.5 text-xs outline-none focus:border-[hsl(var(--ring))]"
            />
          </div>
        ) : (
          <span className="text-[hsl(var(--muted-foreground))]">
            {item.quantity} {item.unit} @ {formatCents(item.unitPriceCents)}
          </span>
        )}
        <span className="ml-auto font-medium tabular-nums">
          {formatCents(lineTotal)}
        </span>
      </div>

      {/* Reasoning (collapsed) */}
      {item.reasoning && (
        <p className="mt-1.5 text-xs italic text-[hsl(var(--muted-foreground))]">
          {item.reasoning}
        </p>
      )}
    </div>
  );
}

function InlineCustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (customer: CustomerResult) => void;
  onCancel: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("first_name") as string)?.trim() || null;
    const lastName = (formData.get("last_name") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;

    if (!firstName && !lastName && !email && !phone) {
      setError("At least a name, email, or phone is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { createCustomer } = await import("@/lib/actions/customers");
      const result = await createCustomer({}, formData);

      if (result.error) {
        setError(result.error);
      } else if (result.customerId) {
        onCreated({
          id: result.customerId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          company_name: (formData.get("company_name") as string)?.trim() || null,
        });
      }
    } catch {
      setError("Failed to create customer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold">New Customer</p>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="first_name"
          placeholder="First name"
          className="h-10 rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
        />
        <input
          name="last_name"
          placeholder="Last name"
          className="h-10 rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
        />
      </div>
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
      />
      <input
        name="phone"
        type="tel"
        placeholder="Phone"
        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
      />
      <input
        name="company_name"
        placeholder="Company (optional)"
        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
      />

      {error && (
        <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Create & Select"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 items-center justify-center rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Helpers
// ============================================================================

