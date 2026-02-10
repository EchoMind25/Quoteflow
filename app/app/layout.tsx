import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNavEnhanced } from "@/components/dashboard/bottom-nav-enhanced";
import { FloatingAction } from "@/components/dashboard/floating-action";
import { SmartHeader } from "@/components/layout/smart-header";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { SmartPageTransition } from "@/components/layout/page-transition";
import { SyncStatusWrapper } from "@/components/sync-status-wrapper";
import { ToastProvider } from "@/components/toast-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Quotestream",
    default: "Dashboard | Quotestream",
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role, business:businesses(name)")
    .eq("id", user.id)
    .single();

  const businessName =
    (profile?.business as { name: string } | null)?.name ?? "Quotestream";
  const userName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        {/* ---- Smart header with shrinking behavior ---- */}
        <SmartHeader businessName={businessName} userName={userName} />

        {/* ---- Offline indicator ---- */}
        <OfflineIndicator />

        {/* ---- Main content with page transitions ---- */}
        <main
          className="flex-1"
          style={{
            paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <SmartPageTransition>{children}</SmartPageTransition>
        </main>

        {/* ---- Sync status bar (above bottom nav) ---- */}
        <SyncStatusWrapper />

        {/* ---- Enhanced bottom navigation ---- */}
        <BottomNavEnhanced />

        {/* ---- Floating action button ---- */}
        <FloatingAction />
      </div>
    </ToastProvider>
  );
}
