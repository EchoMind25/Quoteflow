"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type SettingsActionState = {
  error?: string;
  success?: boolean;
  logoUrl?: string;
};

// ============================================================================
// Helpers
// ============================================================================

async function getBusinessId(): Promise<{
  businessId: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { businessId: null, error: "Not authenticated." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return { businessId: null, error: "No business associated with account." };
  }

  return { businessId: profile.business_id };
}

// ============================================================================
// Update Business Profile
// ============================================================================

export async function updateBusinessProfile(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const { businessId, error: authError } = await getBusinessId();
    if (!businessId) return { error: authError };

    const name = (formData.get("name") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const addressLine1 =
      (formData.get("address_line1") as string)?.trim() || null;
    const addressLine2 =
      (formData.get("address_line2") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const state = (formData.get("state") as string)?.trim() || null;
    const zipCode = (formData.get("zip_code") as string)?.trim() || null;

    if (!name) {
      return { error: "Business name is required." };
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email format." };
    }

    if (phone && !/^[\d\s()+-]{7,20}$/.test(phone)) {
      return { error: "Invalid phone format." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        name,
        phone,
        email,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        zip_code: zipCode,
      })
      .eq("id", businessId);

    if (error) {
      return { error: "Failed to update business profile." };
    }

    revalidateTag(`business-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Upload Business Logo
// ============================================================================

export async function uploadBusinessLogo(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const { businessId, error: authError } = await getBusinessId();
    if (!businessId) return { error: authError };

    const file = formData.get("logo") as File | null;
    if (!file || file.size === 0) {
      return { error: "No file provided." };
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return { error: "File must be PNG, JPEG, or SVG." };
    }

    if (file.size > 2 * 1024 * 1024) {
      return { error: "File must be under 2MB." };
    }

    const ext = file.type === "image/svg+xml"
      ? "svg"
      : file.type === "image/png"
        ? "png"
        : "jpg";
    const path = `${businessId}/logo.${ext}`;

    const supabase = await createClient();

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return { error: "Failed to upload logo." };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("business-logos").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ logo_url: publicUrl })
      .eq("id", businessId);

    if (updateError) {
      return { error: "Logo uploaded but failed to update profile." };
    }

    revalidateTag(`business-${businessId}`, { expire: 300 });
    return { success: true, logoUrl: publicUrl };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Update Branding Color
// ============================================================================

export async function updateBrandingColor(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const { businessId, error: authError } = await getBusinessId();
    if (!businessId) return { error: authError };

    const color = (formData.get("primary_color") as string)?.trim();

    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return { error: "Invalid hex color." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({ primary_color: color })
      .eq("id", businessId);

    if (error) {
      return { error: "Failed to update brand color." };
    }

    revalidateTag(`business-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Update Quote Defaults
// ============================================================================

export async function updateQuoteDefaults(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const { businessId, error: authError } = await getBusinessId();
    if (!businessId) return { error: authError };

    const prefix = (formData.get("quote_prefix") as string)?.trim();
    const expiryStr = formData.get("default_expiry_days") as string;
    const taxRateStr = formData.get("default_tax_rate") as string;
    const terms = (formData.get("default_terms") as string)?.trim() || null;

    if (!prefix || prefix.length > 10) {
      return { error: "Quote prefix is required and must be 10 chars or fewer." };
    }

    const expiryDays = parseInt(expiryStr, 10);
    if (isNaN(expiryDays) || expiryDays < 1 || expiryDays > 90) {
      return { error: "Expiration must be between 1 and 90 days." };
    }

    const taxRate = parseFloat(taxRateStr);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      return { error: "Tax rate must be between 0 and 100." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("businesses")
      .update({
        quote_prefix: prefix,
        default_expiry_days: expiryDays,
        default_tax_rate: taxRate,
        default_terms: terms,
      })
      .eq("id", businessId);

    if (error) {
      return { error: "Failed to update quote defaults." };
    }

    revalidateTag(`business-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Create Catalog Item
// ============================================================================

export type CatalogActionState = {
  error?: string;
  success?: boolean;
  itemId?: string;
};

export async function createCatalogItem(
  _prevState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const { businessId, error: authError } = await getBusinessId();
    if (!businessId) return { error: authError };

    const title = (formData.get("title") as string)?.trim();
    const description =
      (formData.get("description") as string)?.trim() || null;
    const category = (formData.get("category") as string)?.trim() || null;
    const unit = (formData.get("unit") as string)?.trim() || "ea";
    const priceCentsStr = formData.get("unit_price_cents") as string;
    const priceCents = parseInt(priceCentsStr, 10);

    if (!title) {
      return { error: "Title is required." };
    }

    if (isNaN(priceCents) || priceCents < 0) {
      return { error: "Price must be 0 or more." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pricing_catalog")
      .insert({
        business_id: businessId,
        title,
        description,
        category,
        unit,
        unit_price_cents: priceCents,
      })
      .select("id")
      .single();

    if (error) {
      return { error: "Failed to create catalog item." };
    }

    revalidateTag(`catalog-${businessId}`, { expire: 300 });
    return { success: true, itemId: data.id };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Update Catalog Item
// ============================================================================

export async function updateCatalogItem(
  _prevState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const { businessId, error: authError } = await getBusinessId();
    if (!businessId) return { error: authError };

    const id = formData.get("id") as string;
    const title = (formData.get("title") as string)?.trim();
    const description =
      (formData.get("description") as string)?.trim() || null;
    const category = (formData.get("category") as string)?.trim() || null;
    const unit = (formData.get("unit") as string)?.trim() || "ea";
    const priceCentsStr = formData.get("unit_price_cents") as string;
    const priceCents = parseInt(priceCentsStr, 10);

    if (!id) {
      return { error: "Item ID is required." };
    }

    if (!title) {
      return { error: "Title is required." };
    }

    if (isNaN(priceCents) || priceCents < 0) {
      return { error: "Price must be 0 or more." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("pricing_catalog")
      .update({
        title,
        description,
        category,
        unit,
        unit_price_cents: priceCents,
      })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      return { error: "Failed to update catalog item." };
    }

    revalidateTag(`catalog-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Delete Catalog Item (soft delete)
// ============================================================================

export async function deleteCatalogItem(
  _prevState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const { businessId, error: authError } = await getBusinessId();
    if (!businessId) return { error: authError };

    const id = formData.get("id") as string;
    if (!id) {
      return { error: "Item ID is required." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("pricing_catalog")
      .update({ is_active: false })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      return { error: "Failed to delete catalog item." };
    }

    revalidateTag(`catalog-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Update Notification Preferences (localStorage-based, just returns success)
// ============================================================================

export async function updateNotificationPreferences(
  _prevState: SettingsActionState,
  _formData: FormData,
): Promise<SettingsActionState> {
  // Notification preferences are stored client-side in localStorage.
  // This server action exists for future server-side storage.
  return { success: true };
}
