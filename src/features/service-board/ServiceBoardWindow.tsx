"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SERVICE_BOARD_DEMO_TASKS,
  SERVICE_BOARD_STATUS_LABELS,
  getServiceBoardTaskCounts,
  type ServiceBoardTask,
  type ServiceBoardTaskStatus,
} from "./service-board-demo-data";
import { ServiceBoardEmptyState, ServiceBoardErrorState } from "./ServiceBoardStates";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";

type ServiceBoardFilter = "all" | ServiceBoardTaskStatus;

const FILTERS: Array<{ id: ServiceBoardFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "booked", label: "Booked" },
];

export function ServiceBoardWindow({ setTitle }: NexusWindowAppProps) {
  const [filter, setFilter] = useState<ServiceBoardFilter>("all");
  const [tasks] = useState<ServiceBoardTask[]>(SERVICE_BOARD_DEMO_TASKS);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    setTitle("Service Board");
  }, [setTitle]);

  const counts = useMemo(() => getServiceBoardTaskCounts(tasks), [tasks]);
  const visibleTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  if (error) {
    return <ServiceBoardErrorState message={error} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Service Board</h2>
              <span className="rounded border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-100">
                MVP prototype
              </span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              Local service requests for scoped tasks, quick offers, and booking intent.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right text-xs">
            <Metric label="Open" value={counts.open} />
            <Metric label="Shortlisted" value={counts.shortlisted} />
            <Metric label="Booked" value={counts.booked} />
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 px-4 py-2">
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <button
              className={[
                "h-8 shrink-0 rounded border px-3 text-xs font-medium transition",
                selected
                  ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white",
              ].join(" ")}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {visibleTasks.length === 0 ? (
        <ServiceBoardEmptyState />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleTasks.map((task) => (
              <ServiceBoardTaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-16 rounded border border-white/10 bg-white/[0.04] px-2 py-1">
      <div className="text-sm font-semibold text-white">{value}</div>
      <div className="text-[10px] uppercase text-white/40">{label}</div>
    </div>
  );
}

function ServiceBoardTaskCard({ task }: { task: ServiceBoardTask }) {
  const statusLabel = SERVICE_BOARD_STATUS_LABELS[task.status];

  return (
    <article className="rounded-md border border-white/10 bg-white/[0.04] p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-white/40">
            Local service requests
          </p>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-white">
            {task.title}
          </h3>
        </div>
        <span className="shrink-0 rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/70">
          {statusLabel}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-white/58">{task.description}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <TaskFact label="Budget" value={`${task.budgetCredits} cr`} />
        <TaskFact label="Due" value={task.dueLabel} />
        <TaskFact label="Offers" value={`${task.offerCount}`} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.skills.map((skill) => (
          <span
            className="rounded border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-white/55"
            key={skill}
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
        <span className="text-white/45">Posted by {task.posterName}</span>
        <span className="font-medium text-emerald-100">
          Best offer {task.bestOfferCredits ?? task.budgetCredits} cr
        </span>
      </div>
    </article>
  );
}

function TaskFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 px-2 py-1">
      <div className="text-[10px] uppercase text-white/35">{label}</div>
      <div className="truncate text-white/78">{value}</div>
    </div>
  );
}
