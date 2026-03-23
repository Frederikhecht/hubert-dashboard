import { cn } from "@/lib/utils"

interface AgentStatusBadgeProps {
  status: "active" | "idle"
  className?: string
}

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const isActive = status === "active"

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-green-500" : "bg-neutral-300"
        )}
      />
      {isActive ? "Active" : "Idle"}
    </span>
  )
}
