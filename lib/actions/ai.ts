"use server";

import { createClient } from "@/lib/supabase/server";
import { transcribeAudio, TranscriptionError } from "@/lib/ai/transcription";
import {
  analyzePhotosAndTranscript,
  VisionAnalysisError,
} from "@/lib/ai/vision";
import { checkAIRateLimit } from "@/lib/rate-limit";
import type { IndustryType } from "@/types/database";

// ============================================================================
// Transcription types & action
// ============================================================================

export type TranscribeState = {
  error?: string;
  transcript?: string;
  confidence?: number;
  audioUrl?: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = [
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
];

export async function transcribeVoiceNote(
  _prevState: TranscribeState,
  formData: FormData,
): Promise<TranscribeState> {
  try {
    // 1. Extract inputs
    const audio = formData.get("audio") as File | null;
    const quoteId = formData.get("quote_id") as string | null;

    // 2. Validate
    if (!audio || !(audio instanceof File) || audio.size === 0) {
      return { error: "No audio file provided." };
    }

    if (audio.size > MAX_FILE_SIZE) {
      return { error: "Audio file exceeds 10 MB limit." };
    }

    if (!ALLOWED_MIMES.some((m) => audio.type.startsWith(m))) {
      return {
        error: `Unsupported audio format: ${audio.type}. Please use WebM, MP4, M4A, OGG, or WAV.`,
      };
    }

    // 3. Convert to Buffer
    const buffer = Buffer.from(await audio.arrayBuffer());

    // 4. Transcribe
    const result = await transcribeAudio(buffer, audio.type);

    // 5. If quote_id provided, upload audio and update quote
    let audioUrl: string | undefined;

    if (quoteId) {
      const supabase = await createClient();
      const ext = audio.type.includes("webm") ? "webm" : "m4a";
      const storagePath = `quotes/${quoteId}/voice.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("quote-audio")
        .upload(storagePath, buffer, {
          contentType: audio.type,
          upsert: true,
        });

      if (uploadError) {
        // eslint-disable-next-line no-console
        console.error("Audio upload failed:", uploadError.message);
      } else {
        audioUrl = storagePath;

        const { error: updateError } = await supabase
          .from("quotes")
          .update({
            voice_transcript: result.transcript,
            voice_audio_url: storagePath,
            voice_confidence: result.confidence,
          })
          .eq("id", quoteId);

        if (updateError) {
          // eslint-disable-next-line no-console
          console.error("Quote update failed:", updateError.message);
        }
      }
    }

    // 6. Return result
    return {
      transcript: result.transcript,
      confidence: result.confidence,
      audioUrl,
    };
  } catch (err) {
    if (err instanceof TranscriptionError) {
      return { error: err.message };
    }
    // eslint-disable-next-line no-console
    console.error("Transcription error:", err);
    return { error: "An unexpected error occurred during transcription." };
  }
}

// ============================================================================
// Quote generation types & action
// ============================================================================

export type GeneratedLineItem = {
  title: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  itemType: "service" | "material" | "labor" | "other";
  confidence: number;
  reasoning: string;
};

export type GenerateQuoteState = {
  error?: string;
  lineItems?: GeneratedLineItem[];
  title?: string;
  scopeOfWork?: string;
  confidence?: number;
};

export async function generateQuoteFromAI(
  _prevState: GenerateQuoteState,
  formData: FormData,
): Promise<GenerateQuoteState> {
  try {
    // 0. Rate limit check
    const supabaseForAuth = await createClient();
    const {
      data: { user: authUser },
    } = await supabaseForAuth.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabaseForAuth
        .from("profiles")
        .select("business_id")
        .eq("id", authUser.id)
        .single();
      if (profile?.business_id) {
        const limit = checkAIRateLimit(profile.business_id);
        if (!limit.allowed) {
          const waitSec = Math.ceil(limit.resetMs / 1000);
          return {
            error: `Rate limit exceeded. Please wait ${waitSec} seconds before trying again.`,
          };
        }
      }
    }

    // 1. Extract inputs
    const photoUrlsRaw = formData.get("photo_urls") as string | null;
    const transcript = (formData.get("transcript") as string) ?? "";
    const industry = (formData.get("industry") as IndustryType) ?? "general";

    // Parse photo URLs from JSON array
    let photoUrls: string[] = [];
    if (photoUrlsRaw) {
      try {
        const parsed: unknown = JSON.parse(photoUrlsRaw);
        if (Array.isArray(parsed)) {
          photoUrls = parsed.filter(
            (u): u is string => typeof u === "string",
          );
        }
      } catch {
        return { error: "Invalid photo URLs format." };
      }
    }

    // 2. Validate
    if (photoUrls.length === 0 && !transcript.trim()) {
      return {
        error: "Please provide at least one photo or a job description.",
      };
    }

    if (photoUrls.length > 10) {
      return { error: "Maximum 10 photos allowed per analysis." };
    }

    // 3. Resolve photo URLs — convert storage paths to public URLs
    const supabase = await createClient();
    const resolvedUrls = photoUrls.map((url) => {
      // If already a full URL, use as-is
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }
      // Otherwise treat as Supabase Storage path
      const { data } = supabase.storage
        .from("quote-photos")
        .getPublicUrl(url);
      return data.publicUrl;
    });

    // 4. Call Claude Vision
    const result = await analyzePhotosAndTranscript({
      photoUrls: resolvedUrls,
      transcript,
      industry,
    });

    // 5. Return structured result
    return {
      lineItems: result.lineItems,
      title: result.suggestedTitle,
      scopeOfWork: result.scopeOfWork,
      confidence: result.overallConfidence,
    };
  } catch (err) {
    if (err instanceof VisionAnalysisError) {
      return { error: err.message };
    }
    // eslint-disable-next-line no-console
    console.error("Quote generation error:", err);
    return {
      error: "An unexpected error occurred while generating the quote.",
    };
  }
}
