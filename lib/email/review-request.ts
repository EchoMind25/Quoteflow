import { getTransport } from "@/lib/email/smtp";

// ============================================================================
// Types
// ============================================================================

type ReviewRequestInput = {
  to: string;
  customerName: string;
  businessName: string;
  jobTitle: string;
  reviewUrl: string;
};

// ============================================================================
// Send review request email
// ============================================================================

export async function sendReviewRequestEmail(
  input: ReviewRequestInput,
): Promise<void> {
  try {
    const transport = getTransport();
    const fromAddress =
      process.env.SMTP_FROM ?? "Quotestream <noreply@quotestream.app>";

    await transport.sendMail({
      from: fromAddress,
      to: input.to,
      subject: `How was your experience with ${input.businessName}?`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #18181b; margin: 0 0 16px;">How did it go?</h2>
          <p style="color: #52525b; margin: 0 0 8px;">
            Hi ${input.customerName},
          </p>
          <p style="color: #52525b; margin: 0 0 8px;">
            Your job <strong>&ldquo;${input.jobTitle}&rdquo;</strong> with
            <strong>${input.businessName}</strong> has been completed.
          </p>
          <p style="color: #52525b; margin: 0 0 24px;">
            We&rsquo;d love to hear about your experience. Your feedback helps other customers
            and helps ${input.businessName} improve.
          </p>
          <a href="${input.reviewUrl}"
             style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Leave a Review
          </a>
          <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">
            Powered by Quotestream
          </p>
        </div>
      `,
    });
  } catch {
    // Non-fatal — log only
    console.error("Failed to send review request email");
  }
}
