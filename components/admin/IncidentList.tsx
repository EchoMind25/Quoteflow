"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { IncidentTimeline } from "./IncidentTimeline";
import { IncidentUpdateForm } from "./IncidentUpdateForm";
import type { Incident, IncidentUpdate } from "@/types/database";

interface Props {
  incidents: Incident[];
  updatesByIncident: Record<string, IncidentUpdate[]>;
  adminId: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  investigating: { bg: "bg-red-500/20", text: "text-red-400" },
  identified: { bg: "bg-orange-500/20", text: "text-orange-400" },
  monitoring: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  resolved: { bg: "bg-green-500/20", text: "text-green-400" },
};

const SEVERITY_CONFIG: Record<string, { bg: string; text: string }> = {
  minor: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  major: { bg: "bg-orange-500/20", text: "text-orange-400" },
  critical: { bg: "bg-red-500/20", text: "text-red-400" },
};

export function IncidentList({ incidents, updatesByIncident, adminId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
        <p className="text-neutral-500">No incidents recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => {
        const statusCfg = STATUS_CONFIG[incident.status] ?? { bg: "bg-neutral-500/20", text: "text-neutral-400" };
        const sevCfg = SEVERITY_CONFIG[incident.severity] ?? { bg: "bg-neutral-500/20", text: "text-neutral-400" };
        const isExpanded = expanded === incident.id;
        const updates = updatesByIncident[incident.id] ?? [];

        return (
          <div
            key={incident.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden"
          >
            <div
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-neutral-800/50"
              onClick={() => setExpanded(isExpanded ? null : incident.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    INC-{String(incident.incident_number).padStart(3, "0")}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs ${sevCfg.bg} ${sevCfg.text}`}>
                    {incident.severity}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs ${statusCfg.bg} ${statusCfg.text}`}>
                    {incident.status}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{incident.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                  <span>
                    Started{" "}
                    {formatDistanceToNow(new Date(incident.started_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {incident.affected_components.length > 0 && (
                    <span>
                      Components: {incident.affected_components.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-neutral-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-neutral-800 p-4 space-y-4">
                <IncidentTimeline updates={updates} />
                {incident.status !== "resolved" && (
                  <IncidentUpdateForm
                    incidentId={incident.id}
                    currentStatus={incident.status}
                    adminId={adminId}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
