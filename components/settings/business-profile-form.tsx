"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  updateBusinessProfile,
  uploadBusinessLogo,
  updateBrandingColor,
  type SettingsActionState,
} from "@/lib/actions/settings";
import { useToast } from "@/components/toast-provider";
import type { Business } from "@/types/database";

// ============================================================================
// Constants
// ============================================================================

const PRESET_COLORS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Teal", value: "#0d9488" },
  { name: "Pink", value: "#db2777" },
  { name: "Indigo", value: "#4f46e5" },
];

const initialState: SettingsActionState = {};

// ============================================================================
// Component
// ============================================================================

export function BusinessProfileForm({ business }: { business: Business }) {
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for live preview
  const [logoUrl, setLogoUrl] = useState(business.logo_url);
  const [primaryColor, setPrimaryColor] = useState(business.primary_color);
  const [businessName, setBusinessName] = useState(business.name);
  const [customHex, setCustomHex] = useState(business.primary_color);

  // ---- Profile form action ----
  const [profileState, profileAction, isProfilePending] = useActionState(
    updateBusinessProfile,
    initialState,
  );

  // ---- Logo upload action ----
  const [logoState, logoAction, isLogoPending] = useActionState(
    uploadBusinessLogo,
    initialState,
  );

  // ---- Color update action ----
  const [colorState, colorAction, isColorPending] = useActionState(
    updateBrandingColor,
    initialState,
  );

  // ---- Toast on action completion ----
  useEffect(() => {
    if (profileState.success) toast("Profile saved");
    if (profileState.error) toast(profileState.error, "error");
  }, [profileState, toast]);

  useEffect(() => {
    if (logoState.success && logoState.logoUrl) {
      setLogoUrl(logoState.logoUrl);
      toast("Logo updated");
    }
    if (logoState.error) toast(logoState.error, "error");
  }, [logoState, toast]);

  useEffect(() => {
    if (colorState.success) toast("Brand color saved");
    if (colorState.error) toast(colorState.error, "error");
  }, [colorState, toast]);

  // ---- Autosave (debounced) ----
  const handleFieldChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const form = document.getElementById(
        "profile-form",
      ) as HTMLFormElement | null;
      if (form) {
        const formData = new FormData(form);
        profileAction(formData);
      }
    }, 1000);
  }, [profileAction]);

  // ---- Logo upload handler ----
  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast("File must be under 2MB", "error");
        return;
      }

      const formData = new FormData();
      formData.append("logo", file);
      logoAction(formData);
    },
    [logoAction, toast],
  );

  // ---- Color change handler ----
  const handleColorSelect = useCallback(
    (color: string) => {
      setPrimaryColor(color);
      setCustomHex(color);
      const formData = new FormData();
      formData.append("primary_color", color);
      colorAction(formData);
    },
    [colorAction],
  );

  const handleCustomHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomHex(val);
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        handleColorSelect(val);
      }
    },
    [handleColorSelect],
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[hsl(var(--muted))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Business Profile</h1>
      </div>

      {/* ---- Logo upload ---- */}
      <div className="rounded-xl border border-[hsl(var(--border))] p-4">
        <p className="mb-3 text-sm font-medium">Business Logo</p>
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <Camera className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
            )}
            {isLogoPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLogoPending}
              className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
            >
              {logoUrl ? "Change Logo" : "Upload Logo"}
            </button>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              PNG, JPEG, or SVG. Max 2MB.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleLogoChange}
            className="hidden"
          />
        </div>
      </div>

      {/* ---- Brand color ---- */}
      <div className="rounded-xl border border-[hsl(var(--border))] p-4">
        <p className="mb-3 text-sm font-medium">
          Brand Color
          {isColorPending && (
            <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => handleColorSelect(c.value)}
              title={c.name}
              className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                primaryColor === c.value
                  ? "border-[hsl(var(--foreground))] ring-2 ring-[hsl(var(--ring))]"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div
            className="h-8 w-8 shrink-0 rounded-lg border border-[hsl(var(--border))]"
            style={{ backgroundColor: primaryColor }}
          />
          <input
            type="text"
            value={customHex}
            onChange={handleCustomHexChange}
            placeholder="#2563eb"
            maxLength={7}
            className="h-9 w-28 rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm font-mono outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>
      </div>

      {/* ---- Profile fields ---- */}
      <form
        id="profile-form"
        action={profileAction}
        className="space-y-4 rounded-xl border border-[hsl(var(--border))] p-4"
      >
        <p className="text-sm font-medium">
          Business Details
          {isProfilePending && (
            <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />
          )}
        </p>

        <FormField
          name="name"
          label="Business Name"
          defaultValue={business.name}
          required
          onChange={(e) => {
            setBusinessName(e.target.value);
            handleFieldChange();
          }}
          onBlur={handleFieldChange}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={business.phone ?? ""}
            onChange={handleFieldChange}
            onBlur={handleFieldChange}
          />
          <FormField
            name="email"
            label="Email"
            type="email"
            defaultValue={business.email ?? ""}
            onChange={handleFieldChange}
            onBlur={handleFieldChange}
          />
        </div>

        <FormField
          name="address_line1"
          label="Address"
          defaultValue={business.address_line1 ?? ""}
          onChange={handleFieldChange}
          onBlur={handleFieldChange}
        />
        <FormField
          name="address_line2"
          label="Address Line 2"
          defaultValue={business.address_line2 ?? ""}
          onChange={handleFieldChange}
          onBlur={handleFieldChange}
        />

        <div className="grid grid-cols-3 gap-3">
          <FormField
            name="city"
            label="City"
            defaultValue={business.city ?? ""}
            onChange={handleFieldChange}
            onBlur={handleFieldChange}
          />
          <FormField
            name="state"
            label="State"
            defaultValue={business.state ?? ""}
            onChange={handleFieldChange}
            onBlur={handleFieldChange}
          />
          <FormField
            name="zip_code"
            label="ZIP"
            defaultValue={business.zip_code ?? ""}
            onChange={handleFieldChange}
            onBlur={handleFieldChange}
          />
        </div>
      </form>

      {/* ---- Live preview ---- */}
      <div className="rounded-xl border border-[hsl(var(--border))] p-4">
        <p className="mb-3 text-sm font-medium">
          Quote Preview
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div
            className="px-4 py-5 text-center text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="mx-auto mb-2 h-8 w-auto"
              />
            )}
            <p className="text-sm font-bold">
              {businessName || "Your Business"}
            </p>
          </div>
          <div className="bg-white p-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>AC Unit Replacement</span>
              <span>$2,450.00</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Thermostat Install</span>
              <span>$350.00</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-xs font-bold text-gray-900">
              <span>Total</span>
              <span>$2,800.00</span>
            </div>
            <button
              type="button"
              disabled
              className="mt-3 w-full rounded-lg py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Accept Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FormField({
  name,
  label,
  type = "text",
  defaultValue,
  required,
  onChange,
  onBlur,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        onChange={onChange}
        onBlur={onBlur}
        className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
      />
    </div>
  );
}
