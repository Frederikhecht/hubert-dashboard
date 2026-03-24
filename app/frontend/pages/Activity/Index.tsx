import { usePage } from "@inertiajs/react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { ActivityFeed } from "@/components/ActivityFeed"
import type { ActivityEntry } from "@/types/activity"
import type { TaskAgent } from "@/types/task"

interface Props {
  activities: ActivityEntry[]
  agents: TaskAgent[]
  selectedAgentId: string | null
}

export default function ActivityIndex({ activities, agents, selectedAgentId }: Props) {
  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Activity</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {activities.length} event{activities.length !== 1 ? "s" : ""} across all tasks
            </p>
          </div>
        </div>

        <ActivityFeed
          activities={activities}
          agents={agents}
          showAgentFilter
          showTaskLink
          selectedAgentId={selectedAgentId}
        />
      </div>
    </AuthenticatedLayout>
  )
}
