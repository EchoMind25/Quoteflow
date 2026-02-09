// components/quotes/swipeable-quote-item.tsx
"use client";

import { useCallback, useRef, useState, type TouchEvent } from "react";
import { Trash2 } from "lucide-react";
import { haptics } from "@/lib/utils/haptics";

interface SwipeableQuoteItemProps {
  quote: { id: string; [key: string]: unknown };
  onDelete: (id: string) => void;
  children?: React.ReactNode;
}

const MAX_SWIPE = -100;
const DELETE_THRESHOLD = -50;

export function SwipeableQuoteItem({
  quote,
  onDelete,
  children,
}: SwipeableQuoteItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const lockedAxisRef = useRef<"horizontal" | "vertical" | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = 0;
    lockedAxisRef.current = null;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    // Lock axis after 10px of movement
    if (lockedAxisRef.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      lockedAxisRef.current =
        Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    if (lockedAxisRef.current !== "horizontal") return;

    // Left swipe only: clamp between MAX_SWIPE and 0
    const clamped = Math.max(MAX_SWIPE, Math.min(0, deltaX));
    currentXRef.current = clamped;
    setOffsetX(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);

    if (currentXRef.current <= DELETE_THRESHOLD) {
      haptics.medium();
      onDelete(quote.id);
    }

    setOffsetX(0);
    currentXRef.current = 0;
    lockedAxisRef.current = null;
  }, [onDelete, quote.id]);

  return (
    <div className="relative overflow-hidden" role="listitem">
      {/* Red delete background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500"
        style={{ width: `${Math.abs(offsetX)}px` }}
        aria-hidden="true"
      >
        {Math.abs(offsetX) > 30 && (
          <Trash2
            className="h-5 w-5 text-white"
            style={{
              opacity: Math.min(1, Math.abs(offsetX) / Math.abs(DELETE_THRESHOLD)),
            }}
          />
        )}
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 200ms ease-out",
        }}
        className="relative bg-[hsl(var(--background))]"
        aria-label={`Swipe left to delete quote ${quote.id}`}
      >
        {children}
      </div>
    </div>
  );
}
