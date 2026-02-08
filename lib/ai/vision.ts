import Anthropic from "@anthropic-ai/sdk";
import type { IndustryType } from "@/types/database";
import {
  quoteAnalysisSchema,
  applyFallbackPricing,
  getSystemPrompt,
  getFewShotExample,
  type QuoteAnalysisResult,
} from "@/lib/ai/prompts/quote-analysis";

// ============================================================================
// Types
// ============================================================================

export type VisionAnalysisInput = {
  photoUrls: string[];
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
