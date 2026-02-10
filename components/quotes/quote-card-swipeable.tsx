"use client";

import { Send, Archive } from "lucide-react";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import type { Database } from "@/types/database";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];

type SwipeableQuoteCardProps = {
  quote: Quote;
  onSend?: (quoteId: string) => Promise<void>;
  onArchive?: (quoteId: string) => Promise<void>;
  children: React.ReactNode;
};

/**
 * Swipeable wrapper for quote cards
 *
 * Usage:
 * <SwipeableQuoteCard quote={quote} onSend={handleSend} onArchive={handleArchive}>
 *   <QuoteCard quote={quote} />
 * </SwipeableQuoteCard>
 */
export function SwipeableQuoteCard({
  quote,
  onSend,
  onArchive,
  children,
}: SwipeableQuoteCardProps) {
  const canSend = quote.status === "draft";
  const canArchive = true; // All quotes can be archived

  return (
    <SwipeableCard
      rightAction={
        canSend && onSend
          ? {
              label: "Send",
              icon: <Send className="h-4 w-4" />,
              color: "#22c55e",
              onAction: async () => {
                await onSend(quote.id);
              },
            }
          : undefined
      }
      leftAction={
        canArchive && onArchive
          ? {
              label: "Archive",
              icon: <Archive className="h-4 w-4" />,
              color: "#ef4444",
              onAction: async () => {
                await onArchive(quote.id);
              },
            }
          : undefined
      }
    >
      {children}
    </SwipeableCard>
  );
}
