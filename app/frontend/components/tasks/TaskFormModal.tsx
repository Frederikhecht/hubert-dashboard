import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TaskTemplate, TaskAgent, TaskSkill, TaskFormData } from "@/types/task"

interface RecurringData {
  frequencyType: string
  interval: number
  timesOfDay: string
  daysOfWeek: string
  dayOfWeek: number
  dayOfMonth: number
  monthOfYear: number
}

interface Props {
  open: boolean
  onClose: () => void
  agents: TaskAgent[]
  skills: TaskSkill[]
  templates: TaskTemplate[]
  initialTemplateId?: string | null
}

const NONE = "__none__"

const FREQUENCY_TYPES = [
  { value: "every_n_hours", label: "Every N hours" },
  { value: "daily", label: "Daily" },
  { value: "specific_days", label: "Specific days" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function TaskFormModal({ open, onClose, agents, skills, templates, initialTemplateId }: Props) {
  const [form, setForm] = useState<TaskFormData>({
    title: "",
    description: "",
    skill: null,
    agentId: null,
    status: "queue",
    scheduledFor: null,
    taskTemplateId: null,
  })
  const [makeRecurring, setMakeRecurring] = useState(false)
  const [recurring, setRecurring] = useState<RecurringData>({
    frequencyType: "daily",
    interval: 1,
    timesOfDay: "09:00",
    daysOfWeek: "",
    dayOfWeek: 1,
    dayOfMonth: 1,
    monthOfYear: 1,
  })

  useEffect(() => {
    if (!open) return
    if (initialTemplateId) {
      const tpl = templates.find((t) => t.id === initialTemplateId)
      if (tpl) applyTemplate(tpl)
    } else {
      resetForm()
    }
  }, [open, initialTemplateId])

  function resetForm() {
    setForm({ title: "", description: "", skill: null, agentId: null, status: "queue", scheduledFor: null, taskTemplateId: null })
    setMakeRecurring(false)
  }

  function applyTemplate(tpl: TaskTemplate) {
    setForm((f) => ({ ...f, title: tpl.title, description: tpl.description, skill: tpl.skill, agentId: tpl.agentId, taskTemplateId: tpl.id }))
  }

  function handleTemplateChange(id: string) {
    if (id === NONE) { setForm((f) => ({ ...f, taskTemplateId: null })); return }
    const tpl = templates.find((t) => t.id === id)
    if (tpl) applyTemplate(tpl)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, any> = {
      task: {
        title: form.title,
        description: form.description,
        skill: form.skill || "",
        agent_id: form.agentId || "",
        status: form.status,
        scheduled_for: form.scheduledFor || "",
        task_template_id: form.taskTemplateId || "",
        make_recurring: makeRecurring,
      },
    }

    if (makeRecurring) {
      payload.task.recurring_schedule = {
        frequency_type: recurring.frequencyType,
        interval: recurring.interval,
        times_of_day: recurring.timesOfDay.split(",").map((t) => t.trim()).filter(Boolean),
        days_of_week: recurring.daysOfWeek.split(",").map((d) => parseInt(d.trim())).filter((n) => !isNaN(n)),
        day_of_week: recurring.dayOfWeek,
        day_of_month: recurring.dayOfMonth,
        month_of_year: recurring.monthOfYear,
      }
    }

    router.post("/tasks", payload, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={form.taskTemplateId ?? NONE} onValueChange={handleTemplateChange}>
                <SelectTrigger><SelectValue placeholder="Start from scratch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Start from scratch</SelectItem>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Instructions</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Additional context for the agent..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Agent</Label>
              <Select value={form.agentId ?? NONE} onValueChange={(v) => setForm((f) => ({ ...f, agentId: v === NONE ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Skill</Label>
              <Select value={form.skill ?? NONE} onValueChange={(v) => setForm((f) => ({ ...f, skill: v === NONE ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="No skill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No skill</SelectItem>
                  {skills.map((s) => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Timing</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm((f) => ({ ...f, status: "queue", scheduledFor: null }))}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${form.status === "queue" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}>
                Queue now
              </button>
              <button type="button" onClick={() => setForm((f) => ({ ...f, status: "scheduled" }))}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${form.status === "scheduled" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}>
                Schedule
              </button>
            </div>
          </div>

          {form.status === "scheduled" && (
            <div className="space-y-1.5">
              <Label htmlFor="scheduledFor">Schedule for</Label>
              <Input id="scheduledFor" type="datetime-local" value={form.scheduledFor ?? ""} onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))} />
            </div>
          )}

          {/* Recurring toggle */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-neutral-900">Make recurring</p>
              <p className="text-xs text-neutral-500">Auto-create the next task after completion</p>
            </div>
            <button
              type="button"
              onClick={() => setMakeRecurring((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${makeRecurring ? "bg-neutral-900" : "bg-neutral-200"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${makeRecurring ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>

          {makeRecurring && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={recurring.frequencyType} onValueChange={(v) => setRecurring((r) => ({ ...r, frequencyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_TYPES.map((ft) => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {recurring.frequencyType === "every_n_hours" && (
                <div className="space-y-1.5">
                  <Label>Every N hours</Label>
                  <Input type="number" min={1} max={24} value={recurring.interval} onChange={(e) => setRecurring((r) => ({ ...r, interval: parseInt(e.target.value) || 1 }))} />
                </div>
              )}

              {recurring.frequencyType !== "every_n_hours" && (
                <div className="space-y-1.5">
                  <Label>Times of day (HH:MM, comma-separated)</Label>
                  <Input value={recurring.timesOfDay} onChange={(e) => setRecurring((r) => ({ ...r, timesOfDay: e.target.value }))} placeholder="09:00, 17:00" />
                </div>
              )}

              {recurring.frequencyType === "specific_days" && (
                <div className="space-y-1.5">
                  <Label>Days of week</Label>
                  <div className="flex gap-1">
                    {DAY_NAMES.map((name, i) => {
                      const selected = recurring.daysOfWeek.split(",").map((d) => parseInt(d.trim())).includes(i)
                      return (
                        <button key={i} type="button"
                          onClick={() => {
                            const days = recurring.daysOfWeek.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d))
                            const next = selected ? days.filter((d) => d !== i) : [...days, i].sort()
                            setRecurring((r) => ({ ...r, daysOfWeek: next.join(",") }))
                          }}
                          className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${selected ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {recurring.frequencyType === "weekly" && (
                <div className="space-y-1.5">
                  <Label>Day of week</Label>
                  <Select value={String(recurring.dayOfWeek)} onValueChange={(v) => setRecurring((r) => ({ ...r, dayOfWeek: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((name, i) => <SelectItem key={i} value={String(i)}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(recurring.frequencyType === "monthly" || recurring.frequencyType === "yearly") && (
                <div className="space-y-1.5">
                  <Label>Day of month</Label>
                  <Input type="number" min={1} max={31} value={recurring.dayOfMonth} onChange={(e) => setRecurring((r) => ({ ...r, dayOfMonth: parseInt(e.target.value) || 1 }))} />
                </div>
              )}

              {recurring.frequencyType === "yearly" && (
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Input type="number" min={1} max={12} value={recurring.monthOfYear} onChange={(e) => setRecurring((r) => ({ ...r, monthOfYear: parseInt(e.target.value) || 1 }))} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim()}>Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
