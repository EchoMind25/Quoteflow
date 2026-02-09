import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ============================================================================
// SMTP transport singleton
// ============================================================================

let transport: Transporter | null = null;

export function getTransport(): Transporter {
  if (!transport) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP_HOST, SMTP_USER, and SMTP_PASS must all be configured",
      );
    }

    transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transport;
}
