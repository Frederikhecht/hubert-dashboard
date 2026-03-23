"use client";

import { useEffect, useState, useRef } from "react";

const GATEWAY_URL = "ws://localhost:18789";
const GATEWAY_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_TOKEN ?? "";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type View = "overview" | "calendar" | "agents" | "channels" | "cron" | "docs" | "board" | "memory";

interface Agent {
  id: string;
  name?: string;
  model?: string;
  identity?: {
    name?: string;
    emoji?: string;
    theme?: string;
  };
}

interface Channel {
  name: string;
  enabled: boolean;
}

interface CronJob {
  id: string;
  name: string;
  agentId?: string;
  enabled: boolean;
  schedule: {
    kind: "at" | "every" | "cron";
    at?: string;
    everyMs?: number;
    anchorMs?: number;
    expr?: string;
    tz?: string;
  };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastRunStatus?: "ok" | "error" | "skipped";
    runningAtMs?: number;
    lastError?: string;
    consecutiveErrors?: number;
  };
}

interface DashboardData {
  agents: Agent[];
  channels: Channel[];
  cronJobs: CronJob[];
}

// ---- Icons (inline SVG) ----
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="12" rx="2" />
      <line x1="1" y1="7" x2="15" y2="7" />
      <line x1="5" y1="1" x2="5" y2="5" />
      <line x1="11" y1="1" x2="11" y2="5" />
    </svg>
  );
}

function IconAgent() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" />
    </svg>
  );
}

function IconChannel() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12v7a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
      <path d="M5 4V2h6v2" />
      <line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="11" x2="8" y2="11" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="8,4 8,8 11,10" />
    </svg>
  );
}

function IconMemory() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="8" cy="5" rx="6" ry="3" />
      <path d="M2 5v3c0 1.657 2.686 3 6 3s6-1.343 6-3V5" />
      <path d="M2 8v3c0 1.657 2.686 3 6 3s6-1.343 6-3V8" />
    </svg>
  );
}

function IconBoard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="4" height="14" rx="1" />
      <rect x="6" y="1" width="4" height="9" rx="1" />
      <rect x="11" y="1" width="4" height="11" rx="1" />
    </svg>
  );
}

function IconDocs() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M10 2v3h3" />
      <line x1="5" y1="7" x2="11" y2="7" />
      <line x1="5" y1="10" x2="11" y2="10" />
      <line x1="5" y1="13" x2="8" y2="13" />
    </svg>
  );
}

// ---- Status badge ----
function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`}
    />
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      <StatusDot ok={ok} />
      {label}
    </span>
  );
}

// ---- Sidebar ----
const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <IconGrid /> },
  { id: "calendar", label: "Calendar", icon: <IconCalendar /> },
  { id: "agents", label: "Agents", icon: <IconAgent /> },
  { id: "channels", label: "Channels", icon: <IconChannel /> },
  { id: "cron", label: "Cron Jobs", icon: <IconClock /> },
  { id: "board", label: "Task Board", icon: <IconBoard /> },
  { id: "memory", label: "Memory", icon: <IconMemory /> },
  { id: "docs", label: "Docs", icon: <IconDocs /> },
];

function Sidebar({
  view,
  setView,
  status,
}: {
  view: View;
  setView: (v: View) => void;
  status: ConnectionStatus;
}) {
  const connLabel =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting…"
        : status === "error"
          ? "Error"
          : "Disconnected";

  return (
    <aside className="flex h-screen w-52 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
          OpenClaw
        </span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          MC
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              view === item.id
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
            }`}
          >
            <span className="opacity-70">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Connection status */}
      <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <StatusDot ok={status === "connected"} />
          <span>{connLabel}</span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
          localhost:18789
        </p>
      </div>
    </aside>
  );
}

