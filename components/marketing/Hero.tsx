"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield } from "lucide-react";
import { slideUp, duration, ease, hoverScale } from "@/lib/design-system/motion";

/**
 * Hero section for marketing homepage
 * Pain-point focused headline with clear CTA
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-neutral-50 px-4 py-20 dark:from-neutral-950 dark:to-neutral-900 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <motion.div
            className="flex flex-col justify-center"
            variants={slideUp}
            initial="initial"
            animate="animate"
            transition={{ duration: duration.normal, ease: ease.enter }}
          >
            {/* Badge */}
            <motion.div
              className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: duration.normal }}
            >
              <Zap className="h-4 w-4" />
              <span>90-Second Quotes</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="mb-6 text-5xl font-bold leading-tight tracking-tight text-neutral-900 dark:text-white sm:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: duration.normal }}
            >
              Stop Losing Jobs to{" "}
              <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                Slow Quotes
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="mb-8 text-xl leading-relaxed text-neutral-600 dark:text-neutral-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: duration.normal }}
            >
              Turn job site photos and voice notes into professional quotes in
              90 seconds. AI-powered. Industry-trained. Offline-ready.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: duration.normal }}
            >
              <motion.a
                href="/signup"
                className="group flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all"
                whileHover={hoverScale}
                whileTap={{ scale: 0.95 }}
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.a>

              <motion.a
                href="#features"
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
                whileHover={hoverScale}
                whileTap={{ scale: 0.95 }}
              >
                See How It Works
              </motion.a>
            </motion.div>

            {/* Trust Signals */}
            <motion.div
              className="mt-8 flex flex-wrap items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: duration.normal }}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary-600" />
                <span>14-day free trial</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: duration.slow, ease: ease.enter }}
          >
            {/* Phone Mockup */}
            <div className="relative">
              {/* Glow Effect */}
              <motion.div
                className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary-400 to-primary-600 opacity-20 blur-3xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.3, 0.2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: ease.default,
                }}
              />

              {/* Phone Frame */}
              <div className="relative z-10 w-[320px] overflow-hidden rounded-[3rem] border-8 border-neutral-900 bg-neutral-900 shadow-2xl dark:border-neutral-800">
                {/* Screen */}
                <div className="aspect-[9/19.5] bg-gradient-to-br from-primary-50 to-white dark:from-neutral-900 dark:to-neutral-800">
                  {/* Simulated App UI */}
                  <div className="flex h-full flex-col p-6">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-8 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-8 w-8 rounded-full bg-primary-500" />
                    </div>

                    {/* Quote Card Mockup */}
                    <motion.div
                      className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 1, duration: duration.slow }}
                    >
                      <div className="mb-2 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="mb-3 h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-600" />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <div className="h-3 w-20 rounded bg-neutral-100 dark:bg-neutral-600" />
                          <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
                        </div>
                        <div className="flex justify-between">
                          <div className="h-3 w-24 rounded bg-neutral-100 dark:bg-neutral-600" />
                          <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
                        </div>
                      </div>
                    </motion.div>

                    {/* Line Items Animation */}
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="mb-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{
                          delay: 1.2 + i * 0.15,
                          duration: 0.4,
                        }}
                      >
                        <div className="mb-1.5 h-2.5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-2 w-1/2 rounded bg-neutral-100 dark:bg-neutral-600" />
                      </motion.div>
                    ))}

                    {/* Total Badge */}
                    <motion.div
                      className="mt-auto rounded-full bg-gradient-to-r from-green-500 to-green-400 px-6 py-3 text-center"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1.8, duration: duration.slow }}
                    >
                      <div className="h-4 w-20 mx-auto rounded bg-white/40" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
