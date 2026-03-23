import { router, usePage } from "@inertiajs/react"
import { RefreshCw } from "lucide-react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { AgentCard } from "@/components/agents/AgentCard"
import { Button } from "@/components/ui/button"
import type { AgentSummary } from "@/types/agent"

interface Props {
  agents: AgentSummary[]
  openclawAvailable: boolean
}

export default function AgentsIndex({ agents, openclawAvailable }: Props) {
  const { props } = usePage<{ flash?: { notice?: string } }>()
  const notice = (props as any).flash?.notice

  function handleSync() {
    router.post("/agents/sync")
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Agents</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {openclawAvailable
                ? `${agents.length} agent${agents.length !== 1 ? "s" : ""} detected from OpenClaw`
                : "OpenClaw not available on this machine"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={!openclawAvailable}
            className="gap-2"
          >
            <RefreshCw size={14} />
            Sync Agents
          </Button>
        </div>

        {/* Flash notice */}
        {notice && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            {notice}
          </div>
        )}

        {/* Agent grid */}
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 p-12 text-center">
            <p className="text-sm text-neutral-500">
              {openclawAvailable
                ? "No agents found in OpenClaw config."
                : "OpenClaw is not running on this machine. Agents will appear after syncing on the OpenClaw machine."}
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
