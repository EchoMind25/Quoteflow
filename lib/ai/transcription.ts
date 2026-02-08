import { AssemblyAI } from "assemblyai";

// ============================================================================
// Types
// ============================================================================

export type TranscriptionResult = {
  transcript: string;
  confidence: number;
  words: { text: string; start: number; end: number; confidence: number }[];
  duration_seconds: number;
};

export type TranscriptionErrorCode =
  | "UPLOAD_FAILED"
  | "TRANSCRIPTION_FAILED"
  | "TIMEOUT"
  | "INVALID_AUDIO";

export class TranscriptionError extends Error {
  code: TranscriptionErrorCode;

  constructor(code: TranscriptionErrorCode, message: string) {
    super(message);
    this.name = "TranscriptionError";
    this.code = code;
  }
}

// ============================================================================
// Client singleton
// ============================================================================

let client: AssemblyAI | null = null;

function getClient(): AssemblyAI {
  if (!client) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new TranscriptionError(
        "TRANSCRIPTION_FAILED",
        "ASSEMBLYAI_API_KEY is not configured",
      );
    }
    client = new AssemblyAI({ apiKey });
  }
  return client;
}

// ============================================================================
// Main transcription function
// ============================================================================

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new TranscriptionError("INVALID_AUDIO", "Audio buffer is empty");
  }

  const validMimes = [
    "audio/webm",
    "audio/mp4",
    "audio/m4a",
    "audio/ogg",
    "audio/mpeg",
    "audio/wav",
  ];
  if (!validMimes.some((m) => mimeType.startsWith(m))) {
    throw new TranscriptionError(
      "INVALID_AUDIO",
      `Unsupported audio format: ${mimeType}`,
    );
  }

  const aai = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const transcript = await aai.transcripts.transcribe({
        audio: audioBuffer,
      });

      if (transcript.status === "error") {
        throw new TranscriptionError(
          "TRANSCRIPTION_FAILED",
          transcript.error ?? "Transcription failed",
        );
      }

      return {
        transcript: transcript.text ?? "",
        confidence: transcript.confidence ?? 0,
        words: (transcript.words ?? []).map((w) => ({
          text: w.text,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        })),
        duration_seconds: Math.round(
          (transcript.audio_duration ?? 0),
        ),
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on validation errors
      if (err instanceof TranscriptionError && err.code === "INVALID_AUDIO") {
        throw err;
      }

      // Wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, BACKOFF_MS[attempt]),
        );
      }
    }
  }

  throw new TranscriptionError(
    "TRANSCRIPTION_FAILED",
    `Transcription failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
  );
}
