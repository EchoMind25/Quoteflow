"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { scaleIn, duration, ease, listContainer, listItem } from "@/lib/design-system/motion";

// ============================================================================
// Types
// ============================================================================

type Photo = {
  id: string;
  url: string;
  thumbnail_url?: string;
};

type PublicPhotoGalleryProps = {
  photos: Photo[];
};

// ============================================================================
// Component
// ============================================================================

/**
 * Photo gallery for public quotes
 * Horizontal scrollable on mobile, grid on desktop
 * Lightbox on click with keyboard navigation
 */
export function PublicPhotoGallery({ photos }: PublicPhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % photos.length);
  };

  return (
    <>
      <section className="photo-gallery-section">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white print:text-black">
          Job Site Photos
        </h3>

        {/* Mobile: Horizontal Scroll */}
        <motion.div
          className="photo-strip -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:hidden"
          variants={listContainer}
          initial="hidden"
          animate="visible"
        >
          {photos.map((photo, i) => (
            <motion.button
              key={photo.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="photo-thumb relative shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
              style={{ width: "120px", height: "120px" }}
              variants={listItem}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt={`Job site photo ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </motion.button>
          ))}
        </motion.div>

        {/* Desktop: Grid */}
        <motion.div
          className="photo-grid hidden grid-cols-3 gap-4 sm:grid md:grid-cols-4"
          variants={listContainer}
          initial="hidden"
          animate="visible"
        >
          {photos.map((photo, i) => (
            <motion.button
              key={photo.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="photo-thumb relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 transition-transform hover:scale-105 dark:border-neutral-700 dark:bg-neutral-800"
              variants={listItem}
              transition={{
                delay: i * 0.05,
                duration: duration.normal,
                ease: ease.enter,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt={`Job site photo ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIndex(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelectedIndex(null);
              if (e.key === "ArrowLeft") handlePrevious();
              if (e.key === "ArrowRight") handleNext();
            }}
            tabIndex={-1}
            role="dialog"
            aria-label="Photo lightbox"
            ref={(el) => el?.focus()}
          >
            {/* Close Button */}
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(null);
              }}
              className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Close lightbox"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <X className="h-6 w-6" />
            </motion.button>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  aria-label="Previous photo"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  aria-label="Next photo"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <ChevronRight className="h-6 w-6" />
                </motion.button>
              </>
            )}

            {/* Image */}
            <motion.div
              className="relative max-h-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
              variants={scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
              key={selectedIndex}
            >
              <img
                src={photos[selectedIndex]?.url}
                alt={`Job site photo ${selectedIndex + 1}`}
                className="max-h-[90vh] w-auto rounded-lg object-contain"
              />

              {/* Counter */}
              <motion.div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {selectedIndex + 1} / {photos.length}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
