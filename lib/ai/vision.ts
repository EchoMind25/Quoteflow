import Anthropic from "@anthropic-ai/sdk";
import type { IndustryType } from "@/types/database";
import {
  quoteAnalysisSchema,
  applyFallbackPricing,
  getSystemPrompt,
  getFewShotExample,
  type QuoteAnalysisResult,
} from "@/lib/ai/prompts/quote-analysis";
import type { ImageAnalysisResult } from "@/lib/ai/gemini";
import { formatAnalysisForClaude } from "@/lib/ai/gemini";

// ============================================================================
// Types
// ============================================================================

export type VisionAnalysisInput = {
  photoUrls: string[];
  transcript: string;
  industry: IndustryType;
};

export type TextAnalysisInput = {
  geminiAnalysis: ImageAnalysisResult;
  transcript: string;
  industry: IndustryType;
};

export type VisionAnalysisResult = QuoteAnalysisResult & {
  overallConfidence: number;
};

export class VisionAnalysisError extends Error {
  code: "API_ERROR" | "PARSE_ERROR" | "VALIDATION_ERROR" | "NO_INPUT";

  constructor(
    code: VisionAnalysisError["code"],
    message: string,
  ) {
    super(message);
    this.name = "VisionAnalysisError";
    this.code = code;
  }
}

// ============================================================================
// Client singleton
// ============================================================================

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new VisionAnalysisError(
        "API_ERROR",
        "ANTHROPIC_API_KEY is not configured",
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ============================================================================
// Retry config
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isRetryable(err: unknown): boolean {
  if (err instanceof VisionAnalysisError) {
    // Don't retry validation errors or missing input — those won't succeed on retry
    return err.code === "API_ERROR" || err.code === "PARSE_ERROR";
  }
  return true;
}

// ============================================================================
// Transcript quality detection
// ============================================================================

const FILLER_WORDS = new Set([
  "um", "uh", "like", "yeah", "ok", "okay", "so", "well", "hmm",
  "ah", "er", "you", "know", "i", "mean", "the", "a", "an", "is",
  "and", "it", "to", "of", "in", "that", "this",
]);

/**
 * Detect if a transcript has meaningful content.
 * Returns false for empty, silence, or filler-only transcripts (< 10 meaningful words).
 */
export function isTranscriptMeaningful(transcript: string): boolean {
  const words = transcript
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));

  return words.length >= 10;
}

// ============================================================================
// Main analysis function
// ============================================================================

export async function analyzePhotosAndTranscript(
  input: VisionAnalysisInput,
): Promise<VisionAnalysisResult> {
  const { photoUrls, transcript, industry } = input;

  if (photoUrls.length === 0 && !transcript.trim()) {
    throw new VisionAnalysisError(
      "NO_INPUT",
      "At least one photo or a transcript is required",
    );
  }

  const anthropic = getClient();

  // Build content blocks
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  // Add photo blocks
  for (const url of photoUrls) {
    contentBlocks.push({
      type: "image",
      source: { type: "url", url },
    });
  }

  // Add few-shot example
  const example = getFewShotExample(industry);
  contentBlocks.push({
    type: "text",
    text: `Here is an example of a correct analysis for reference:\n\n${example}`,
  });

  // Add transcript and instruction
  const transcriptSection = transcript.trim()
    ? `\n\nTechnician voice note transcript:\n"${transcript.trim()}"`
    : "";

  const photoSection =
    photoUrls.length > 0
      ? `\n\nI've attached ${photoUrls.length} job site photo(s) for your analysis.`
      : "\n\nNo photos were provided. Base your estimate on the transcript only.";

  contentBlocks.push({
    type: "text",
    text: `Now analyze this new job and produce your JSON estimate.${photoSection}${transcriptSection}\n\nRespond with ONLY the JSON object. No markdown formatting, no code fences, no extra text.`,
  });

  // Retry loop with exponential backoff (1s, 2s, 4s)
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await callClaudeAndParse(
        anthropic,
        contentBlocks,
        industry,
      );
      return result;
    } catch (err) {
      lastError = err;

      // Don't retry non-transient errors
      if (!isRetryable(err)) {
        throw err;
      }

      // Backoff before next attempt (skip delay on last attempt)
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new VisionAnalysisError("API_ERROR", "AI analysis failed after retries");
}

// ============================================================================
// Text-based quote generation (Gemini analysis → Claude)
// ============================================================================

/**
 * Generate a structured quote from Gemini's text-based photo analysis + transcript.
 * This avoids sending images to Claude, reducing cost while maintaining quote quality.
 * Uses the same Claude model, prompts, validation, and fallback pricing as the
 * direct vision path.
 */
export async function generateQuoteFromTextAnalysis(
  input: TextAnalysisInput,
): Promise<VisionAnalysisResult> {
  const { geminiAnalysis, transcript, industry } = input;

  const anthropic = getClient();

  // Format Gemini's structured analysis as readable text for Claude
  const analysisText = formatAnalysisForClaude(geminiAnalysis);

  // Build content blocks (text only — no image blocks)
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  // Add few-shot example
  const example = getFewShotExample(industry);
  contentBlocks.push({
    type: "text",
    text: `Here is an example of a correct analysis for reference:\n\n${example}`,
  });

  // Build the analysis context
  const transcriptSection = transcript.trim()
    ? `\n\nTechnician voice note transcript:\n"${transcript.trim()}"`
    : "";

  contentBlocks.push({
    type: "text",
    text: `Now analyze this new job and produce your JSON estimate.

## Photo Analysis (from image AI)
${analysisText}${transcriptSection}

Based on the photo analysis above and the technician's notes, generate a detailed quote with accurate line items and pricing.
Respond with ONLY the JSON object. No markdown formatting, no code fences, no extra text.`,
  });

  // Retry loop with exponential backoff (same as vision path)
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await callClaudeAndParse(
        anthropic,
        contentBlocks,
        industry,
      );
      return result;
    } catch (err) {
      lastError = err;

      if (!isRetryable(err)) {
        throw err;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new VisionAnalysisError(
    "API_ERROR",
    "AI quote generation failed after retries",
  );
}

// ============================================================================
// Claude call + parse (extracted for retry loop)
// ============================================================================

async function callClaudeAndParse(
  anthropic: Anthropic,
  contentBlocks: Anthropic.Messages.ContentBlockParam[],
  industry: VisionAnalysisInput["industry"],
): Promise<VisionAnalysisResult> {
  // Call Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: getSystemPrompt(industry),
    messages: [{ role: "user", content: contentBlocks }],
  });

  // Extract text from response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new VisionAnalysisError(
      "PARSE_ERROR",
      "No text response from Claude",
    );
  }

  // Parse JSON — strip any accidental markdown fences
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new VisionAnalysisError(
      "PARSE_ERROR",
      `Failed to parse AI response as JSON: ${jsonText.slice(0, 200)}...`,
    );
  }

  // Validate with Zod
  const validation = quoteAnalysisSchema.safeParse(parsed);
  if (!validation.success) {
    throw new VisionAnalysisError(
      "VALIDATION_ERROR",
      `AI response failed validation: ${validation.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  let result = validation.data;

  // Apply fallback pricing for low-confidence labor items
  result = {
    ...result,
    lineItems: applyFallbackPricing(result.lineItems, industry),
  };

  // Calculate overall confidence
  const overallConfidence =
    result.lineItems.length > 0
      ? result.lineItems.reduce((sum, item) => sum + item.confidence, 0) /
        result.lineItems.length
      : 0;

  return {
    ...result,
    overallConfidence,
  };
}
