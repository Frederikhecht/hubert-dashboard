import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { TaskCard } from "./TaskCard"
import type { Task } from "@/types/task"

interface Props {
  id: string
  title: string
  tasks: Task[]
  onAddTask?: () => void
  accentClass?: string
}

export function TaskColumn({ id, title, tasks, onAddTask, accentClass = "bg-neutral-400" }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accentClass}`} />
          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">{title}</span>
          <span className="text-xs text-neutral-400">{tasks.length}</span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Add task"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 min-h-20 rounded-xl p-1 transition-colors ${
            isOver ? "bg-neutral-100" : ""
          }`}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
