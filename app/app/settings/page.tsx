import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  FileText,
  Package,
  Bell,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, role, business:businesses(name, industry, primary_color)",
    )
    .eq("id", user!.id)
    .single();

  const business = profile?.business as {
    name: string;
    industry: string;
    primary_color: string;
  } | null;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-lg font-bold">Settings</h1>

      {/* ---- Profile card ---- */}
      <div className="mt-4 rounded-xl border border-[hsl(var(--border))] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {(profile?.first_name?.charAt(0) ?? "").toUpperCase()}
            {(profile?.last_name?.charAt(0) ?? "").toUpperCase() ||
              user!.email?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {[profile?.first_name, profile?.last_name]
                .filter(Boolean)
                .join(" ") || "Your Name"}
            </p>
            <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">
              {user!.email}
            </p>
            <p className="text-xs capitalize text-[hsl(var(--muted-foreground))]">
              {profile?.role ?? "member"}
              {business ? ` at ${business.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ---- Settings sections ---- */}
      <div className="mt-6 space-y-1">
        <SectionHeader>Business</SectionHeader>
        <SettingsLink
          href="/app/settings/profile"
          icon={Building2}
          label="Business Profile"
          description="Name, address, logo, brand color"
        />
        <SettingsLink
          href="/app/settings/defaults"
          icon={FileText}
          label="Quote Defaults"
          description="Prefix, tax rate, expiration, terms"
        />
        <SettingsLink
          href="/app/settings/catalog"
          icon={Package}
          label="Service Catalog"
          description="Manage pricing for common services"
        />

        <SectionHeader>Account</SectionHeader>
        <SettingsLink
          href="/app/settings/notifications"
          icon={Bell}
          label="Notifications"
          description="Email and push preferences"
        />
      </div>

      {/* ---- Sign out ---- */}
      <div className="mt-8 border-t border-[hsl(var(--border))] pt-6">
        <SignOutButton />
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
      {children}
    </h2>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof Building2;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-[hsl(var(--muted))]/50"
    >
      <Icon className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
    </Link>
  );
}
