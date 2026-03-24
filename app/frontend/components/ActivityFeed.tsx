import { Link, router } from "@inertiajs/react"
import { UserCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ActivityEntry } from "@/types/activity"
import type { TaskAgent } from "@/types/task"

interface Props {
  activities: ActivityEntry[]
  showAgentFilter?: boolean
  showTaskLink?: boolean
  agents?: TaskAgent[]
  selectedAgentId?: string | null
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ActionBadge({ action }: { action: string }) {
  const isAssigned = action === "assigned"
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
      isAssigned ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
    }`}>
      {isAssigned ? "assigned" : "status"}
    </span>
  )
}

function AgentBubble({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name ?? ""} className="w-7 h-7 rounded-full object-cover shrink-0" />
  }
  const initials = (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-neutral-600">{initials}</span>
    </div>
  )
}

const NONE = "__none__"

export function ActivityFeed({ activities, showAgentFilter, showTaskLink, agents, selectedAgentId }: Props) {
  function handleAgentFilter(value: string) {
    const agentId = value === NONE ? undefined : value
    router.get("/activity", agentId ? { agent_id: agentId } : {}, { preserveState: true })
  }

  return (
    <div>
      {showAgentFilter && agents && (
        <div className="mb-4">
          <Select value={selectedAgentId ?? NONE} onValueChange={handleAgentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>All agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center">
          <p className="text-sm text-neutral-400">No activity yet.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {activities.map((entry, i) => (
            <div key={entry.id} className="flex gap-3 py-3 border-b border-neutral-100 last:border-0">
              <div className="mt-0.5">
                {entry.agentName ? (
                  <AgentBubble name={entry.agentName} avatarUrl={entry.agentAvatarUrl} />
                ) : (
                  <div className="w-7 h-7 flex items-center justify-center">
                    <UserCircle size={20} className="text-neutral-300" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.agentName && (
                    <span className="text-sm font-medium text-neutral-900">{entry.agentName}</span>
                  )}
                  <ActionBadge action={entry.action} />
                  <span className="text-xs text-neutral-400">{timeAgo(entry.timestamp)}</span>
                </div>
                <p className="text-sm text-neutral-600 mt-0.5">{entry.details}</p>
                {showTaskLink && (
                  <Link href={`/tasks/${entry.taskId}`} className="text-xs text-neutral-400 hover:text-neutral-700 mt-0.5 inline-block">
                    {entry.taskTitle}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
