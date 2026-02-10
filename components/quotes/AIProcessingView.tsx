"use client";

/**
 * AI Processing Visualization - The dramatic 8-15 second wait
 * Makes AI generation feel fast and impressive with engaging visuals
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Sparkles, Image as ImageIcon, Mic, DollarSign, CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useStatusAnnouncer } from "@/components/ui/StatusAnnouncer";
import { duration, ease } from "@/lib/design-system/motion";

// ============================================================================
// Types
// ============================================================================

interface AIProcessingViewProps {
  photoUrls?: string[];
  hasVoiceNote?: boolean;
  industry?: string;
  onComplete?: () => void;
}

type ProcessingStage =
  | "analyzing_photos"
  | "processing_voice"
  | "matching_pricing"
  | "generating_items"
  | "finalizing";

interface StageConfig {
  label: string;
  icon: React.ReactNode;
  duration: number; // milliseconds
  description: string;
}

// ============================================================================
// Component
// ============================================================================

export function AIProcessingView({
  photoUrls = [],
  hasVoiceNote = false,
  industry = "general",
  onComplete,
}: AIProcessingViewProps) {
  const [stage, setStage] = useState<ProcessingStage>("analyzing_photos");
  const [progress, setProgress] = useState(0);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const reducedMotion = useReducedMotion();
  const { announce } = useStatusAnnouncer();

  const coreControls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap: store previous focus, focus into modal, restore on unmount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the container so screen readers announce it
    const timer = setTimeout(() => {
      containerRef.current?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
      // Restore focus to previous element
      previousFocusRef.current?.focus();
    };
  }, []);

  // Trap keyboard focus inside the overlay
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      // Keep focus on the container (no interactive elements to tab to)
      e.preventDefault();
    }
  };

  // Announce stage changes for screen readers
  useEffect(() => {
    const messages: Record<ProcessingStage, string> = {
      analyzing_photos: "Analyzing your photos",
      processing_voice: "Processing your voice note",
      matching_pricing: "Matching pricing for your industry",
      generating_items: "Generating line items",
      finalizing: "Finalizing your quote",
    };
    announce(messages[stage]);
  }, [stage, announce]);

  // Stage configurations with realistic timing
  const stages: Record<ProcessingStage, StageConfig> = {
    analyzing_photos: {
      label: "Analyzing photos",
      icon: <ImageIcon className="h-6 w-6" />,
      duration: 3000,
      description: "Detecting equipment, conditions, and measurements...",
    },
    processing_voice: {
      label: "Processing voice notes",
      icon: <Mic className="h-6 w-6" />,
      duration: 2500,
      description: "Understanding job requirements from description...",
    },
    matching_pricing: {
      label: "Matching industry pricing",
      icon: <DollarSign className="h-6 w-6" />,
      duration: 3500,
      description: `Applying ${industry} standards and labor rates...`,
    },
    generating_items: {
      label: "Generating line items",
      icon: <Sparkles className="h-6 w-6" />,
      duration: 3000,
      description: "Creating detailed quote breakdown...",
    },
    finalizing: {
      label: "Finalizing quote",
      icon: <CheckCircle2 className="h-6 w-6" />,
      duration: 1000,
      description: "Almost ready...",
    },
  };

  // Simulate line item generation
  const mockLineItems = [
    "HVAC System Inspection",
    "Compressor Replacement",
    "Refrigerant Recharge",
    "Ductwork Repair (3 ft)",
    "Thermostat Installation",
    "Air Filter Replacement",
    "Labor & Service Call",
  ];

  useEffect(() => {
    const stageOrder: ProcessingStage[] = [
      "analyzing_photos",
      ...(hasVoiceNote ? ["processing_voice" as const] : []),
      "matching_pricing",
      "generating_items",
      "finalizing",
    ];

    let currentStageIndex = 0;
    let totalElapsed = 0;

    const advanceStage = () => {
      if (currentStageIndex >= stageOrder.length) {
        // Processing complete
        setTimeout(() => {
          onComplete?.();
        }, 500);
        return;
      }

      const currentStage = stageOrder[currentStageIndex];
      if (!currentStage) return;

      setStage(currentStage);

      // Animate core pulse for new stage
      coreControls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.5 },
      });

      // Progress bar animation
      const stageDuration = stages[currentStage].duration;
      const progressInterval = 50;
      const progressStep = (progressInterval / stageDuration) * 100;

      let stageProgress = 0;
      const progressTimer = setInterval(() => {
        stageProgress += progressStep;
        const overallProgress =
          (currentStageIndex / stageOrder.length) * 100 +
          (stageProgress / stageOrder.length);
        setProgress(Math.min(overallProgress, 100));

        if (stageProgress >= 100) {
          clearInterval(progressTimer);
        }
      }, progressInterval);

      // Generate line items during "generating_items" stage
      if (currentStage === "generating_items") {
        mockLineItems.forEach((item, i) => {
          setTimeout(() => {
            setGeneratedItems((prev) => [...prev, item]);
          }, (stageDuration / mockLineItems.length) * i);
        });
      }

      // Move to next stage
      setTimeout(() => {
        currentStageIndex++;
        totalElapsed += stageDuration;
        advanceStage();
      }, stageDuration);
    };

    advanceStage();

    // Cleanup
    return () => {
      setProgress(0);
      setGeneratedItems([]);
    };
  }, [hasVoiceNote, industry, onComplete, coreControls, stages]);

  const currentStageConfig = stages[stage];

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ai-processing-title"
      aria-describedby="ai-processing-status"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 backdrop-blur-sm"
    >
      {/* Screen reader announcements */}
      <h2 id="ai-processing-title" className="sr-only">
        Quote Generation in Progress
      </h2>
      <div id="ai-processing-status" role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {currentStageConfig.label}: {currentStageConfig.description} {Math.round(progress)}% complete.
      </div>
      {/* Particle field background (skip for reduced motion) */}
      {!reducedMotion && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-primary-400/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                x: [0, Math.random() * 100 - 50],
                y: [0, Math.random() * 100 - 50],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Orbiting photos */}
        <div className="relative h-[300px] w-[300px]">
          {/* Central processing core (3D wireframe) */}
          <motion.div
            animate={coreControls}
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="processing-core">
              <div className="core-face core-front" />
              <div className="core-face core-back" />
              <div className="core-face core-left" />
              <div className="core-face core-right" />
              <div className="core-face core-top" />
              <div className="core-face core-bottom" />
            </div>
          </motion.div>

          {/* Orbiting photos (static grid in reduced motion) */}
          {reducedMotion ? (
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-2">
              {photoUrls.slice(0, 4).map((url, i) => (
                <div key={url} className="h-14 w-14 overflow-hidden rounded-lg border-2 border-white/20 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            photoUrls.slice(0, 4).map((url, i) => {
              const angle = (i / Math.min(photoUrls.length, 4)) * Math.PI * 2;
              const radius = 120;
              const orbitDuration = 15;

              return (
                <motion.div
                  key={url}
                  className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: orbitDuration,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    transformOrigin: "center center",
                  }}
                >
                  <motion.div
                    className="absolute"
                    style={{
                      left: Math.cos(angle) * radius,
                      top: Math.sin(angle) * radius,
                    }}
                    animate={{
                      rotate: -360,
                    }}
                    transition={{
                      duration: orbitDuration,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-lg border-2 border-white/20 shadow-lg backdrop-blur-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* "Analyzed" checkmark */}
                    {stage !== "analyzing_photos" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow-md"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Status message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: duration.normal }}
            className="mt-8 text-center"
          >
            <div className="mb-3 flex items-center justify-center gap-3 text-white">
              {currentStageConfig.icon}
              <h2 className="text-2xl font-semibold">
                {currentStageConfig.label}
              </h2>
            </div>
            <p className="text-sm text-blue-200">
              {currentStageConfig.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="mt-6 w-full max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-white/10 backdrop-blur-sm">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: duration.normal, ease: ease.default }}
            />
          </div>
          <p className="mt-2 text-center text-xs tabular-nums text-white/60">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Generated line items preview */}
        {stage === "generating_items" && generatedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 w-full max-w-md"
          >
            <div className="rounded-lg bg-white/5 p-4 backdrop-blur-md">
              <h3 className="mb-3 text-sm font-medium text-white/80">
                Line Items
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {generatedItems.map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 text-sm text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
                      <span className="flex-1">{item}</span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 + 0.3 }}
                        className="tabular-nums text-primary-300"
                      >
                        $
                        {Math.floor(Math.random() * 500 + 100)
                          .toString()
                          .padStart(3, "0")}
                      </motion.span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* CSS-only 3D wireframe core styles */}
      <style jsx global>{`
        .processing-core {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: rotate3d 8s linear infinite;
        }

        @keyframes rotate3d {
          from {
            transform: rotateX(0deg) rotateY(0deg);
          }
          to {
            transform: rotateX(360deg) rotateY(360deg);
          }
        }

        .core-face {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(59, 130, 246, 0.6);
          border-radius: 20%;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
        }

        .core-front {
          transform: translateZ(64px);
        }
        .core-back {
          transform: translateZ(-64px) rotateY(180deg);
        }
        .core-left {
          transform: rotateY(-90deg) translateZ(64px);
        }
        .core-right {
          transform: rotateY(90deg) translateZ(64px);
        }
        .core-top {
          transform: rotateX(90deg) translateZ(64px);
        }
        .core-bottom {
          transform: rotateX(-90deg) translateZ(64px);
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .processing-core {
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%,
            100% {
              opacity: 0.8;
            }
            50% {
              opacity: 1;
            }
          }
        }
      `}</style>
    </motion.div>
  );
}