// ---- Calendar View ----
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatSchedule(job: CronJob): string {
  const { kind } = job.schedule;
  if (kind === "at") return job.schedule.at ?? "once";
  if (kind === "cron") return job.schedule.expr ?? "cron";
  if (kind === "every") {
    const ms = job.schedule.everyMs ?? 0;
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `every ${mins}m`;
    const hrs = Math.round(ms / 3600000);
    if (hrs < 24) return `every ${hrs}h`;
    return `every ${Math.round(ms / 86400000)}d`;
  }
  return kind;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function JobDot({ status }: { status?: "ok" | "error" | "skipped" | "running" }) {
  const color =
    status === "ok"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : status === "running"
          ? "bg-blue-500 animate-pulse"
          : "bg-zinc-400";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function CalendarView({ jobs }: { jobs: CronJob[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map day-of-month → jobs with events on that day
  const jobsByDay = new Map<number, { job: CronJob; type: "next" | "last" }[]>();

  function addToDay(day: number, job: CronJob, type: "next" | "last") {
    if (!jobsByDay.has(day)) jobsByDay.set(day, []);
    jobsByDay.get(day)!.push({ job, type });
  }

  for (const job of jobs) {
    if (job.state.nextRunAtMs) {
      const d = new Date(job.state.nextRunAtMs);
      if (d.getFullYear() === year && d.getMonth() === month) {
        addToDay(d.getDate(), job, "next");
      }
    }
    if (job.state.lastRunAtMs) {
      const d = new Date(job.state.lastRunAtMs);
      if (d.getFullYear() === year && d.getMonth() === month) {
        addToDay(d.getDate(), job, "last");
      }
    }
    // one-time "at" jobs without a state yet
    if (job.schedule.kind === "at" && job.schedule.at && !job.state.nextRunAtMs) {
      const d = new Date(job.schedule.at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        addToDay(d.getDate(), job, "next");
      }
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const selectedEvents = selectedDay ? (jobsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className="flex gap-6">
      {/* Calendar grid */}
      <div className="flex-1 min-w-0">
        {/* Month header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8l4-4" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 12l4-4-4-4" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7 gap-px">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-medium text-zinc-400">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {cells.map((day, i) => {
            const events = day ? (jobsByDay.get(day) ?? []) : [];
            const nextEvents = events.filter(e => e.type === "next");
            const selected = day === selectedDay;
            return (
              <div
                key={i}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={`min-h-[72px] bg-white p-1.5 dark:bg-zinc-900 ${
                  day ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/80" : ""
                } ${selected ? "ring-2 ring-inset ring-blue-500" : ""}`}
              >
                {day && (
                  <>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday(day)
                          ? "bg-blue-600 text-white"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {day}
                    </span>
                    {nextEvents.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {nextEvents.slice(0, 3).map(({ job }, idx) => (
                          <div
                            key={idx}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${
                              job.enabled
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                            }`}
                          >
                            {job.name || job.id}
                          </div>
                        ))}
                        {nextEvents.length > 3 && (
                          <div className="px-1 text-[10px] text-zinc-400">
                            +{nextEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div className="w-72 shrink-0">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {selectedDay ? (
            <>
              <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {MONTH_NAMES[month]} {selectedDay}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-zinc-400">No events</p>
              ) : (
                <ul className="space-y-3">
                  {selectedEvents.map(({ job, type }, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                            {job.name || job.id}
                          </p>
                          {job.agentId && (
                            <p className="text-xs text-zinc-400">{job.agentId}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge ok={job.enabled} label={job.enabled ? "On" : "Off"} />
                          <span className={`text-[10px] ${type === "next" ? "text-blue-500" : "text-zinc-400"}`}>
                            {type === "next" ? "upcoming" : "last run"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                        {type === "next" && job.state.nextRunAtMs && (
                          <span>{formatTime(job.state.nextRunAtMs)}</span>
                        )}
                        {type === "last" && job.state.lastRunAtMs && (
                          <span>{formatTime(job.state.lastRunAtMs)}</span>
                        )}
                        <span className="text-zinc-300 dark:text-zinc-700">·</span>
                        <span className="font-mono">{formatSchedule(job)}</span>
                        {job.state.lastRunStatus && (
                          <>
                            <span className="text-zinc-300 dark:text-zinc-700">·</span>
                            <JobDot
                              status={
                                job.state.runningAtMs
                                  ? "running"
                                  : job.state.lastRunStatus
                              }
                            />
                            <span>{job.state.runningAtMs ? "running" : job.state.lastRunStatus}</span>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-400">Select a day to see events</p>
          )}
        </div>

        {/* Upcoming jobs legend */}
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Next Up
          </h3>
          {jobs.filter(j => j.state.nextRunAtMs).length === 0 ? (
            <p className="text-sm text-zinc-400">No upcoming jobs</p>
          ) : (
            <ul className="space-y-2">
              {jobs
                .filter(j => j.state.nextRunAtMs)
                .sort((a, b) => (a.state.nextRunAtMs ?? 0) - (b.state.nextRunAtMs ?? 0))
                .slice(0, 6)
                .map(job => (
                  <li key={job.id} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">
                        {job.name || job.id}
                      </span>
                      {job.agentId && (
                        <span className="ml-1 text-zinc-400">({job.agentId})</span>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 font-mono text-zinc-400">
                      {new Date(job.state.nextRunAtMs!).toLocaleDateString([], {
                        month: "short", day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Overview cards ----
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

function OverviewView({
  data,
  status,
}: {
  data: DashboardData;
  status: ConnectionStatus;
}) {
  const connLabel =
    status === "connected" ? "Connected"
    : status === "connecting" ? "Connecting…"
    : status === "error" ? "Error"
    : "Disconnected";

  const upcomingJobs = data.cronJobs
    .filter(j => j.state.nextRunAtMs)
    .sort((a, b) => (a.state.nextRunAtMs ?? 0) - (b.state.nextRunAtMs ?? 0))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Agents row */}
      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Agents
        </p>
        {data.agents.length === 0 ? (
          <p className="text-sm text-zinc-400">No agents configured</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.agents.map(a => {
              const displayName = a.identity?.name ?? a.name ?? a.id;
              const emoji = a.identity?.emoji;
              const initials = a.id.slice(0, 2).toUpperCase();
              const modelShort = a.model?.split("/").pop() ?? "—";
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm dark:bg-zinc-100">
                    {emoji
                      ? <span>{emoji}</span>
                      : <span className="text-xs font-bold text-white dark:text-zinc-900">{initials}</span>
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{displayName}</p>
                    {displayName !== a.id && (
                      <p className="font-mono text-[10px] text-zinc-400">{a.id}</p>
                    )}
                    <p className="font-mono text-[11px] text-zinc-400">{modelShort}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Gateway */}
        <Card title="Gateway">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Host</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">localhost:18789</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status</span>
              <StatusBadge ok={status === "connected"} label={connLabel} />
            </div>
          </div>
        </Card>

        {/* Channels */}
        <Card title={`Channels (${data.channels.length})`}>
          {data.channels.length === 0 ? (
            <p className="text-sm text-zinc-400">No channels</p>
          ) : (
            <ul className="space-y-2">
              {data.channels.map(ch => (
                <li key={ch.name} className="flex justify-between text-sm">
                  <span className="capitalize font-medium text-zinc-800 dark:text-zinc-200">{ch.name}</span>
                  <StatusBadge ok={ch.enabled} label={ch.enabled ? "Enabled" : "Disabled"} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Upcoming cron */}
        <Card title={`Cron (${data.cronJobs.length} jobs)`}>
          {upcomingJobs.length === 0 ? (
            <p className="text-sm text-zinc-400">No upcoming jobs</p>
          ) : (
            <ul className="space-y-2">
              {upcomingJobs.map(job => (
                <li key={job.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {job.name || job.id}
                    </span>
                    <StatusBadge ok={job.enabled} label={job.enabled ? "On" : "Off"} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                    <span className="font-mono">{formatSchedule(job)}</span>
                    {job.state.nextRunAtMs && (
                      <>
                        <span>·</span>
                        <span>
                          next{" "}
                          {new Date(job.state.nextRunAtMs).toLocaleDateString([], {
                            month: "short", day: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---- Agents view ----
function AgentsView({ agents }: { agents: Agent[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
              ID
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Model
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-5 py-8 text-center text-sm text-zinc-400">
                No agents configured
              </td>
            </tr>
          ) : (
            agents.map(a => (
              <tr key={a.id} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                <td className="px-5 py-3 font-medium text-zinc-800 dark:text-zinc-200">{a.id}</td>
                <td className="px-5 py-3 font-mono text-xs text-zinc-500">{a.model}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- Channels view ----
function ChannelsView({ channels }: { channels: Channel[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Channel
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {channels.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-5 py-8 text-center text-sm text-zinc-400">
                No channels configured
              </td>
            </tr>
          ) : (
            channels.map(ch => (
              <tr key={ch.name} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                <td className="px-5 py-3 font-medium capitalize text-zinc-800 dark:text-zinc-200">{ch.name}</td>
                <td className="px-5 py-3">
                  <StatusBadge ok={ch.enabled} label={ch.enabled ? "Enabled" : "Disabled"} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- Cron view ----
function CronView({ jobs }: { jobs: CronJob[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Name</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Agent</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Schedule</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Next Run</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Last Run</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-400">
                No cron jobs scheduled
              </td>
            </tr>
          ) : (
            jobs.map(job => (
              <tr key={job.id} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                <td className="px-5 py-3">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{job.name || job.id}</span>
                  {job.name && <span className="ml-1.5 font-mono text-xs text-zinc-400">{job.id}</span>}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-zinc-500">{job.agentId ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-xs text-zinc-500">{formatSchedule(job)}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">
                  {job.state.nextRunAtMs
                    ? new Date(job.state.nextRunAtMs).toLocaleString([], {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-5 py-3 text-xs text-zinc-500">
                  {job.state.lastRunAtMs
                    ? new Date(job.state.lastRunAtMs).toLocaleString([], {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge ok={job.enabled} label={job.enabled ? "On" : "Off"} />
                    {job.state.runningAtMs && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                        Running
                      </span>
                    )}
                    {job.state.lastRunStatus && !job.state.runningAtMs && (
                      <JobDot status={job.state.lastRunStatus} />
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- Task Board ----
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "backlog" | "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  agentId?: string;
  labels?: string[];
  url?: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
}

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "backlog",     label: "Backlog" },
  { id: "todo",        label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "review",      label: "Review" },
  { id: "done",        label: "Done" },
];

const PRIORITY_META: Record<Task["priority"], { label: string; color: string; dot: string }> = {
  low:    { label: "Low",    color: "text-zinc-400",  dot: "bg-zinc-300" },
  medium: { label: "Med",    color: "text-blue-500",  dot: "bg-blue-400" },
  high:   { label: "High",   color: "text-amber-500", dot: "bg-amber-400" },
  urgent: { label: "Urgent", color: "text-red-500",   dot: "bg-red-500" },
};

function PriorityDot({ priority }: { priority: Task["priority"] }) {
  const meta = PRIORITY_META[priority];
  return <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} title={meta.label} />;
}

function NewTaskForm({
  defaultStatus,
  agents,
  onSave,
  onCancel,
}: {
  defaultStatus: Task["status"];
  agents: Agent[];
  onSave: (t: Task) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [agentId, setAgentId] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          status: defaultStatus,
          priority,
          agentId: agentId || undefined,
          url: url.trim() || undefined,
        }),
      });
      const task = await res.json() as Task;
      onSave(task);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
      <input
        autoFocus
        type="text"
        placeholder="Task title…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      />
      <textarea
        placeholder="Description (optional)…"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        className="mb-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      />
      <div className="mb-2 flex gap-2">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Task["priority"])}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          value={agentId}
          onChange={e => setAgentId(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="">No agent</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
        </select>
      </div>
      <input
        type="text"
        placeholder="URL (optional)"
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="mb-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add task"}
        </button>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  onDelete,
  onDragStart,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "done";

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      className="group cursor-grab rounded-xl border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900"
    >
      {/* Top row */}
      <div className="flex items-start gap-2">
        <PriorityDot priority={task.priority} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-200">
            {task.title}
          </p>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="invisible shrink-0 rounded p-0.5 text-zinc-300 hover:text-red-400 group-hover:visible dark:text-zinc-600"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
          </svg>
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <button
          onClick={() => setExpanded(x => !x)}
          className="mt-1 w-full text-left text-xs leading-relaxed text-zinc-400 hover:text-zinc-500"
        >
          {expanded ? task.description : (
            task.description.length > 80
              ? task.description.slice(0, 80) + "…"
              : task.description
          )}
        </button>
      )}

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.agentId && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {task.agentId}
          </span>
        )}
        {(task.labels ?? []).map(l => (
          <span key={l} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {l}
          </span>
        ))}
        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto rounded p-0.5 text-zinc-300 hover:text-blue-500 dark:text-zinc-600"
            title={task.url}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" />
              <polyline points="10,1 15,1 15,6" />
              <line x1="7" y1="9" x2="15" y2="1" />
            </svg>
          </a>
        )}
        {overdue && task.dueAt && (
          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
            due {new Date(task.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

function BoardColumn({
  col,
  tasks,
  agents,
  onAdd,
  onDelete,
  onDragStart,
  onDrop,
}: {
  col: { id: Task["status"]; label: string };
  tasks: Task[];
  agents: Agent[];
  onAdd: (t: Task) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (status: Task["status"]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`flex h-full w-64 shrink-0 flex-col rounded-xl border transition-colors ${
        over
          ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
      }`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(col.id); }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{col.label}</span>
          <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          title="Add task"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" />
          </svg>
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {adding && (
          <NewTaskForm
            defaultStatus={col.id}
            agents={agents}
            onSave={t => { onAdd(t); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
            onDragStart={onDragStart}
          />
        ))}
        {tasks.length === 0 && !adding && (
          <div className="flex h-16 items-center justify-center">
            <p className="text-xs text-zinc-300 dark:text-zinc-700">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardView({ agents }: { agents: Agent[] }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const draggingId = useRef<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      setTasks(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleDragStart(e: React.DragEvent, id: string) {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(status: Task["status"]) {
    const id = draggingId.current;
    draggingId.current = null;
    if (!id) return;

    // Optimistic update
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t));

    await fetch(`/api/tasks?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleDelete(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id));
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  }

  function handleAdd(task: Task) {
    setTasks(ts => [...ts, task]);
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>;
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-4">
      {COLUMNS.map(col => (
        <BoardColumn
          key={col.id}
          col={col}
          tasks={tasks.filter(t => t.status === col.id)}
          agents={agents}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}

// ---- Memory view ----
const CORE_FILES = ["SOUL.md", "USER.md", "AGENTS.md", "TOOLS.md", "HEARTBEAT.md", "IDENTITY.md"];

const FILE_META: Record<string, { label: string; desc: string; color: string }> = {
  "SOUL.md":      { label: "Soul",      desc: "Agent identity & personality",     color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  "USER.md":      { label: "User",      desc: "User preferences & context",       color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  "AGENTS.md":    { label: "Agents",    desc: "Operational rules & orchestration", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  "TOOLS.md":     { label: "Tools",     desc: "Tool integration notes",           color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  "HEARTBEAT.md": { label: "Heartbeat", desc: "Proactive task checklist",         color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  "IDENTITY.md":  { label: "Identity",  desc: "Agent identity card",              color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

function MemoryView() {
  const [tab, setTab] = useState<"files" | "logs">("files");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<{ date: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string>("USER.md");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/memories?type=all");
      const data = await res.json() as { files: Record<string, string>; logs: { date: string; content: string }[] };
      setFiles(data.files ?? {});
      setLogs(data.logs ?? []);
      if ((data.logs ?? []).length > 0 && !selectedLog) {
        setSelectedLog(data.logs[0].date);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveFile() {
    setSaving(true);
    try {
      await fetch(`/api/memories?file=${selectedFile}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      setFiles(f => ({ ...f, [selectedFile]: editContent }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function appendEntry() {
    if (!newEntry.trim()) return;
    setAddingEntry(true);
    try {
      await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newEntry.trim() }),
      });
      setNewEntry("");
      await load();
      // select today
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setSelectedLog(todayStr);
    } finally {
      setAddingEntry(false);
    }
  }

  function startEdit() {
    setEditContent(files[selectedFile] ?? "");
    setEditing(true);
  }

  const selectedLogContent = logs.find(l => l.date === selectedLog)?.content ?? "";

  // Parse log bullets
  function parseBullets(content: string) {
    return content
      .split("\n")
      .filter(l => l.trim().startsWith("- "))
      .map(l => l.trim().slice(2));
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  const isToday = (dateStr: string) => {
    const today = new Date();
    const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return dateStr === t;
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>;
  }

  return (
    <div className="flex h-full gap-5">
      {/* Left panel */}
      <div className="flex w-60 shrink-0 flex-col gap-3">
        {/* Tabs */}
        <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
          {(["files", "logs"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t === "files" ? "Core Files" : "Daily Logs"}
            </button>
          ))}
        </div>

        {tab === "files" ? (
          <ul className="space-y-1">
            {CORE_FILES.map(name => {
              const meta = FILE_META[name];
              const empty = !(files[name] ?? "").trim();
              return (
                <li key={name}>
                  <button
                    onClick={() => { setSelectedFile(name); setEditing(false); }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selectedFile === name
                        ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                        {meta.label}
                      </span>
                      {empty && (
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-700">empty</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{meta.desc}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Add entry form */}
            <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Add to today
              </p>
              <textarea
                rows={2}
                placeholder="What happened today…"
                value={newEntry}
                onChange={e => setNewEntry(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) appendEntry(); }}
                className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
              <button
                onClick={appendEntry}
                disabled={addingEntry || !newEntry.trim()}
                className="mt-2 w-full rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addingEntry ? "Saving…" : "Append ⌘↵"}
              </button>
            </div>

            {/* Log list */}
            <ul className="space-y-1">
              {logs.length === 0 ? (
                <li className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
                  No daily logs yet
                </li>
              ) : logs.map(log => (
                <li key={log.date}>
                  <button
                    onClick={() => setSelectedLog(log.date)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                      selectedLog === log.date
                        ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {formatDate(log.date)}
                      </span>
                      {isToday(log.date) && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          today
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      {parseBullets(log.content).length} entries
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {tab === "files" ? (
          <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${FILE_META[selectedFile]?.color}`}>
                  {FILE_META[selectedFile]?.label}
                </span>
                <span className="font-mono text-xs text-zinc-400">{selectedFile}</span>
              </div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFile}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEdit}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {editing ? (
                <textarea
                  autoFocus
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="h-full w-full resize-none bg-transparent font-mono text-sm text-zinc-700 focus:outline-none dark:text-zinc-300"
                  spellCheck={false}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {(files[selectedFile] ?? "").trim() || (
                    <span className="text-zinc-300 dark:text-zinc-700">Empty — click Edit to add content</span>
                  )}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {selectedLog ? (
              <>
                <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatDate(selectedLog)}
                    </h2>
                    {isToday(selectedLog) && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        today
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {parseBullets(selectedLogContent).length} entries
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {parseBullets(selectedLogContent).length === 0 ? (
                    <p className="text-sm text-zinc-400">No entries</p>
                  ) : (
                    <ul className="space-y-3">
                      {parseBullets(selectedLogContent).map((entry, i) => {
                        const agentMatch = entry.match(/^\[([^\]]+)\]\s+(.+)$/);
                        return (
                          <li key={i} className="flex gap-3">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                            <div className="min-w-0">
                              {agentMatch ? (
                                <>
                                  <span className="mr-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                    {agentMatch[1]}
                                  </span>
                                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{agentMatch[2]}</span>
                                </>
                              ) : (
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">{entry}</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-zinc-400">Select a day to view entries</p>
              </div>
            )}
          </div>
        )}

        {/* Agent usage hint */}
        {tab === "logs" && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              How agents write memories
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{`curl -s -X POST http://localhost:4000/api/memories \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Created PR #42 for login flow", "agentId": "main"}'`}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Docs view ----
interface DocEntry {
  id: string;
  title: string;
  content: string;
  type: "pr" | "deploy" | "note" | "bug" | "feature" | "other";
  agentId?: string;
  url?: string;
  tags?: string[];
  createdAt: string;
}

const DOC_TYPE_META: Record<DocEntry["type"], { label: string; color: string }> = {
  pr:      { label: "PR",       color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  deploy:  { label: "Deploy",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  note:    { label: "Note",     color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  bug:     { label: "Bug",      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  feature: { label: "Feature",  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  other:   { label: "Other",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};

function TypeBadge({ type }: { type: DocEntry["type"] }) {
  const meta = DOC_TYPE_META[type] ?? DOC_TYPE_META.other;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function DocsView() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DocEntry | null>(null);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/docs");
      setDocs(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function deleteDoc(id: string) {
    await fetch(`/api/docs?id=${id}`, { method: "DELETE" });
    setDocs(d => d.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  useEffect(() => { load(); }, []);

  const filtered = docs.filter(d => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      (d.agentId ?? "").toLowerCase().includes(q) ||
      (d.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex gap-5 h-full">
      {/* List */}
      <div className="flex w-80 shrink-0 flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-2.5 text-zinc-400"
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input
            type="text"
            placeholder="Search docs…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-400">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-400">
                {filter ? "No results" : "No docs yet"}
              </p>
              {!filter && (
                <p className="mt-1 text-xs text-zinc-400">
                  Agents can write docs by POSTing to{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                    /api/docs
                  </code>
                </p>
              )}
            </div>
          ) : (
            filtered.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelected(doc.id === selected?.id ? null : doc)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected?.id === doc.id
                    ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-800 line-clamp-1 dark:text-zinc-200">
                    {doc.title}
                  </p>
                  <TypeBadge type={doc.type} />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                  {doc.agentId && <span>{doc.agentId}</span>}
                  {doc.agentId && <span>·</span>}
                  <span>
                    {new Date(doc.createdAt).toLocaleDateString([], {
                      month: "short", day: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{doc.content}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  <TypeBadge type={selected.type} />
                  {selected.agentId && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {selected.agentId}
                    </span>
                  )}
                  {(selected.tags ?? []).map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {selected.title}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteDoc(selected.id)}
                className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="2,4 14,4" />
                  <path d="M5 4V2h6v2" />
                  <path d="M3 4l1 10h8l1-10" />
                </svg>
              </button>
            </div>

            {/* URL */}
            {selected.url && (
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" />
                  <polyline points="10,1 15,1 15,6" />
                  <line x1="7" y1="9" x2="15" y2="1" />
                </svg>
                {selected.url}
              </a>
            )}

            {/* Content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {selected.content}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-400">Select a doc to read it</p>
          </div>
        )}

        {/* Usage hint */}
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            How agents write docs
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{`curl -s -X POST http://localhost:4000/api/docs \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "PR #42 — add login flow",
    "content": "Created PR at github.com/…",
    "type": "pr",
    "url": "https://github.com/…/pull/42",
    "agentId": "main",
    "tags": ["auth", "frontend"]
  }'`}</pre>
          <p className="mt-2 text-xs text-zinc-400">
            Types: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">pr</code>{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">deploy</code>{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">note</code>{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">bug</code>{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">feature</code>{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">other</code>
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Main ----
export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [data, setData] = useState<DashboardData>({ agents: [], channels: [], cronJobs: [] });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    const pending = new Map<string, { resolve: (r: unknown) => void; reject: (e: unknown) => void }>();

    function send(method: string, params?: unknown): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).slice(2);
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ type: "req", id, method, params }));
      });
    }

    async function authenticate() {
      await send("connect", {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "openclaw-control-ui",
          version: "hubert-dashboard",
          platform: "web",
          mode: "webchat",
          instanceId: Math.random().toString(36).slice(2),
        },
        role: "operator",
        scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
        caps: ["tool-events"],
        auth: GATEWAY_TOKEN ? { token: GATEWAY_TOKEN } : undefined,
        userAgent: navigator.userAgent,
        locale: navigator.language,
      });
      setStatus("connected");
      fetchAll();
    }

    async function fetchAll() {
      try {
        const [agentsRes, configRes, cronRes] = await Promise.all([
          send("agents.list"),
          send("config.get"),
          send("cron.list"),
        ]);

        const agentsPayload = agentsRes as {
          agents?: { id: string; name?: string; identity?: { name?: string; emoji?: string; theme?: string } }[];
        };

        const config = configRes as {
          agents?: { list?: { id: string; model?: string }[] };
          channels?: Record<string, { enabled?: boolean }>;
        };

        const cronPayload = cronRes as {
          jobs?: {
            id: string;
            name: string;
            agentId?: string;
            enabled: boolean;
            schedule: CronJob["schedule"];
            state: CronJob["state"];
          }[];
        };

        // Build a model lookup from config.agents.list
        const modelById: Record<string, string> = {};
        for (const a of config?.agents?.list ?? []) {
          if (a.id && a.model) modelById[a.id] = a.model;
        }

        setData({
          agents: (agentsPayload?.agents ?? []).map(a => ({
            id: a.id,
            name: a.name,
            model: modelById[a.id],
            identity: a.identity,
          })),
          channels: Object.entries(config?.channels ?? {}).map(([name, ch]) => ({
            name,
            enabled: (ch as { enabled?: boolean }).enabled ?? false,
          })),
          cronJobs: (cronPayload?.jobs ?? []).map(j => ({
            id: j.id,
            name: j.name,
            agentId: j.agentId,
            enabled: j.enabled,
            schedule: j.schedule,
            state: j.state ?? {},
          })),
        });
      } catch {
        // ignore — connection may have dropped
      }
    }

    function connect() {
      setStatus("connecting");
      ws = new WebSocket(GATEWAY_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            id?: string;
            ok?: boolean;
            payload?: unknown;
            error?: { code?: string; message?: string };
            event?: string;
          };
          if (msg.type === "res" && msg.id && pending.has(msg.id)) {
            const h = pending.get(msg.id)!;
            pending.delete(msg.id);
            if (msg.ok) h.resolve(msg.payload);
            else h.reject(new Error(msg.error?.message ?? "request failed"));
          } else if (msg.type === "event" && msg.event === "connect.challenge") {
            authenticate().catch(() => ws.close());
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setStatus("disconnected");
        setTimeout(connect, 3000);
      };

      ws.onerror = () => setStatus("error");
    }

    connect();
    return () => { ws?.close(); };
  }, []);

  const pageTitle =
    view === "overview" ? "Overview"
    : view === "calendar" ? "Calendar"
    : view === "agents" ? "Agents"
    : view === "channels" ? "Channels"
    : view === "cron" ? "Cron Jobs"
    : view === "board" ? "Task Board"
    : view === "memory" ? "Memory"
    : "Docs";

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar view={view} setView={setView} status={status} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{pageTitle}</h1>
          <button
            onClick={() => {
              // re-fetch on demand by briefly closing and reconnecting
              wsRef.current?.close();
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Refresh
          </button>
        </header>

        {/* View */}
        <main className={`flex-1 p-6 ${view === "board" || view === "memory" ? "overflow-hidden" : "overflow-y-auto"}`}>
          {view === "overview" && <OverviewView data={data} status={status} />}
          {view === "calendar" && <CalendarView jobs={data.cronJobs} />}
          {view === "agents" && <AgentsView agents={data.agents} />}
          {view === "channels" && <ChannelsView channels={data.channels} />}
          {view === "cron" && <CronView jobs={data.cronJobs} />}
          {view === "board" && <div className="h-full"><BoardView agents={data.agents} /></div>}
          {view === "memory" && <div className="h-full"><MemoryView /></div>}
          {view === "docs" && <DocsView />}
        </main>
      </div>
    </div>
  );
}
