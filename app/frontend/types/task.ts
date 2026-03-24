export type TaskStatus = "scheduled" | "queue" | "in_progress" | "done"

export interface Task {
  id: string
  title: string
  description: string
  skill: string | null
  status: TaskStatus
  agentId: string | null
  agentName: string | null
  agentAvatarUrl: string | null
  templateId: string | null
  scheduledFor: string | null
  completedAt: string | null
  position: number
}

export interface TaskTemplate {
  id: string
  title: string
  description: string
  skill: string | null
  agentId: string | null
}

export interface TaskAgent {
  id: string
  name: string
  avatarUrl: string | null
}

export interface TaskSkill {
  id: string
  slug: string
  name: string
}

export interface TaskFormData {
  title: string
  description: string
  skill: string | null
  agentId: string | null
  status: "queue" | "scheduled"
  scheduledFor: string | null
  taskTemplateId: string | null
}
