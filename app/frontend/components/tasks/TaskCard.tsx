import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { router, Link } from "@inertiajs/react"
import { MoreHorizontal, Archive, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { Task } from "@/types/task"

interface Props {
  task: Task
  overlay?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  queue: "bg-amber-100 text-amber-700",
  in_progress: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
}

export function TaskCard({ task, overlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function handleArchive() {
    router.patch(`/tasks/${task.id}/archive`)
  }

  function handleDelete() {
    if (confirm("Delete this task?")) {
      router.delete(`/tasks/${task.id}`)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-neutral-200 bg-white p-3 shadow-xs transition-shadow hover:shadow-sm ${
        overlay ? "shadow-lg ring-2 ring-neutral-900/10" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {/* drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="4" cy="3" r="1" />
            <circle cx="8" cy="3" r="1" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="8" cy="6" r="1" />
            <circle cx="4" cy="9" r="1" />
            <circle cx="8" cy="9" r="1" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-neutral-900 leading-snug hover:underline">
            {task.title}
          </Link>

          {task.description && (
            <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{task.description}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {task.skill && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono bg-neutral-100 text-neutral-600">
                {task.skill}
              </span>
            )}
            {task.agentName && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-neutral-100 text-neutral-600">
                {task.agentName}
              </span>
            )}
            {task.scheduledFor && (
              <span className="text-xs text-neutral-400">
                {new Date(task.scheduledFor).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleArchive}>
              <Archive size={14} className="mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
