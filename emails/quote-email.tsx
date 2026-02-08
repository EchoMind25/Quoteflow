import { formatCents } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type LineItem = {
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  line_total_cents: number;
};

type QuoteEmailProps = {
  businessName: string;
  businessLogoUrl: string | null;
  primaryColor: string;
  quoteNumber: string;
  quoteTitle: string;
  customerName: string;
  lineItems: LineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  expiresAt: string | null;
  publicUrl: string;
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ============================================================================
// Email Template (table-based layout for email clients)
// ============================================================================

export function QuoteEmail({
  businessName,
  businessLogoUrl,
  primaryColor,
  quoteNumber,
  quoteTitle,
  customerName,
  lineItems,
  subtotalCents,
  taxCents,
  totalCents,
  notes,
  expiresAt,
  publicUrl,
}: QuoteEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#f4f4f5",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: "#f4f4f5" }}
        >
          <tr>
            <td align="center" style={{ padding: "40px 16px" }}>
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{ maxWidth: "600px" }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: "12px 12px 0 0",
                      padding: "32px 24px",
                      textAlign: "center" as const,
                    }}
                  >
                    {businessLogoUrl && (
                      <img
                        src={businessLogoUrl}
                        alt={businessName}
                        width={120}
                        height={40}
                        style={{
                          maxWidth: "120px",
                          height: "auto",
                          marginBottom: "12px",
                        }}
                      />
                    )}
                    <h1
                      style={{
                        color: "#ffffff",
                        fontSize: "20px",
                        fontWeight: 700,
                        margin: businessLogoUrl ? "0" : "0",
                        lineHeight: "1.3",
                      }}
                    >
                      {businessName}
                    </h1>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#ffffff",
                      padding: "32px 24px",
                    }}
                  >
                    {/* Greeting */}
                    <p
                      style={{
                        fontSize: "16px",
                        color: "#18181b",
                        margin: "0 0 8px",
                      }}
                    >
                      Hi {customerName},
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#71717a",
                        margin: "0 0 24px",
                        lineHeight: "1.5",
                      }}
                    >
                      Here&apos;s your quote from {businessName}. Review the
                      details below and click the button to view, accept, or
                      decline.
                    </p>

                    {/* Quote info */}
                    <table
                      role="presentation"
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={{
                        backgroundColor: "#f4f4f5",
                        borderRadius: "8px",
                        marginBottom: "24px",
                      }}
                    >
                      <tr>
                        <td style={{ padding: "16px" }}>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#71717a",
                              margin: "0 0 4px",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            Quote #{quoteNumber}
                          </p>
                          <p
                            style={{
                              fontSize: "16px",
                              fontWeight: 600,
                              color: "#18181b",
                              margin: 0,
                            }}
                          >
                            {quoteTitle}
                          </p>
                        </td>
                      </tr>
                    </table>

                    {/* Line items table */}
                    <table
                      role="presentation"
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={{ marginBottom: "16px" }}
                    >
                      {/* Header row */}
                      <tr>
                        <td
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid #e4e4e7",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#71717a",
                            textTransform: "uppercase" as const,
                          }}
                        >
                          Item
                        </td>
                        <td
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid #e4e4e7",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#71717a",
                            textTransform: "uppercase" as const,
                            textAlign: "center" as const,
                            width: "60px",
                          }}
                        >
                          Qty
                        </td>
                        <td
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid #e4e4e7",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#71717a",
                            textTransform: "uppercase" as const,
                            textAlign: "right" as const,
                            width: "90px",
                          }}
                        >
                          Amount
                        </td>
                      </tr>
                      {/* Item rows */}
                      {lineItems.map((item, i) => (
                        <tr key={i}>
                          <td
                            style={{
                              padding: "10px 0",
                              borderBottom: "1px solid #f4f4f5",
                              fontSize: "14px",
                              color: "#18181b",
                            }}
                          >
                            <strong>{item.title}</strong>
                            {item.description && (
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "12px",
                                  color: "#71717a",
                                  marginTop: "2px",
                                }}
                              >
                                {item.description}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "10px 0",
                              borderBottom: "1px solid #f4f4f5",
                              fontSize: "14px",
                              color: "#18181b",
                              textAlign: "center" as const,
                            }}
                          >
                            {item.quantity} {item.unit}
                          </td>
                          <td
                            style={{
                              padding: "10px 0",
                              borderBottom: "1px solid #f4f4f5",
                              fontSize: "14px",
                              color: "#18181b",
                              textAlign: "right" as const,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatCents(item.line_total_cents)}
                          </td>
                        </tr>
                      ))}
                    </table>

                    {/* Totals */}
                    <table
                      role="presentation"
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={{ marginBottom: "24px" }}
                    >
                      <tr>
                        <td
                          style={{
                            padding: "4px 0",
                            fontSize: "14px",
                            color: "#71717a",
                          }}
                        >
                          Subtotal
                        </td>
                        <td
                          style={{
                            padding: "4px 0",
                            fontSize: "14px",
                            color: "#18181b",
                            textAlign: "right" as const,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatCents(subtotalCents)}
                        </td>
                      </tr>
                      {taxCents > 0 && (
                        <tr>
                          <td
                            style={{
                              padding: "4px 0",
                              fontSize: "14px",
                              color: "#71717a",
                            }}
                          >
                            Tax
                          </td>
                          <td
                            style={{
                              padding: "4px 0",
                              fontSize: "14px",
                              color: "#18181b",
                              textAlign: "right" as const,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatCents(taxCents)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td
                          style={{
                            padding: "8px 0 0",
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "#18181b",
                            borderTop: "2px solid #18181b",
                          }}
                        >
                          Total
                        </td>
                        <td
                          style={{
                            padding: "8px 0 0",
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "#18181b",
                            textAlign: "right" as const,
                            borderTop: "2px solid #18181b",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatCents(totalCents)}
                        </td>
                      </tr>
                    </table>

                    {/* Notes */}
                    {notes && (
                      <div
                        style={{
                          backgroundColor: "#f4f4f5",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          marginBottom: "24px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#71717a",
                            margin: "0 0 4px",
                          }}
                        >
                          Notes
                        </p>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#18181b",
                            margin: 0,
                            lineHeight: "1.5",
                          }}
                        >
                          {notes}
                        </p>
                      </div>
                    )}

                    {/* CTA Button */}
                    <table
                      role="presentation"
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tr>
                        <td align="center">
                          <a
                            href={publicUrl}
                            style={{
                              display: "inline-block",
                              backgroundColor: primaryColor,
                              color: "#ffffff",
                              fontSize: "16px",
                              fontWeight: 600,
                              textDecoration: "none",
                              padding: "14px 32px",
                              borderRadius: "8px",
                              lineHeight: "1",
                            }}
                          >
                            View &amp; Accept Quote
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#fafafa",
                      borderRadius: "0 0 12px 12px",
                      padding: "20px 24px",
                      textAlign: "center" as const,
                    }}
                  >
                    {expiresAt && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#71717a",
                          margin: "0 0 8px",
                        }}
                      >
                        This quote is valid until{" "}
                        <strong>{formatDate(expiresAt)}</strong>
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#a1a1aa",
                        margin: 0,
                      }}
                    >
                      Sent by {businessName} via QuoteFlow
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
