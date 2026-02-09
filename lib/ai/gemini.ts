import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { IndustryType } from "@/types/database";

// ============================================================================
// Zod schemas
// ============================================================================

const equipmentItemSchema = z.object({
  name: z.string(),
  brand: z.string().nullish().transform((v) => v ?? undefined),
  model: z.string().nullish().transform((v) => v ?? undefined),
  age: z.string().nullish().transform((v) => v ?? undefined),
  condition: z.enum(["good", "fair", "poor", "failed", "unknown"]),
  details: z.string(),
});

const conditionNoteSchema = z.object({
  area: z.string(),
  issue: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

const measurementSchema = z.object({
  item: z.string(),
  value: z.string(),
  unit: z.string(),
  confidence: z.number().min(0).max(1),
});

const imageAnalysisResultSchema = z.object({
  equipment: z.array(equipmentItemSchema).default([]),
  conditions: z.array(conditionNoteSchema).default([]),
  measurements: z.array(measurementSchema).default([]),
  recommendations: z.array(z.string()).default([]),
  overallAssessment: z.string().default("No assessment available"),
});

// ============================================================================
// Types (inferred from Zod schemas)
// ============================================================================

export type ImageAnalysisResult = z.infer<typeof imageAnalysisResultSchema>;
type EquipmentItem = z.infer<typeof equipmentItemSchema>;

export class GeminiAnalysisError extends Error {
  code: "API_ERROR" | "PARSE_ERROR" | "VALIDATION_ERROR" | "CONFIG_ERROR";

  constructor(code: GeminiAnalysisError["code"], message: string) {
    super(message);
    this.name = "GeminiAnalysisError";
    this.code = code;
  }
}

// ============================================================================
// Client singleton
// ============================================================================

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new GeminiAnalysisError(
        "CONFIG_ERROR",
        "GOOGLE_AI_API_KEY is not configured",
      );
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ============================================================================
// Industry-specific image analysis prompts
// ============================================================================

const IMAGE_ANALYSIS_PROMPTS: Record<IndustryType, string> = {
  hvac: `Analyze these HVAC job site photos in detail. For each piece of equipment visible:
- Identify brand, model number (from data plates), tonnage/capacity, SEER rating, age
- Assess condition: corrosion, refrigerant leaks (oil stains), bent fins, dirty coils
- Note ductwork material, condition, insulation quality, any disconnections or tears
- Identify thermostat brand/model and wiring type
- Note any safety concerns (e.g., gas leaks, electrical issues, blocked access)`,

  plumbing: `Analyze these plumbing job site photos in detail. For each fixture/component visible:
- Identify water heater type, brand, capacity, fuel source, age
- Identify pipe materials (copper, PEX, CPVC, galvanized, cast iron) and condition
- Note any corrosion, mineral buildup, water stains, or active leaks
- Identify fixture brands and models where visible
- Flag code violations (S-traps, missing cleanouts, improper venting)
- Note any water damage evidence on surrounding structures`,

  electrical: `Analyze these electrical job site photos in detail. For each component visible:
- Identify panel brand, amperage, number of spaces, bus material
- FLAG any Federal Pacific Stab-Lok or Zinsco panels as SAFETY HAZARDS
- Identify wiring types and gauge where visible
- Note breaker types (standard, GFCI, AFCI) and any double-tapped breakers
- Identify signs of overheating (scorching, melted plastic, discoloration)
- Note missing GFCI/AFCI protection where required
- Identify any aluminum branch wiring or cloth insulation`,

  roofing: `Analyze these roofing job site photos in detail. For each area visible:
- Identify roofing material type and approximate age
- Note missing, cracked, curling, or damaged shingles
- Assess granule loss, moss/algae growth
- Check flashing condition at chimneys, vents, valleys, walls
- Note gutter condition, size, and material
- Identify ventilation types (ridge, box, soffit)
- Estimate visible damage area and roof pitch if possible
- Note any sagging that might indicate decking issues`,

  landscaping: `Analyze these landscaping job site photos in detail. For each area visible:
- Identify grass type and lawn condition (bare spots, weeds, thatch)
- Identify tree species, approximate height, health, and proximity to structures
- Note hardscape materials and condition (pavers, concrete, stone, timber)
- Identify irrigation components if visible
- Note drainage issues (standing water, erosion, grading problems)
- Identify retaining wall type, height, and condition
- Estimate approximate areas for lawn, beds, and hardscape`,

  general: `Analyze these job site photos in detail. For each item visible:
- Identify all equipment, fixtures, and materials with brands/models where visible
- Assess the condition of each item (good, fair, poor, failed)
- Note any damage, wear, or safety concerns
- Identify any code violations or hazards
- Provide measurements or size estimates where possible
- Note surrounding conditions that may affect the work scope`,
};

// ============================================================================
// Main analysis function
// ============================================================================

/**
 * Analyze job site photos using Gemini Flash for detailed visual extraction.
 * Returns structured analysis that can be passed to Claude for quote generation.
 */
export async function analyzePhotosWithGemini(
  photoUrls: string[],
  industry: IndustryType,
): Promise<ImageAnalysisResult> {
  if (photoUrls.length === 0) {
    throw new GeminiAnalysisError(
      "API_ERROR",
      "At least one photo URL is required for Gemini analysis",
    );
  }

  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Build image parts by fetching photo data
  const imageParts = await Promise.all(
    photoUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new GeminiAnalysisError(
          "API_ERROR",
          `Failed to fetch photo: ${url} (${response.status})`,
        );
      }
      const buffer = await response.arrayBuffer();
      const mimeType =
        response.headers.get("content-type") ?? "image/jpeg";
      return {
        inlineData: {
          data: Buffer.from(buffer).toString("base64"),
          mimeType,
        },
      };
    }),
  );

  const prompt = `${IMAGE_ANALYSIS_PROMPTS[industry]}

Analyze the ${photoUrls.length} photo(s) provided and return a JSON object with this exact structure:
{
  "equipment": [
    {
      "name": "string - equipment/item name",
      "brand": "string or null - brand if identifiable",
      "model": "string or null - model if visible",
      "age": "string or null - estimated age",
      "condition": "good | fair | poor | failed | unknown",
      "details": "string - detailed description of what you see"
    }
  ],
  "conditions": [
    {
      "area": "string - area or component",
      "issue": "string - description of the issue",
      "severity": "low | medium | high | critical"
    }
  ],
  "measurements": [
    {
      "item": "string - what was measured",
      "value": "string - the measurement value",
      "unit": "string - unit of measure",
      "confidence": 0.0-1.0
    }
  ],
  "recommendations": ["string - recommended actions based on what you see"],
  "overallAssessment": "string - 2-3 sentence summary of the job site"
}

Be thorough and specific. If you can identify brands, models, or sizes, include them.
If you cannot determine something with certainty, note that in the details.
Respond with ONLY the JSON object. No markdown, no code fences, no extra text.`;

  try {
    const result = await model.generateContent([...imageParts, prompt]);
    const response = result.response;
    const text = response.text();

    return parseGeminiResponse(text);
  } catch (err) {
    if (err instanceof GeminiAnalysisError) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Unknown Gemini API error";
    throw new GeminiAnalysisError("API_ERROR", `Gemini analysis failed: ${message}`);
  }
}

