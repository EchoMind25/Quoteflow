"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Loader2, Plus, Search, User } from "lucide-react";
import { getAllCachedCustomers, cacheCustomer } from "@/lib/db/indexed-db";

// ============================================================================
// Types
// ============================================================================

export type CustomerResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
};

type CustomerSearchProps = {
  onSelect: (customer: CustomerResult) => void;
  onCreateNew: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_MS = 300;

// ============================================================================
// Component
// ============================================================================

export function CustomerSearch({
  onSelect,
  onCreateNew,
  placeholder = "Search by name, phone, email...",
  autoFocus = false,
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Debounced search ----
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    try {
      // First, try cached customers for instant results
      const cachedResults = await searchCachedCustomers(trimmed);
      if (!controller.signal.aborted && cachedResults.length > 0) {
        setResults(cachedResults);
        setIsOpen(true);
      }

      // Then fetch from server
      const response = await fetch(
        `/api/customers/search?q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      );

      if (!response.ok) throw new Error("Search failed");

      const serverResults: CustomerResult[] = await response.json();

      if (!controller.signal.aborted) {
        setResults(serverResults);
        setIsOpen(serverResults.length > 0 || trimmed.length > 0);
        setActiveIndex(-1);

        // Cache results in IndexedDB for offline access
        for (const customer of serverResults) {
          cacheCustomer(
            customer.id,
            customer as unknown as Record<string, unknown>,
          ).catch(() => {
            // Non-fatal
          });
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // On network error, fall back to cached results
      if (!controller.signal.aborted) {
        const cachedResults = await searchCachedCustomers(trimmed);
        setResults(cachedResults);
        setIsOpen(cachedResults.length > 0 || trimmed.length > 0);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // ---- Handle input change with debounce ----
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length === 0) {
        setResults([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, DEBOUNCE_MS);
    },
    [performSearch],
  );

  // ---- Keyboard navigation ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      // Total items = results.length + 1 ("create new" row)
      const totalItems = results.length + 1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < totalItems - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : totalItems - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            const selected = results[activeIndex];
            if (selected) {
              onSelect(selected);
              setQuery("");
              setIsOpen(false);
            }
          } else if (activeIndex === results.length) {
            onCreateNew();
            setQuery("");
            setIsOpen(false);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, results, activeIndex, onSelect, onCreateNew],
  );

  // ---- Click outside to close ----
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (query.trim().length > 0 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[hsl(var(--muted-foreground))]" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg"
        >
          {results.length > 0 && (
            <ul role="listbox">
              {results.map((customer, index) => {
                const name = [customer.first_name, customer.last_name]
                  .filter(Boolean)
                  .join(" ");
                const initials = [customer.first_name, customer.last_name]
                  .filter(Boolean)
                  .map((n) => n!.charAt(0).toUpperCase())
                  .join("");

                return (
                  <li
                    key={customer.id}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                      index === activeIndex
                        ? "bg-[hsl(var(--muted))]"
                        : "hover:bg-[hsl(var(--muted))]/50"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      onSelect(customer);
                      setQuery("");
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      {initials || <User className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        <HighlightMatch
                          text={name || "Unnamed"}
                          query={query}
                        />
                      </p>
                      <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                        {customer.email && (
                          <HighlightMatch
                            text={customer.email}
                            query={query}
                          />
                        )}
                        {customer.email && customer.phone && " \u00B7 "}
                        {customer.phone && (
                          <HighlightMatch
                            text={customer.phone}
                            query={query}
                          />
                        )}
                        {!customer.email &&
                          !customer.phone &&
                          customer.company_name && (
                            <HighlightMatch
                              text={customer.company_name}
                              query={query}
                            />
                          )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* No results message */}
          {results.length === 0 && query.trim().length > 0 && !isLoading && (
            <p className="px-3 py-3 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No customers found for &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Create new option */}
          <div
            role="option"
            aria-selected={activeIndex === results.length}
            className={`flex cursor-pointer items-center gap-3 border-t border-[hsl(var(--border))] px-3 py-2.5 transition-colors ${
              activeIndex === results.length
                ? "bg-[hsl(var(--muted))]"
                : "hover:bg-[hsl(var(--muted))]/50"
            }`}
            onMouseEnter={() => setActiveIndex(results.length)}
            onClick={() => {
              onCreateNew();
              setQuery("");
              setIsOpen(false);
            }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Plus className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
              Create new customer
              {query.trim() && (
                <span className="font-normal text-[hsl(var(--muted-foreground))]">
                  {" "}
                  &ldquo;{query.trim()}&rdquo;
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Highlight match sub-component
// ============================================================================

function HighlightMatch({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) return <>{text}</>;

  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Build a regex that matches any of the search words
  const escapedWords = words.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`(${escapedWords.join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = words.some(
          (w) => part.toLowerCase() === w.toLowerCase(),
        );
        return isMatch ? (
          <mark
            key={i}
            className="bg-amber-200 text-inherit dark:bg-amber-800"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

// ============================================================================
// IndexedDB search for offline/instant results
// ============================================================================

async function searchCachedCustomers(
  query: string,
): Promise<CustomerResult[]> {
  try {
    const allCached = await getAllCachedCustomers();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);

    return allCached
      .filter((cached) => {
        const data = cached.customer_data;
        const searchable = [
          data.first_name,
          data.last_name,
          data.email,
          data.phone,
          data.company_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return words.every((word) => searchable.includes(word));
      })
      .slice(0, 15)
      .map((cached) => ({
        id: cached.id,
        first_name: (cached.customer_data.first_name as string) ?? null,
        last_name: (cached.customer_data.last_name as string) ?? null,
        email: (cached.customer_data.email as string) ?? null,
        phone: (cached.customer_data.phone as string) ?? null,
        company_name: (cached.customer_data.company_name as string) ?? null,
      }));
  } catch {
    return [];
  }
}
