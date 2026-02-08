import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerInsert } from "@/types/database";

export type SearchCustomersOptions = {
  query: string;
  limit?: number;
};

export async function searchCustomers(options: SearchCustomersOptions) {
  const { query, limit = 20 } = options;
  const supabase = await createClient();

  // Search across name, email, phone, company, and address
  const searchTerm = `%${query}%`;

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, first_name, last_name, email, phone, company_name, address_line1, city, state, zip_code",
    )
    .or(
      `first_name.ilike.${searchTerm},` +
        `last_name.ilike.${searchTerm},` +
        `email.ilike.${searchTerm},` +
        `phone.ilike.${searchTerm},` +
        `company_name.ilike.${searchTerm},` +
        `address_line1.ilike.${searchTerm}`,
    )
    .order("last_name", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as Customer[];
}

export async function getCustomerById(
  id: string,
): Promise<Customer | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as Customer;
}

export async function createCustomer(
  input: Omit<CustomerInsert, "id">,
): Promise<Customer> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Customer;
}

export async function findOrCreateCustomer(
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
  },
  businessId: string,
): Promise<Customer> {
  const supabase = await createClient();

  // Try to find existing customer by address within this business
  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .eq("address_line1", address.line1)
    .eq("zip_code", address.zip)
    .maybeSingle();

  if (existing) return existing as Customer;

  return createCustomer({
    business_id: businessId,
    first_name: address.first_name ?? null,
    last_name: address.last_name ?? null,
    email: address.email ?? null,
    phone: address.phone ?? null,
    address_line1: address.line1,
    city: address.city,
    state: address.state,
    zip_code: address.zip,
  });
}
