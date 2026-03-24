import { Link, router } from "@inertiajs/react"
import { ArrowLeft, RefreshCw, Repeat } from "lucide-react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { ActivityFeed } from "@/components/ActivityFeed"
import { AgentAvatar } from "@/components/agents/AgentAvatar"
import type { Task, TaskAgent } from "@/types/task"
import type { ActivityEntry } from "@/types/activity"

interface Props {
  task: Task
  activities: ActivityEntry[]
  assignedAgent: TaskAgent | null
  recurringDescription: string | null
  executionLogs: string | null
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  queue: { label: "Queue", className: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-700" },
  done: { label: "Done", className: "bg-green-100 text-green-700" },
}

export default function TaskShow({ task, activities, assignedAgent, recurringDescription, executionLogs }: Props) {
  const statusStyle = STATUS_LABELS[task.status] ?? { label: task.status, className: "bg-neutral-100 text-neutral-600" }

  return (
    <AuthenticatedLayout>
      <div className="p-6 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
          <ArrowLeft size={14} />
          All tasks
        </Link>

        {/* Task header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold text-neutral-900 leading-snug">{task.title}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusStyle.className}`}>
              {statusStyle.label}
            </span>
          </div>

          {task.description && (
            <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap">{task.description}</p>
          )}
        </div>

        {/* Metadata */}
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 mb-6">
          {assignedAgent && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-neutral-400 w-24 shrink-0">Agent</span>
              <div className="flex items-center gap-2">
                <AgentAvatar name={assignedAgent.name} avatarUrl={assignedAgent.avatarUrl} size="sm" />
                <span className="text-sm text-neutral-900">{assignedAgent.name}</span>
              </div>
            </div>
          )}

          {task.skill && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-neutral-400 w-24 shrink-0">Skill</span>
              <span className="text-sm font-mono text-neutral-700">{task.skill}</span>
            </div>
          )}

          {task.scheduledFor && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-neutral-400 w-24 shrink-0">Scheduled for</span>
              <span className="text-sm text-neutral-700">{new Date(task.scheduledFor).toLocaleString()}</span>
            </div>
          )}

          {task.completedAt && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-neutral-400 w-24 shrink-0">Completed</span>
              <span className="text-sm text-neutral-700">{new Date(task.completedAt).toLocaleString()}</span>
            </div>
          )}

          {recurringDescription && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-neutral-400 w-24 shrink-0">Recurring</span>
              <div className="flex items-center gap-1.5 text-sm text-neutral-700">
                <Repeat size={13} className="text-neutral-400" />
                {recurringDescription}
              </div>
            </div>
          )}
        </div>

        {/* Execution logs */}
        {executionLogs && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-neutral-700 mb-2">Execution Log</h2>
            <div className="rounded-xl border border-neutral-200 bg-neutral-950 overflow-hidden">
              <pre className="text-xs text-neutral-200 font-mono p-4 overflow-x-auto overflow-y-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                {executionLogs}
              </pre>
            </div>
          </div>
        )}

        {/* Activity timeline */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">Activity</h2>
          <ActivityFeed activities={activities} showTaskLink={false} />
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
