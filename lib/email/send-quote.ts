import { render } from "@react-email/components";
import { formatCents } from "@/lib/utils";
import { QuoteEmail } from "@/emails/quote-email";
import { getTransport } from "@/lib/email/smtp";
import type {
  Quote,
  QuoteLineItem,
  Customer,
  Business,
} from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export type SendQuoteEmailInput = {
  quote: Pick<
    Quote,
    | "quote_number"
    | "title"
    | "subtotal_cents"
    | "tax_cents"
    | "total_cents"
    | "notes"
    | "expires_at"
  >;
  lineItems: Pick<
    QuoteLineItem,
    "title" | "description" | "quantity" | "unit" | "line_total_cents"
  >[];
  customer: Pick<Customer, "first_name" | "last_name" | "email">;
  business: Pick<
    Business,
    "name" | "logo_url" | "primary_color" | "email"
  >;
  publicUrl: string;
};

export type SendQuoteEmailResult = {
  success: boolean;
  emailId?: string;
  error?: string;
};

// ============================================================================
// Send quote email
// ============================================================================

export async function sendQuoteEmail(
  input: SendQuoteEmailInput,
): Promise<SendQuoteEmailResult> {
  const { quote, lineItems, customer, business, publicUrl } = input;

  if (!customer.email) {
    return { success: false, error: "Customer has no email address" };
  }

  const customerName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ") || "there";

  try {
    const transport = getTransport();
    const fromAddress = process.env.SMTP_FROM ?? `${business.name} <noreply@quotestream.app>`;

    const html = await render(
      QuoteEmail({
        businessName: business.name,
        businessLogoUrl: business.logo_url,
        primaryColor: business.primary_color,
        quoteNumber: quote.quote_number,
        quoteTitle: quote.title,
        customerName,
        lineItems: lineItems.map((li) => ({
          title: li.title,
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          line_total_cents: li.line_total_cents,
        })),
        subtotalCents: quote.subtotal_cents,
        taxCents: quote.tax_cents,
        totalCents: quote.total_cents,
        notes: quote.notes,
        expiresAt: quote.expires_at,
        publicUrl,
      }),
    );

    const info = await transport.sendMail({
      from: fromAddress,
      replyTo: business.email ?? undefined,
      to: customer.email,
      subject: `Quote #${quote.quote_number}: ${quote.title}`,
      html,
    });

    return { success: true, emailId: info.messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}

// ============================================================================
// Send acceptance confirmation to business
// ============================================================================

export async function sendAcceptanceNotification(input: {
  quote: Pick<Quote, "id" | "quote_number" | "title" | "total_cents">;
  customerName: string;
  businessEmail: string;
  businessName: string;
}): Promise<void> {
  try {
    const transport = getTransport();
    const fromAddress = process.env.SMTP_FROM ?? "Quotestream <noreply@quotestream.app>";

    await transport.sendMail({
      from: fromAddress,
      to: input.businessEmail,
      subject: `Quote #${input.quote.quote_number} accepted by ${input.customerName}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #16a34a; margin: 0 0 16px;">Quote Accepted!</h2>
          <p style="color: #18181b; margin: 0 0 8px;">
            <strong>${input.customerName}</strong> has accepted quote
            <strong>#${input.quote.quote_number}</strong> — ${input.quote.title}.
          </p>
          <p style="color: #71717a; font-size: 14px; margin: 0 0 24px;">
            Total: <strong>${formatCents(input.quote.total_cents)}</strong>
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/app/quotes/${input.quote.id}"
             style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Quote
          </a>
        </div>
      `,
    });
  } catch {
    // Non-fatal — log only
    // eslint-disable-next-line no-console
    console.error("Failed to send acceptance notification");
  }
}
