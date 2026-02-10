"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, tapPress } from "@/lib/design-system/motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

type QuickAction = {
  icon: typeof FileText;
  label: string;
  href: string;
  color: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: FileText,
    label: "New Quote",
    href: "/app/quotes/new",
    color: "bg-brand-600 hover:bg-brand-700 text-white",
  },
  {
    icon: UserPlus,
    label: "New Customer",
    href: "/app/customers/new",
    color:
      "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 text-[hsl(var(--foreground))]",
  },
];

export function FloatingAction() {
  const [isOpen, setIsOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
      {/* Quick actions menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.9 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
            transition={
              reducedMotion
                ? { duration: 0.01 }
                : {
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }
            }
            className="flex flex-col gap-2"
          >
            {QUICK_ACTIONS.map((action, index) => (
              <motion.div
                key={action.href}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                transition={
                  reducedMotion
                    ? { duration: 0.01 }
                    : {
                        delay: index * 0.05,
                        duration: duration.fast,
                        ease: ease.enter,
                      }
                }
              >
                <Link
                  href={action.href}
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold shadow-lg transition-all",
                    action.color,
                  )}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={toggleMenu}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30 transition-shadow hover:shadow-xl hover:shadow-brand-600/40"
        whileTap={reducedMotion ? undefined : tapPress}
        animate={
          reducedMotion
            ? {}
            : { rotate: isOpen ? 45 : 0 }
        }
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : {
                duration: duration.normal,
                ease: ease.default,
              }
        }
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
      >
        {/* Plus icon */}
        <motion.div
          initial={false}
          animate={
            reducedMotion
              ? {}
              : { scale: isOpen ? 1.1 : 1 }
          }
          transition={{ duration: duration.fast }}
        >
          <Plus
            className={cn("h-6 w-6 transition-transform", reducedMotion && isOpen && "rotate-45")}
            strokeWidth={2.5}
          />
        </motion.div>

        {/* Ripple effect (skip for reduced motion) */}
        {!reducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: ease.enter,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        )}
      </motion.button>

      {/* Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast }}
            onClick={closeMenu}
            className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
