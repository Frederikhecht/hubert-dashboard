import { useState } from "react"
import { router, usePage } from "@inertiajs/react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { Plus, LayoutGrid, Users } from "lucide-react"
import { AuthenticatedLayout } from "@/components/shell/AuthenticatedLayout"
import { Button } from "@/components/ui/button"
import { TaskColumn } from "@/components/tasks/TaskColumn"
import { TaskCard } from "@/components/tasks/TaskCard"
import { TaskFormModal } from "@/components/tasks/TaskFormModal"
import type { Task, TaskAgent, TaskTemplate, TaskSkill } from "@/types/task"

interface Props {
  tasks: Task[]
  agents: TaskAgent[]
  templates: TaskTemplate[]
  skills: TaskSkill[]
}

type BoardView = "board" | "agents"

const STATUS_COLUMNS = [
  { id: "scheduled", title: "Scheduled", accent: "bg-blue-400" },
  { id: "queue", title: "Queue", accent: "bg-amber-400" },
  { id: "in_progress", title: "In Progress", accent: "bg-purple-400" },
  { id: "done", title: "Done", accent: "bg-green-400" },
] as const

export default function TasksIndex({ tasks: initialTasks, agents, templates, skills }: Props) {
  const { props } = usePage<any>()
  const notice = props.flash?.notice
  const alert = props.flash?.alert

  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [view, setView] = useState<BoardView>("board")
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showModal, setShowModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getTasksForStatus(status: string) {
    return tasks.filter((t) => t.status === status)
  }

  function getTasksForAgent(agentId: string | null) {
    return tasks.filter((t) => t.agentId === agentId && t.status !== "done")
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    // Determine the target column (over could be a column id or a task id)
    let targetStatus = activeTask.status
    const overTask = tasks.find((t) => t.id === over.id)

    if (overTask) {
      targetStatus = overTask.status
    } else if (STATUS_COLUMNS.find((c) => c.id === over.id)) {
      targetStatus = over.id as string
    }

    const sameTasks = tasks.filter((t) => t.status === targetStatus)
    let newPosition: number

    if (overTask && overTask.status === targetStatus) {
      newPosition = overTask.position
    } else {
      newPosition = sameTasks.length
    }

    // Optimistic update
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === activeTask.id ? { ...t, status: targetStatus as Task["status"], position: newPosition } : t
      )
      return updated
    })

    router.patch(
      `/tasks/${activeTask.id}/reorder`,
      { status: targetStatus, position: newPosition },
      {
        preserveScroll: true,
        onError: () => setTasks(initialTasks),
      }
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Tasks</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-neutral-200 p-0.5">
              <button
                onClick={() => setView("board")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  view === "board"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <LayoutGrid size={13} />
                Board
              </button>
              <button
                onClick={() => setView("agents")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  view === "agents"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <Users size={13} />
                Agents
              </button>
            </div>

            <Button size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
              <Plus size={14} />
              New Task
            </Button>
          </div>
        </div>

        {/* Flash messages */}
        {(notice || alert) && (
          <div className="px-6 pt-3">
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

        {/* Board */}
        <div className="flex-1 overflow-x-auto px-6 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {view === "board" ? (
              <div className="grid grid-cols-4 gap-4 min-w-[700px]">
                {STATUS_COLUMNS.map((col) => (
                  <TaskColumn
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    tasks={getTasksForStatus(col.id)}
                    accentClass={col.accent}
                    onAddTask={col.id === "queue" ? () => setShowModal(true) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 min-w-max">
                {/* Unassigned column */}
                <div className="w-64 shrink-0">
                  <TaskColumn
                    id="unassigned"
                    title="Unassigned"
                    tasks={getTasksForAgent(null)}
                    accentClass="bg-neutral-400"
                    onAddTask={() => setShowModal(true)}
                  />
                </div>
                {agents.map((agent) => (
                  <div key={agent.id} className="w-64 shrink-0">
                    <TaskColumn
                      id={agent.id}
                      title={agent.name}
                      tasks={getTasksForAgent(agent.id)}
                      accentClass="bg-indigo-400"
                    />
                  </div>
                ))}
              </div>
            )}

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} overlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <TaskFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        agents={agents}
        skills={skills}
        templates={templates}
      />
    </AuthenticatedLayout>
  )
}
