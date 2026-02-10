"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface StatusContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const StatusContext = createContext<StatusContextType | null>(null);

export function StatusProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (priority === "assertive") {
        setAssertiveMessage("");
        // Force re-render to announce
        setTimeout(() => setAssertiveMessage(message), 50);
      } else {
        setPoliteMessage("");
        setTimeout(() => setPoliteMessage(message), 50);
      }
    },
    [],
  );

  return (
    <StatusContext.Provider value={{ announce }}>
      {children}

      {/* Polite announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements (interrupts) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </StatusContext.Provider>
  );
}

export function useStatusAnnouncer() {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error("useStatusAnnouncer must be used within StatusProvider");
  }
  return context;
}