// ============================================================================
// Response parsing with Zod validation
// ============================================================================

function parseGeminiResponse(text: string): ImageAnalysisResult {
  // Strip markdown fences if present
  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new GeminiAnalysisError(
      "PARSE_ERROR",
      `Failed to parse Gemini response as JSON: ${jsonText.slice(0, 200)}...`,
    );
  }

  // Validate with Zod schema
  const result = imageAnalysisResultSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new GeminiAnalysisError(
      "VALIDATION_ERROR",
      `Gemini response failed schema validation: ${issues}`,
    );
  }

  return result.data;
}

/**
 * Format Gemini's analysis result as a text summary for Claude.
 * This converts the structured analysis into a readable format
 * that Claude can use as context for quote generation.
 */
export function formatAnalysisForClaude(
  analysis: ImageAnalysisResult,
): string {
  const sections: string[] = [];

  // Overall assessment
  sections.push(`## Site Assessment\n${analysis.overallAssessment}`);

  // Equipment found
  if (analysis.equipment.length > 0) {
    const items = analysis.equipment.map((eq: EquipmentItem) => {
      const parts = [`- **${eq.name}**`];
      if (eq.brand) parts.push(`Brand: ${eq.brand}`);
      if (eq.model) parts.push(`Model: ${eq.model}`);
      if (eq.age) parts.push(`Age: ${eq.age}`);
      parts.push(`Condition: ${eq.condition}`);
      parts.push(`Details: ${eq.details}`);
      return parts.join(" | ");
    });
    sections.push(`## Equipment Identified\n${items.join("\n")}`);
  }

  // Condition issues
  if (analysis.conditions.length > 0) {
    const items = analysis.conditions.map(
      (c) => `- **${c.area}** [${c.severity.toUpperCase()}]: ${c.issue}`,
    );
    sections.push(`## Condition Issues\n${items.join("\n")}`);
  }

  // Measurements
  if (analysis.measurements.length > 0) {
    const items = analysis.measurements.map(
      (m) =>
        `- ${m.item}: ${m.value} ${m.unit} (confidence: ${Math.round(m.confidence * 100)}%)`,
    );
    sections.push(`## Measurements\n${items.join("\n")}`);
  }

  // Recommendations
  if (analysis.recommendations.length > 0) {
    const items = analysis.recommendations.map((r) => `- ${r}`);
    sections.push(`## Recommendations\n${items.join("\n")}`);
  }

  return sections.join("\n\n");
}
