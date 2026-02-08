-- Add voice recording / transcription columns to quotes
ALTER TABLE quotes
  ADD COLUMN voice_transcript text,
  ADD COLUMN voice_audio_url  text,
  ADD COLUMN voice_confidence  numeric(3,2);

-- Confidence must be between 0 and 1 (or NULL)
ALTER TABLE quotes
  ADD CONSTRAINT quotes_voice_confidence_range
    CHECK (voice_confidence IS NULL OR (voice_confidence >= 0 AND voice_confidence <= 1));
