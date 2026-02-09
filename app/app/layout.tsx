import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { DarkModeToggle } from "@/components/dashboard/dark-mode-toggle";
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
      {/* ---- Top header ---- */}
      <header
        className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur-sm supports-[backdrop-filter]:bg-[hsl(var(--background))]/80"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {businessName}
            </p>
            <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
              {userName}
            </p>
          </div>
          <DarkModeToggle />
        </div>
      </header>

      {/* ---- Main content with bottom padding for nav ---- */}
      <main
        className="flex-1"
        style={{
          paddingBottom:
            "calc(4rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {children}
      </main>

      {/* ---- Sync status bar (above bottom nav) ---- */}
      <SyncStatusWrapper />

      {/* ---- Bottom navigation ---- */}
      <BottomNav />
    </div>
    </ToastProvider>
  );
}
