"use server";

import { createClient } from "@/lib/supabase/server";
import { sendQuoteEmail, sendAcceptanceNotification } from "@/lib/email/send-quote";
import { sendQuoteSMS } from "@/lib/sms/send-quote";
import { checkEmailRateLimit } from "@/lib/rate-limit";

// ============================================================================
// Types
// ============================================================================

export type DeliveryMethod = "email" | "sms" | "both";

export type SendQuoteState = {
  error?: string;
  success?: boolean;
  publicUrl?: string;
};

export type AcceptQuoteState = {
  error?: string;
  success?: boolean;
};

export type DeclineQuoteState = {
  error?: string;
  success?: boolean;
};

// ============================================================================
// Send Quote
// ============================================================================

export async function sendQuote(
  _prevState: SendQuoteState,
  formData: FormData,
): Promise<SendQuoteState> {
  try {
    const quoteId = formData.get("quote_id") as string;
    const deliveryMethod = (formData.get("delivery_method") as DeliveryMethod) ?? "email";

    if (!quoteId) {
      return { error: "Quote ID is required." };
    }

    const supabase = await createClient();

    // Fetch quote with customer and business data
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { error: "Quote not found." };
    }

    if (quote.status !== "draft") {
      return { error: `Quote has already been ${quote.status}.` };
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order");

    // Fetch customer
    let customer = null;
    if (quote.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", quote.customer_id)
        .single();
      customer = data;
    }

    if (!customer) {
      return { error: "No customer associated with this quote." };
    }

    // Fetch business
    const { data: business } = await supabase
      .from("businesses")
      .select("name, logo_url, primary_color, email, phone")
      .eq("id", quote.business_id)
      .single();

    if (!business) {
      return { error: "Business not found." };
    }

    // Rate limit check for email delivery
    if (deliveryMethod === "email" || deliveryMethod === "both") {
      const emailLimit = checkEmailRateLimit(quote.business_id);
      if (!emailLimit.allowed) {
        return { error: "Daily email limit reached (100/day). Please try again tomorrow." };
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const publicUrl = `${appUrl}/public/quotes/${quoteId}`;

    const errors: string[] = [];

    // Send via email
    if (deliveryMethod === "email" || deliveryMethod === "both") {
      if (!customer.email) {
        errors.push("Customer has no email address");
      } else {
        const emailResult = await sendQuoteEmail({
          quote,
          lineItems: lineItems ?? [],
          customer,
          business,
          publicUrl,
        });
        if (!emailResult.success) {
          errors.push(`Email: ${emailResult.error}`);
        }
      }
    }

    // Send via SMS
    if (deliveryMethod === "sms" || deliveryMethod === "both") {
      if (!customer.phone) {
        errors.push("Customer has no phone number");
      } else {
        const smsResult = await sendQuoteSMS({
          to: customer.phone,
          businessName: business.name,
          quoteNumber: quote.quote_number,
          totalCents: quote.total_cents,
          publicUrl,
        });
        if (!smsResult.success) {
          errors.push(`SMS: ${smsResult.error}`);
        }
      }
    }

    // If all delivery methods failed, return error
    if (
      errors.length > 0 &&
      ((deliveryMethod === "email" && errors.length >= 1) ||
        (deliveryMethod === "sms" && errors.length >= 1) ||
        (deliveryMethod === "both" && errors.length >= 2))
    ) {
      return { error: errors.join(". ") };
    }

    // Update quote status
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateError) {
      return { error: "Quote was delivered but status update failed." };
    }

    return { success: true, publicUrl };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Send quote error:", err);
    return { error: "An unexpected error occurred while sending the quote." };
  }
}

// ============================================================================
// Accept Quote (public — no auth required)
// ============================================================================

export async function acceptQuote(
  _prevState: AcceptQuoteState,
  formData: FormData,
): Promise<AcceptQuoteState> {
  try {
    const quoteId = formData.get("quote_id") as string;

    if (!quoteId) {
      return { error: "Quote ID is required." };
    }

    const supabase = await createClient();

    // Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { error: "Quote not found." };
    }

    if (quote.status === "accepted") {
      return { error: "This quote has already been accepted." };
    }

    if (quote.status === "declined") {
      return { error: "This quote has been declined." };
    }

    if (quote.status === "expired") {
      return { error: "This quote has expired." };
    }

    // Check expiry
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("id", quoteId);
      return { error: "This quote has expired." };
    }

    // Update status (and mark as viewed if not already, in a single atomic update)
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "accepted",
        accepted_at: now,
        ...(!quote.viewed_at ? { viewed_at: now } : {}),
      })
      .eq("id", quoteId);

    if (updateError) {
      return { error: "Failed to accept quote. Please try again." };
    }

    // Send notification to business owner
    const { data: business } = await supabase
      .from("businesses")
      .select("name, email")
      .eq("id", quote.business_id)
      .single();

    if (business?.email) {
      let customerName = "A customer";
      if (quote.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("first_name, last_name")
          .eq("id", quote.customer_id)
          .single();
        if (customer) {
          customerName =
            [customer.first_name, customer.last_name]
              .filter(Boolean)
              .join(" ") || "A customer";
        }
      }

      await sendAcceptanceNotification({
        quote,
        customerName,
        businessEmail: business.email,
        businessName: business.name,
      });
    }

    return { success: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Accept quote error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Decline Quote (public — no auth required)
// ============================================================================

export async function declineQuote(
  _prevState: DeclineQuoteState,
  formData: FormData,
): Promise<DeclineQuoteState> {
  try {
    const quoteId = formData.get("quote_id") as string;

    if (!quoteId) {
      return { error: "Quote ID is required." };
    }

    const supabase = await createClient();

    // Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, status")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return { error: "Quote not found." };
    }

    if (quote.status === "accepted") {
      return { error: "This quote has already been accepted." };
    }

    if (quote.status === "declined") {
      return { error: "This quote has already been declined." };
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateError) {
      return { error: "Failed to decline quote. Please try again." };
    }

    return { success: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Decline quote error:", err);
    return { error: "An unexpected error occurred." };
  }
}
