import { useEffect, useMemo, useState } from "react"
import { usePage } from "@inertiajs/react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { Label } from "@/components/ui/label"
import type { DailyMemoryGroup } from "@/types/dailyMemory"

interface Props {
  groupedEntries: DailyMemoryGroup[]
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "numeric",
})

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function formatTime(value: string) {
  return timeFormatter.format(new Date(value))
}

export default function DailyMemoryIndex({ groupedEntries }: Props) {
  const { props } = usePage<{ flash?: { notice?: string; alert?: string } }>()
  const notice = props.flash?.notice
  const alert = props.flash?.alert

  const flattenedEntries = useMemo(() => {
    return groupedEntries.flatMap((group) =>
      group.entries.map((entry) => ({
        ...entry,
        entryDate: group.entryDate,
      }))
    )
  }, [groupedEntries])

  const [query, setQuery] = useState("")
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return flattenedEntries

    return flattenedEntries.filter((entry) => {
      const haystack = [entry.summary, entry.details, entry.project]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [query, flattenedEntries])

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedEntryId(null)
      return
    }

    if (!selectedEntryId || !filteredEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(filteredEntries[0].id)
    }
  }, [filteredEntries, selectedEntryId])

  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null

  return (
    <AuthenticatedLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Daily Memory</h1>
          <p className="mt-1 text-sm text-neutral-500">
            These entries are created automatically after each discussion, so there’s nothing to submit by hand.
            Search or browse the list on the left to revisit what we covered.
          </p>
        </div>

        {(notice || alert) && (
          <div className="mb-4 space-y-2">
            {notice && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
                {notice}
              </div>
            )}
            {alert && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                {alert}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Daily journal</p>
                <span className="text-xs text-neutral-400">
                  {flattenedEntries.length} entr{flattenedEntries.length === 1 ? "y" : "ies"}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-neutral-500">
                <p>
                  Entries show the summary and context of what we discussed each day. You can filter
                  by keyword or project, then click any row to revive the full details.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="p-4 space-y-3">
                <Label htmlFor="memory-search">Search memory</Label>
                <input
                  id="memory-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find by project, keyword, or detail"
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {filteredEntries.length === 0 ? (
                <div className="p-4 text-sm text-neutral-500">
                  No entries match your search yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {filteredEntries.map((entry) => {
                    const isSelected = entry.id === selectedEntryId
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedEntryId(entry.id)}
                        className={`w-full text-left px-4 py-3 transition ${
                          isSelected
                            ? "border-l-4 border-neutral-900 bg-neutral-900/5"
                            : "border-l-4 border-transparent hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            {formatDate(entry.entryDate)}
                          </p>
                          <span className="text-xs text-neutral-400">{formatTime(entry.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-neutral-900">
                          {entry.project || "General"}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600 max-h-16 overflow-hidden text-ellipsis">
                          {entry.summary}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-6">
            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm min-h-[280px]">
              {!selectedEntry ? (
                <div className="text-sm text-neutral-500">
                  No entries yet — we’ll populate this feed after our next discussion.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-neutral-900">
                        {formatDate(selectedEntry.entryDate)}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        {selectedEntry.project || "General"}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-400">{formatTime(selectedEntry.createdAt)}</span>
                  </div>

                  <div className="space-y-3 text-sm text-neutral-800">
                    {selectedEntry.summary.split("\n").map((paragraph, index) => (
                      <p key={`summary-${index}`} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {selectedEntry.details && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Details</p>
                      <div className="space-y-2 text-sm text-neutral-600">
                        {selectedEntry.details.split("\n").map((paragraph, index) => (
                          <p key={`details-${index}`} className="leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          </section>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
