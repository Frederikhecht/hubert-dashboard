export interface DailyMemoryEntry {
  id: string
  entryDate: string
  project?: string | null
  summary: string
  details?: string | null
  createdAt: string
}

export interface DailyMemoryGroup {
  entryDate: string
  entryCount: number
  entries: DailyMemoryEntry[]
}
