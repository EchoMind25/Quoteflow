"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/design-system/motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  id: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: LayoutDashboard, id: "home" },
  { href: "/app/quotes", label: "Quotes", icon: FileText, id: "quotes" },
  { href: "/app/customers", label: "Customers", icon: Users, id: "customers" },
  { href: "/app/settings", label: "Settings", icon: Settings, id: "settings" },
];

// ============================================================================
// ANIMATED NAV ICONS
// ============================================================================

const HomeIcon = ({ isActive, reducedMotion }: { isActive: boolean; reducedMotion: boolean }) => (
  <motion.div
    animate={
      isActive && !reducedMotion
        ? {
            y: [0, -3, 0],
            transition: { duration: duration.normal, ease: ease.enter },
          }
        : {}
    }
  >
    <LayoutDashboard className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
  </motion.div>
);

const QuotesIcon = ({ isActive, reducedMotion }: { isActive: boolean; reducedMotion: boolean }) => (
  <motion.div
    animate={
      isActive && !reducedMotion
        ? {
            rotate: [0, -2, 2, -2, 0],
            transition: { duration: 0.4, ease: ease.default },
          }
        : {}
    }
  >
    <FileText className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
  </motion.div>
);

const CustomersIcon = ({ isActive, reducedMotion }: { isActive: boolean; reducedMotion: boolean }) => (
  <motion.div
    animate={
      isActive && !reducedMotion
        ? {
            scale: [1, 1.1, 1],
            transition: { duration: duration.normal, ease: ease.enter },
          }
        : {}
    }
  >
    <Users className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
  </motion.div>
);

const SettingsIcon = ({ isActive, reducedMotion }: { isActive: boolean; reducedMotion: boolean }) => (
  <motion.div
    animate={
      reducedMotion
        ? {}
        : {
            rotate: isActive ? 90 : 0,
            transition: { duration: 0.3, ease: ease.default },
          }
    }
  >
    <Settings className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
  </motion.div>
);

const ICON_COMPONENTS = {
  home: HomeIcon,
  quotes: QuotesIcon,
  customers: CustomersIcon,
  settings: SettingsIcon,
};

// ============================================================================
// BOTTOM NAV WITH MORPHING INDICATOR
// ============================================================================

export function BottomNavEnhanced() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[hsl(var(--border))]/50 backdrop-blur-xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background:
          "linear-gradient(to bottom, hsl(var(--background))/80, hsl(var(--background))/95)",
      }}
    >
      <LayoutGroup>
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            const IconComponent = ICON_COMPONENTS[item.id as keyof typeof ICON_COMPONENTS];

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex min-w-[4.5rem] flex-col items-center gap-1.5 px-3 py-2"
              >
                {/* Morphing active bubble (static bg for reduced motion) */}
                {isActive && (
                  reducedMotion ? (
                    <div className="absolute inset-0 rounded-2xl bg-brand-600/10 dark:bg-brand-400/10" />
                  ) : (
                    <motion.div
                      layoutId="active-bubble"
                      className="absolute inset-0 rounded-2xl bg-brand-600/10 dark:bg-brand-400/10"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )
                )}

                {/* Icon with micro-animation */}
                <div
                  className={cn(
                    "relative z-10 transition-colors duration-200",
                    isActive
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-[hsl(var(--muted-foreground))]",
                  )}
                >
                  <IconComponent isActive={isActive} reducedMotion={reducedMotion} />
                </div>

                {/* Label */}
                {reducedMotion ? (
                  <span
                    className={cn(
                      "relative z-10 text-xs font-medium",
                      isActive
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-[hsl(var(--muted-foreground))]",
                    )}
                  >
                    {item.label}
                  </span>
                ) : (
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0.7,
                      y: isActive ? 0 : 2,
                    }}
                    transition={{
                      duration: duration.fast,
                      ease: ease.default,
                    }}
                    className={cn(
                      "relative z-10 text-xs font-medium transition-colors duration-200",
                      isActive
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-[hsl(var(--muted-foreground))]",
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
