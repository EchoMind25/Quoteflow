"use client";

import { motion } from "framer-motion";
import { Zap, Mic, Brain, WifiOff, Palette, Users, Camera, FileText } from "lucide-react";
import { listContainer, listItem, duration, ease } from "@/lib/design-system/motion";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  size?: "normal" | "large";
};

const features: Feature[] = [
  {
    icon: Zap,
    title: "90-Second Quotes",
    description: "From job site to customer inbox in under 2 minutes",
    size: "large",
  },
  {
    icon: Mic,
    title: "Voice-to-Quote",
    description: "Just describe the job. AI handles the rest.",
  },
  {
    icon: Brain,
    title: "Industry-Trained AI",
    description: "Knows HVAC, plumbing, electrical pricing by heart",
  },
  {
    icon: WifiOff,
    title: "Works Offline",
    description: "No signal? No problem. Syncs when connected.",
  },
  {
    icon: Camera,
    title: "Photo Intelligence",
    description: "AI analyzes photos to identify equipment and issues",
  },
  {
    icon: Palette,
    title: "Your Brand",
    description: "Custom logo and colors on every quote",
  },
  {
    icon: Users,
    title: "Team Ready",
    description: "Invite techs, set permissions, track activity",
  },
  {
    icon: FileText,
    title: "Professional Output",
    description: "Beautiful, branded quotes customers love to accept",
  },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Feature grid with bento-style layout
 * One hero feature (larger card) with supporting features
 */
export function Features() {
  return (
    <section id="features" className="scroll-mt-16 bg-white px-4 py-20 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <motion.h2
            className="mb-4 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: duration.normal, ease: ease.enter }}
          >
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              Quote Faster
            </span>
          </motion.h2>
          <motion.p
            className="mx-auto max-w-2xl text-lg text-neutral-600 dark:text-neutral-400"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: duration.normal, ease: ease.enter }}
          >
            Built for the way you actually work in the field
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={listContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  const isHero = feature.size === "large";

  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-6 transition-all hover:border-primary-300 hover:shadow-xl dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-800 dark:hover:border-primary-700",
        isHero && "sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2",
      )}
      variants={listItem}
      transition={{
        delay: index * 0.05,
        duration: duration.normal,
        ease: ease.enter,
      }}
    >
      {/* Background Gradient on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Content */}
      <div className="relative flex h-full flex-col">
        {/* Icon */}
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
            isHero ? "h-16 w-16" : "h-12 w-12",
          )}
        >
          <Icon className={isHero ? "h-8 w-8" : "h-6 w-6"} />
        </div>

        {/* Text */}
        <h3
          className={cn(
            "mb-2 font-semibold text-neutral-900 dark:text-white",
            isHero ? "text-2xl" : "text-lg",
          )}
        >
          {feature.title}
        </h3>
        <p
          className={cn(
            "text-neutral-600 dark:text-neutral-400",
            isHero ? "text-base" : "text-sm",
          )}
        >
          {feature.description}
        </p>

        {/* Hero Feature Badge */}
        {isHero && (
          <div className="mt-auto pt-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
              <Zap className="h-3 w-3" />
              Most Popular
            </span>
          </div>
        )}
      </div>

      {/* Hover Arrow */}
      <div className="absolute bottom-6 right-6 text-primary-600 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100 dark:text-primary-400">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </div>
    </motion.div>
  );
}
