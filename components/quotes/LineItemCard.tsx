"use client";

/**
 * Line Item Card - Draggable, editable quote line item
 * Supports inline editing, swipe-to-delete, and AI reasoning display
 */

import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { GripVertical, ChevronDown, ChevronUp, X, Pencil, Sparkles } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { haptic } from "@/lib/haptics";
import { duration } from "@/lib/design-system/motion";

// ============================================================================
// Types
// ============================================================================

export interface LineItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  price_cents: number;
  confidence: "high" | "medium" | "low";
  ai_reasoning?: string;
  is_edited?: boolean;
}

interface LineItemCardProps {
  item: LineItem;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LineItemCard({
  item,
  onUpdate,
  onDelete,
  isDragging = false,
}: LineItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const reducedMotion = useReducedMotion();
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedDescription, setEditedDescription] = useState(item.description);
  const [editedQuantity, setEditedQuantity] = useState(item.quantity.toString());
  const [editedPrice, setEditedPrice] = useState(
    (item.price_cents / 100).toFixed(2)
  );

  // Confidence badge styling
  const confidenceStyles = {
    high: {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-800 dark:text-green-300",
      border: "border-green-200 dark:border-green-800",
    },
    medium: {
      bg: "bg-yellow-100 dark:bg-yellow-900/20",
      text: "text-yellow-800 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-800",
    },
    low: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-800 dark:text-red-300",
      border: "border-red-200 dark:border-red-800",
    },
  };

  const confidenceStyle = confidenceStyles[item.confidence];

  // Handle swipe to delete
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    // If swiped left more than 100px, trigger delete
    if (info.offset.x < -100) {
      haptic.delete();
      onDelete(item.id);
    }
  };

  // Handle save edits
  const handleSave = () => {
    const updates: Partial<LineItem> = {
      title: editedTitle,
      description: editedDescription,
      quantity: parseFloat(editedQuantity) || item.quantity,
      price_cents: Math.round((parseFloat(editedPrice) || 0) * 100),
      is_edited: true,
    };

    onUpdate(item.id, updates);
    setIsEditing(false);
    haptic.success();
  };

  // Handle cancel edits
  const handleCancel = () => {
    setEditedTitle(item.title);
    setEditedDescription(item.description);
    setEditedQuantity(item.quantity.toString());
    setEditedPrice((item.price_cents / 100).toFixed(2));
    setIsEditing(false);
    haptic.light();
  };

  const formattedPrice = `$${(item.price_cents / 100).toFixed(2)}`;

  return (
    <motion.div
      layout={!reducedMotion}
      drag={!isEditing && !reducedMotion ? "x" : false}
      dragConstraints={{ left: -150, right: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      className={`relative overflow-hidden rounded-lg border bg-white transition-shadow dark:bg-gray-800 ${
        isEditing
          ? "border-primary-500 shadow-lg ring-2 ring-primary-200 dark:ring-primary-800"
          : "border-[hsl(var(--border))] shadow-sm hover:shadow-md"
      } ${isDragging ? "opacity-50" : ""}`}
      whileHover={reducedMotion || isEditing ? {} : { scale: 1.01 }}
      animate={reducedMotion ? {} : isEditing ? { scale: 1.02 } : { scale: 1 }}
      transition={reducedMotion ? { duration: 0.01 } : { type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Delete hint (shown when swiping) */}
      <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2 text-red-600">
        <X className="h-5 w-5" />
        <span className="text-sm font-medium">Delete</span>
      </div>

      <div className="relative p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {!isEditing && (
            <button
              type="button"
              className="mt-1 cursor-grab text-[hsl(var(--muted-foreground))] active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-base font-semibold focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Line item title"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                  {item.title}
                </h3>
                {item.is_edited && (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    (Edited)
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Description"
                rows={2}
              />
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {item.description}
              </p>
            )}

            {/* Quantity & Unit */}
            <div className="flex items-center gap-2 text-sm">
              {isEditing ? (
                <>
                  <input
                    type="number"
                    value={editedQuantity}
                    onChange={(e) => setEditedQuantity(e.target.value)}
                    className="w-20 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Qty"
                    step="0.01"
                  />
                  <span className="text-[hsl(var(--muted-foreground))]">
                    {item.unit}
                  </span>
                </>
              ) : (
                <span className="text-[hsl(var(--muted-foreground))]">
                  {item.quantity} {item.unit}
                </span>
              )}
            </div>
          </div>

          {/* Price & Actions */}
          <div className="flex flex-col items-end gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  $
                </span>
                <input
                  type="number"
                  value={editedPrice}
                  onChange={(e) => setEditedPrice(e.target.value)}
                  className="w-24 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-right text-lg font-semibold focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            ) : (
              <>
                <span className="text-lg font-semibold text-[hsl(var(--foreground))]">
                  {formattedPrice}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    haptic.light();
                  }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </>
            )}

            {/* Confidence badge */}
            <div
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceStyle.bg} ${confidenceStyle.text} ${confidenceStyle.border}`}
            >
              <Sparkles className="h-3 w-3" />
              {item.confidence}
            </div>
          </div>
        </div>

        {/* Edit actions */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex gap-2 border-t border-[hsl(var(--border))] pt-3"
          >
            <motion.button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              whileTap={{ scale: 0.98 }}
            >
              Save Changes
            </motion.button>
            <motion.button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          </motion.div>
        )}

        {/* AI Reasoning (expandable) */}
        {item.ai_reasoning && !isEditing && (
          <div className="mt-3 border-t border-[hsl(var(--border))] pt-3">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(!isExpanded);
                haptic.light();
              }}
              className="flex w-full items-center justify-between text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-500" />
                AI Reasoning
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: duration.fast }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {item.ai_reasoning}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
