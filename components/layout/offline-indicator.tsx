"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, Cloud } from "lucide-react";
import { duration, ease } from "@/lib/design-system/motion";

type OfflineStatus = {
  isOnline: boolean;
  pendingSyncs: number;
};

/**
 * Hook to track online/offline status and pending syncs
 */
function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    // Update online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    // Initial check
    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Check pending syncs from IndexedDB
    const checkPendingSyncs = async () => {
      try {
        const { getQueueCount } = await import("@/lib/db/indexed-db");
        const count = await getQueueCount();
        setPendingSyncs(count);
      } catch (error) {
        // Silently fail - IndexedDB might not be available
        setPendingSyncs(0);
      }
    };

    // Check immediately and every 5 seconds
    checkPendingSyncs();
    const interval = setInterval(checkPendingSyncs, 5000);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pendingSyncs };
}

// ============================================================================
// OFFLINE INDICATOR
// ============================================================================

export function OfflineIndicator() {
  const { isOnline, pendingSyncs } = useOfflineStatus();
  const [showOnlineFlash, setShowOnlineFlash] = useState(false);

  // Show brief "back online" flash when reconnecting
  useEffect(() => {
    if (isOnline && pendingSyncs === 0) {
      setShowOnlineFlash(true);
      const timer = setTimeout(() => setShowOnlineFlash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSyncs]);

  return (
    <>
      {/* Offline bar */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: duration.normal,
              ease: ease.default,
            }}
            className="fixed top-14 left-0 right-0 z-40 bg-amber-500/90 backdrop-blur-sm"
            style={{
              marginTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white">
              {/* Pulsing wifi icon */}
              <motion.div
                animate={{
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: ease.default,
                }}
              >
                <WifiOff className="h-4 w-4" />
              </motion.div>

              <span>Working offline</span>

              {/* Pending sync badge */}
              {pendingSyncs > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs"
                >
                  {pendingSyncs} pending
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back online flash */}
      <AnimatePresence>
        {showOnlineFlash && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: duration.fast,
              ease: ease.enter,
            }}
            className="fixed top-14 left-0 right-0 z-40 bg-green-500/90 backdrop-blur-sm"
            style={{
              marginTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white">
              <Wifi className="h-4 w-4" />
              <span>Back online</span>
              <Cloud className="h-4 w-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
