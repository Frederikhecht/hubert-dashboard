export interface ActivityEntry {
  id: string
  action: "assigned" | "status_changed"
  details: string
  timestamp: string
  taskId: string
  taskTitle: string
  agentId: string | null
  agentName: string | null
  agentAvatarUrl: string | null
}
