"use server";

import { createClient } from "@/lib/supabase/server";
import type { CustomerInsert } from "@/types/database";
import { logActivity } from "@/lib/audit/log";

// ============================================================================
// Types
// ============================================================================

export type CustomerInput = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  notes?: string | null;
};

export type CustomerSearchResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
};

export type CustomerStats = {
  total_quotes: number;
  draft_quotes: number;
  sent_quotes: number;
  accepted_quotes: number;
  declined_quotes: number;
  total_quoted_cents: number;
  total_accepted_cents: number;
  last_quote_date: string | null;
};

export type CreateCustomerState = {
  error?: string;
  success?: boolean;
  customerId?: string;
};

export type UpdateCustomerState = {
  error?: string;
  success?: boolean;
};

// ============================================================================
// Search customers (fast fuzzy search via ILIKE — pg_trgm GIN index accelerates)
// ============================================================================

export async function searchCustomers(
  query: string,
): Promise<CustomerSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const supabase = await createClient();

  // Split query into words for multi-term matching
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

  // Build an ILIKE filter per word across all searchable fields.
  // pg_trgm GIN index on the concatenated expression accelerates this.
  // For simple single-word queries, use a single or() filter.
  // For multi-word, chain .or() calls — each word must match at least one field.
  let queryBuilder = supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone, company_name")
    .limit(15);

  for (const word of words) {
    const pattern = `%${word}%`;
    queryBuilder = queryBuilder.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},company_name.ilike.${pattern}`,
    );
  }

  const { data, error } = await queryBuilder.order("last_name").order("first_name");

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Customer search error:", error);
    return [];
  }

  return data ?? [];
}

// ============================================================================
// Create customer
// ============================================================================

export async function createCustomer(
  _prevState: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  try {
    const supabase = await createClient();

    // Get business_id from profile
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      return { error: "No business found for your account." };
    }

    const firstName = (formData.get("first_name") as string)?.trim() || null;
    const lastName = (formData.get("last_name") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;

    if (!firstName && !lastName && !email && !phone) {
      return { error: "At least a name, email, or phone is required." };
    }

    const customerData: CustomerInsert = {
      business_id: profile.business_id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company_name:
        (formData.get("company_name") as string)?.trim() || null,
      address_line1:
        (formData.get("address_line1") as string)?.trim() || null,
      address_line2:
        (formData.get("address_line2") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      state: (formData.get("state") as string)?.trim() || null,
      zip_code: (formData.get("zip_code") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    const { data: customer, error } = await supabase
      .from("customers")
      .insert(customerData)
      .select("id")
      .single();

    if (error) {
      if (error.message.includes("customers_email_format")) {
        return { error: "Invalid email address format." };
      }
      if (error.message.includes("customers_phone_format")) {
        return { error: "Invalid phone number format." };
      }
      return { error: "Failed to create customer." };
    }

    // Audit log (fire-and-forget)
    const customerName = [firstName, lastName].filter(Boolean).join(" ") || email || "Unknown";
    logActivity({
      action_type: "customer.created",
      resource_type: "customer",
      resource_id: customer.id,
      description: `Created customer ${customerName}`,
      metadata: { email, phone },
    }).catch(() => {});

    return { success: true, customerId: customer.id };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Create customer error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Update customer
// ============================================================================

export async function updateCustomer(
  _prevState: UpdateCustomerState,
  formData: FormData,
): Promise<UpdateCustomerState> {
  try {
    const supabase = await createClient();

    const customerId = formData.get("customer_id") as string;
    if (!customerId) return { error: "Customer ID is required." };

    const updates: Record<string, string | null> = {};

    for (const field of [
      "first_name",
      "last_name",
      "email",
      "phone",
      "company_name",
      "address_line1",
      "address_line2",
      "city",
      "state",
      "zip_code",
      "notes",
    ]) {
      const value = formData.get(field);
      if (value !== null) {
        updates[field] = (value as string).trim() || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return { error: "No fields to update." };
    }

    const { error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", customerId);

    if (error) {
      if (error.message.includes("customers_email_format")) {
        return { error: "Invalid email address format." };
      }
      if (error.message.includes("customers_phone_format")) {
        return { error: "Invalid phone number format." };
      }
      return { error: "Failed to update customer." };
    }

    // Audit log (fire-and-forget)
    logActivity({
      action_type: "customer.updated",
      resource_type: "customer",
      resource_id: customerId,
      description: `Updated customer ${customerId}`,
      metadata: { updated_fields: Object.keys(updates) },
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Update customer error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Get customer stats (quote counts, revenue totals)
// ============================================================================

export async function getCustomerStats(
  customerId: string,
): Promise<CustomerStats> {
  const supabase = await createClient();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("status, total_cents, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (!quotes || quotes.length === 0) {
    return {
      total_quotes: 0,
      draft_quotes: 0,
      sent_quotes: 0,
      accepted_quotes: 0,
      declined_quotes: 0,
      total_quoted_cents: 0,
      total_accepted_cents: 0,
      last_quote_date: null,
    };
  }

  let draftCount = 0;
  let sentCount = 0;
  let acceptedCount = 0;
  let declinedCount = 0;
  let totalQuotedCents = 0;
  let totalAcceptedCents = 0;

  for (const q of quotes) {
    totalQuotedCents += q.total_cents;

    switch (q.status) {
      case "draft":
        draftCount++;
        break;
      case "sent":
      case "viewed":
        sentCount++;
        break;
      case "accepted":
        acceptedCount++;
        totalAcceptedCents += q.total_cents;
        break;
      case "declined":
        declinedCount++;
        break;
    }
  }

  return {
    total_quotes: quotes.length,
    draft_quotes: draftCount,
    sent_quotes: sentCount,
    accepted_quotes: acceptedCount,
    declined_quotes: declinedCount,
    total_quoted_cents: totalQuotedCents,
    total_accepted_cents: totalAcceptedCents,
    last_quote_date: quotes[0]?.created_at ?? null,
  };
}
