import twilio from "twilio";
import { formatCents } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type SendQuoteSMSInput = {
  to: string;
  businessName: string;
  quoteNumber: string;
  totalCents: number;
  publicUrl: string;
};

export type SendQuoteSMSResult = {
  success: boolean;
  messageSid?: string;
  error?: string;
};

// ============================================================================
// Client singleton
// ============================================================================

let twilioClient: twilio.Twilio | null = null;

function getTwilio(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured",
      );
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

// ============================================================================
// Send quote SMS (<160 chars)
// ============================================================================

export async function sendQuoteSMS(
  input: SendQuoteSMSInput,
): Promise<SendQuoteSMSResult> {
  const { to, businessName, quoteNumber, totalCents, publicUrl } = input;

  if (!to) {
    return { success: false, error: "No phone number provided" };
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return { success: false, error: "TWILIO_PHONE_NUMBER not configured" };
  }

  // Keep under 160 characters
  const total = formatCents(totalCents);
  const body = `${businessName}: Quote #${quoteNumber} for ${total} is ready. View & accept: ${publicUrl}`;

  // Truncate business name if message too long
  const finalBody =
    body.length <= 160
      ? body
      : `Quote #${quoteNumber} for ${total} is ready. View & accept: ${publicUrl}`;

  try {
    const client = getTwilio();
    const message = await client.messages.create({
      body: finalBody,
      from: fromNumber,
      to,
    });

    return { success: true, messageSid: message.sid };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "SMS send failed",
    };
  }
}
