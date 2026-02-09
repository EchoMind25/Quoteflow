// components/ui/pull-to-refresh.tsx
"use client";

import {
  useCallback,
  useRef,
  useState,
  type TouchEvent,
  type ReactNode,
} from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const PULL_THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (isRefreshing) return;

      // Only activate when scrolled to the top
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      if (scrollTop > 0) return;

      const touch = e.touches[0];
      if (!touch) return;

      startYRef.current = touch.clientY;
      isPullingRef.current = true;
    },
    [isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!isPullingRef.current || isRefreshing) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = touch.clientY - startYRef.current;

      // Only pull down
      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      // Diminishing returns for pull distance (resistance effect)
      const dampened = Math.min(deltaY * 0.5, PULL_THRESHOLD * 1.5);
      setPullDistance(dampened);
    },
    [isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || isRefreshing) return;

    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.5);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const indicatorOpacity = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden"
        style={{
          height: `${pullDistance}px`,
          transition: isPullingRef.current ? "none" : "height 200ms ease-out",
        }}
        aria-hidden="true"
      >
        <RefreshCw
          className="h-6 w-6 text-[hsl(var(--muted-foreground))]"
          style={{
            opacity: indicatorOpacity,
            transform: `rotate(${pullDistance * 3}deg)`,
            animation: isRefreshing ? "spin 1s linear infinite" : "none",
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
          transition: isPullingRef.current ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
