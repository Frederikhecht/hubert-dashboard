// Agent as returned by AgentsController#index (list view)
export interface AgentSummary {
  id: string           // openclaw_agent_id (e.g. "bernard")
  dbId: string | null  // DB record id, null if not yet synced
  name: string
  emoji: string
  role: string
  status: "active" | "idle"
  avatarUrl: string | null
}

// Agent as returned by AgentsController#show (detail view)
export interface AgentDetail {
  id: string
  openclawAgentId: string
  name: string
  role: string
  active: boolean
  avatarUrl: string | null
  emoji: string | null
  status: "active" | "idle"
  model: string | null
  lastActiveAt: string | null
}
