import { useRef } from "react"
import { router, Link } from "@inertiajs/react"
import { ArrowLeft, Upload } from "lucide-react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { AgentAvatar } from "@/components/agents/AgentAvatar"
import { AgentStatusBadge } from "@/components/agents/AgentStatusBadge"
import { ActivityFeed } from "@/components/ActivityFeed"
import { Button } from "@/components/ui/button"
import type { AgentDetail } from "@/types/agent"
import type { ActivityEntry } from "@/types/activity"

interface Props {
  agent: AgentDetail
  activities: ActivityEntry[]
  openclawAvailable: boolean
}

export default function AgentsShow({ agent, activities, openclawAvailable }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("avatar", file)
    router.patch(`/agents/${agent.id}`, formData as any)
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-2xl">
        <Link href="/agents" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft size={14} />
          All agents
        </Link>

        {/* Agent header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="relative group">
            <AgentAvatar name={agent.name} avatarUrl={agent.avatarUrl} size="lg" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              title="Upload avatar"
            >
              <Upload size={16} className="text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              {agent.emoji && <span className="text-xl">{agent.emoji}</span>}
              <h1 className="text-xl font-semibold text-neutral-900">{agent.name}</h1>
            </div>
            <p className="text-sm text-neutral-500 mt-0.5">{agent.role}</p>
            <div className="flex items-center gap-3 mt-2">
              <AgentStatusBadge status={agent.status} />
              {agent.model && <span className="text-xs text-neutral-400">{agent.model}</span>}
            </div>
            {agent.lastActiveAt && (
              <p className="text-xs text-neutral-400 mt-1">
                Last active {new Date(agent.lastActiveAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">Recent Activity</h2>
          <ActivityFeed activities={activities} showTaskLink />
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
