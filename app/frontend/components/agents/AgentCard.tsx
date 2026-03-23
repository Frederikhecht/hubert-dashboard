import { Link } from "@inertiajs/react"
import { AgentAvatar } from "./AgentAvatar"
import { AgentStatusBadge } from "./AgentStatusBadge"
import type { AgentSummary } from "@/types/agent"

interface AgentCardProps {
  agent: AgentSummary
}

export function AgentCard({ agent }: AgentCardProps) {
  const href = agent.dbId ? `/agents/${agent.dbId}` : "#"

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <AgentAvatar name={agent.name} avatarUrl={agent.avatarUrl} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{agent.emoji}</span>
            <span className="text-sm font-medium text-neutral-900 truncate">
              {agent.name}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500 truncate">{agent.role}</p>
          <div className="mt-2">
            <AgentStatusBadge status={agent.status} />
          </div>
        </div>
      </div>

      {!agent.dbId && (
        <p className="mt-2 text-xs text-amber-600">Not synced — click "Sync Agents"</p>
      )}
    </Link>
  )
}
