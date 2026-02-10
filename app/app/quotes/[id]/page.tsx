import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QuoteDetailView } from "@/components/quotes/quote-detail-view";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("title, quote_number")
    .eq("id", id)
    .single();

  return {
    title: quote
      ? `Quote #${quote.quote_number}`
      : "Quote Not Found",
  };
}

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, business_id, customer_id, created_by, quote_number, title, description, status, subtotal_cents, tax_rate, tax_cents, discount_cents, total_cents, notes, customer_notes, expires_at, sent_at, viewed_at, accepted_at, declined_at, voice_transcript, voice_audio_url, voice_confidence, parent_quote_id, revision_number, revision_notes, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (!quote) {
    notFound();
  }

  const { data: lineItems } = await supabase
    .from("quote_line_items")
    .select(
      "id, quote_id, title, description, quantity, unit, unit_price_cents, line_total_cents, item_type, sort_order, ai_confidence, ai_reasoning, created_at, updated_at",
    )
    .eq("quote_id", id)
    .order("sort_order");

  let customer = null;
  if (quote.customer_id) {
    const { data } = await supabase
      .from("customers")
      .select(
        "id, business_id, first_name, last_name, email, phone, company_name, address_line1, address_line2, city, state, zip_code, notes, created_at, updated_at",
      )
      .eq("id", quote.customer_id)
      .single();
    customer = data;
  }

  // Fetch quote photos
  const { data: photos } = await supabase
    .from("quote_photos")
    .select("id, storage_path, sort_order")
    .eq("quote_id", id)
    .order("sort_order");

  // Resolve storage paths to public URLs
  const photoUrls = (photos ?? []).map((photo) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from("quote-photos").getPublicUrl(photo.storage_path);
    return publicUrl;
  });

  return (
    <QuoteDetailView
      quote={quote}
      lineItems={lineItems ?? []}
      customer={customer}
      photoUrls={photoUrls}
    />
  );
}
